import { describe, expect, it } from "bun:test";
import { assessWireHistory, activeHistoryIndices, type WireHistoryFacts } from "../../src/wire/WireHealth.js";
import { ElasticRoutes } from "../../src/indexer/helpers/elastic-routes.js";

const now = Date.parse("2026-01-01T00:00:00Z");
const facts: WireHistoryFacts = {
    expected_chain_id: "expected", rpc_chain_id: "expected",
    rpc_head: { block_num: 100, block_id: "head" }, rpc_lib: { block_num: 98, block_id: "lib" },
    indexed_head: { block_num: 100, block_id: "head" }, indexed_lib: { block_num: 98, block_id: "lib" },
    canonical_indexed_lib_id: "lib", first_block: 90, total_blocks: 11, decode_errors: 0, rpc_head_time_ms: now
};

describe("truthful Wire history health", () => {
    it("accepts a verified bounded range without claiming genesis coverage", () => {
        const health = assessWireHistory(facts, now);
        expect(health.status).toBe("OK");
        expect(health.experimental).toBe(true);
        expect(health.coverage.complete_from_genesis).toBe(false);
        expect(health.indexed_lib_verified).toBe(true);
    });

    it("rejects no data, missing blocks, decode failures, lag and stale RPC", () => {
        expect(assessWireHistory({ ...facts, indexed_head: null, indexed_lib: null, total_blocks: 0, first_block: 0 }, now).status).toBe("DEGRADED");
        expect(assessWireHistory({ ...facts, total_blocks: 10 }, now).coverage.missing_blocks_lower_bound).toBe(1);
        expect(assessWireHistory({ ...facts, total_blocks: 12 }, now).status).toBe("DEGRADED");
        expect(assessWireHistory({ ...facts, decode_errors: 1 }, now).status).toBe("DEGRADED");
        expect(assessWireHistory({ ...facts, rpc_head: { block_num: 1000, block_id: "later" } }, now).status).toBe("DEGRADED");
        expect(assessWireHistory(facts, now + 120000).status).toBe("DEGRADED");
    });

    it("rejects chain/fork mismatches and selects exactly one index schema", () => {
        expect(assessWireHistory({ ...facts, rpc_chain_id: "other" }, now).status).toBe("DEGRADED");
        expect(assessWireHistory({ ...facts, canonical_indexed_lib_id: "other-fork" }, now).status).toBe("DEGRADED");
        expect(activeHistoryIndices("namespace", "block", "wire-v1")).toEqual(["namespace-block-wire-v1", "namespace-block-wire-v1-*"]);
    });

    it("does not certify contiguous or genesis-complete history from document counts", () => {
        const health = assessWireHistory({ ...facts, first_block: 1, total_blocks: 100 }, now);
        expect(health.coverage.starts_at_genesis).toBe(true);
        expect(health.coverage.contiguous_range_verified).toBe(false);
        expect(health.coverage.complete_from_genesis).toBe(false);
    });
});

describe("interrupted Elasticsearch bulk handling", () => {
    it("requeues missing-index writes but acknowledges only a genuinely absent delete", () => {
        const acked: string[] = [];
        const nacked: string[] = [];
        const messages = new Map(["write", "absent", "bad-delete"].map(id => [id, { id }]));
        const channel = { ack(message: { id: string }) { acked.push(message.id); }, nack(message: { id: string }) { nacked.push(message.id); } };
        const response = { items: [
            { index: { _id: "write", status: 404, error: { type: "index_not_found_exception" } } },
            { delete: { _id: "absent", status: 404, result: "not_found" } },
            { delete: { _id: "bad-delete", status: 404, error: { type: "index_not_found_exception" } } }
        ] };
        Reflect.apply(ElasticRoutes.prototype.ackOrNack, {}, [response, messages, channel]);
        expect(acked).toEqual(["absent"]);
        expect(nacked).toEqual(["write", "bad-delete"]);
    });

    it("does not report a partially failed batch as indexed progress", () => {
        let progress = -1;
        let acknowledged = false;
        const route = { ackOrNack() {} };
        Reflect.apply(ElasticRoutes.prototype.onResponse, route, [{ errors: true }, new Map([["x", {}]]), (count: number) => { progress = count; }, [], { ackAll() { acknowledged = true; } }, "index", 100]);
        expect(progress).toBe(0);
        expect(acknowledged).toBe(false);
    });
});
