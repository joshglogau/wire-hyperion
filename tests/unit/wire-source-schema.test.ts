import { describe, expect, it } from "bun:test";
import ship from "../fixtures/wire-ship-abi.json";

/** Guard the producer-defined differences that the Wire adapter must handle. */
describe("Wire producer protocol fixture", () => {
    const fields = (name: string) => ship.structs.find(value => value.name === name)?.fields;

    it("uses finality data rather than the old header-only request", () => {
        expect(fields("get_blocks_request_v1")).toContainEqual({ name: "fetch_finality_data", type: "bool" });
        expect(fields("get_blocks_request_v1")?.some(value => value.name === "fetch_block_header")).toBe(false);
        expect(fields("get_blocks_result_v1")).toContainEqual({ name: "finality_data", type: "bytes?" });
    });

    it("advertises chain identity and both status/result variants", () => {
        expect(fields("get_status_result_v1")).toContainEqual({ name: "chain_id", type: "checksum256" });
        expect(ship.variants.find(value => value.name === "result")?.types).toContain("get_blocks_result_v1");
    });

    it("has packed receipts and multiple producer signatures", () => {
        expect(fields("transaction_receipt_header")).toContainEqual({ name: "cpu_usage_us", type: "varuint32[]" });
        expect(fields("transaction_receipt")).toContainEqual({ name: "trx", type: "packed_transaction" });
        expect(fields("signed_block_header")).toContainEqual({ name: "producer_signatures", type: "signature[]" });
    });

    it("preserves raw primary and secondary KV keys", () => {
        expect(fields("contract_row_kv_v0")).toContainEqual({ name: "key", type: "bytes" });
        expect(fields("contract_row_kv_v0")).toContainEqual({ name: "table_id", type: "uint16" });
        expect(fields("contract_index_kv_v0")).toContainEqual({ name: "pri_key", type: "bytes" });
    });
});
