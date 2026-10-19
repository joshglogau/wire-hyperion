import { describe, expect, it } from "bun:test";
import { ABI, ABIDecoder, APIClient, BlockTimestamp, Serializer, UInt64 } from "../../src/wire/SdkCore.js";

/** Exercise the installed public SDK, not sibling checkout or private exports. */
describe("Wire SDK package boundary", () => {
    it("uses Wire's epoch and retains exact unsigned integers", () => {
        expect(BlockTimestamp.fromInteger(0).toString()).toBe("2025-01-01T00:00:00.000");
        expect(UInt64.from("18446744073709551615").toString()).toBe("18446744073709551615");
    });

    it("resolves Wire string table metadata and enums", () => {
        const abi = ABI.from({
            version: "sysio::abi/1.2",
            tables: [{ name: "long_table_name", type: "record", index_type: "i64", key_names: [], key_types: [], table_id: 123, secondary_indexes: [] }],
            enums: [{ name: "status", type: "uint8", values: [{ name: "active", value: 1 }] }]
        });
        const encoded = Serializer.encode({ object: abi, type: ABI });
        const decoded = ABI.fromABI(new ABIDecoder(encoded.array));
        expect(decoded.tables[0].table_id).toBe(123);
        expect(decoded.tables[0].name).toBe("long_table_name");
        expect(decoded.getEnum("status")?.values[0].name).toBe("active");
    });

    it("permits a read-only provider without a wallet or local listener", async () => {
        const client = new APIClient({ provider: {
            async call({ path }) {
                expect(path).toBe("/v1/chain/get_account");
                return { json: { account_name: "alice" }, status: 200, text: "", headers: {} };
            }
        } });
        const account = await client.call<{ account_name: string }>({ path: "/v1/chain/get_account", params: { account_name: "alice" } });
        expect(account.account_name).toBe("alice");
    });
});
