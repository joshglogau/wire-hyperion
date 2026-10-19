import { describe, expect, it } from "bun:test";
import { ABI } from "@wireio/sdk-core";
import { decodeWireKvRow, deltaDocumentId } from "../../src/wire/WireKv.js";
import type { HyperionDelta } from "../../src/interfaces/hyperion-delta.js";

describe("Wire KV history", () => {
    const abi = ABI.from({ structs: [{ name: "row", base: "", fields: [{ name: "amount", type: "uint64" }] }], tables: [{ name: "positions", table_id: 42, secondary_indexes: [], index_type: "i64", key_names: [], key_types: [], type: "row" }] });
    const row = { code: "sysio.liq", payer: "alice", table_id: 42, key: "00000000000000010000000000000002", value: "ffffffffffffffff" };
    const context = { "@timestamp": "2026-01-01T00:00:00.000", block_num: 7, block_id: "block-a", present: 1 };
    const delta = { ...decodeWireKvRow(row, true, abi), ...context } as HyperionDelta;

    it("keeps every composite key byte and exact value, without guessing scope", () => {
        expect(delta.primary_key).toBe(row.key);
        expect(delta.raw_key).toBe(row.key);
        expect(delta.scope).toBe("");
        expect(delta.table).toBe("positions");
        expect(delta.data.amount).toBe("18446744073709551615");
        expect(delta.value).toBe(row.value);
    });

    it("distinguishes composite keys with the same leading field, table namespaces and forks", () => {
        const second = { ...delta, raw_key: "00000000000000010000000000000003" };
        expect(deltaDocumentId(delta)).not.toBe(deltaDocumentId(second));
        expect(deltaDocumentId(delta)).not.toBe(deltaDocumentId({ ...delta, table_id: 43 }));
        expect(deltaDocumentId(delta)).not.toBe(deltaDocumentId({ ...delta, block_id: "block-b" }));
        expect(deltaDocumentId(delta)).toBe(deltaDocumentId({ ...delta }));
    });

    it("preserves deletions with empty values and distinct document identity", () => {
        const deletion = decodeWireKvRow({ ...row, value: "" }, false, abi);
        expect(deletion.primary_key).toBe(row.key);
        expect(deletion.ds_error).toBe(false);
        expect(deltaDocumentId({ ...delta, present: 0 })).not.toBe(deltaDocumentId(delta));
    });

    it("keeps undecodable rows raw and rejects malformed namespaces", () => {
        expect(decodeWireKvRow(row, true, null).ds_error).toBe(true);
        expect(decodeWireKvRow({ ...row, value: "01" }, true, abi).ds_error).toBe(true);
        expect(() => decodeWireKvRow({ ...row, key: "not hex" }, true, abi)).toThrow();
    });
});
