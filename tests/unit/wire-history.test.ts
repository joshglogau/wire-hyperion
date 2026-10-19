import { describe, expect, it } from "bun:test";
import { ABI } from "../../src/wire/SdkCore.js";
import { historicalAbiAtBlock } from "../../src/wire/HistoricalAbi.js";
import { WireSerializer } from "../../src/wire/WireSerializer.js";
import type { HyperionAbi } from "../../src/interfaces/hyperion-abi.js";

/** Historical ABIs are evidence, not an opportunistic decode fallback. */
describe("Wire historical ABI intervals", () => {
    const abi = ABI.from({ version: "sysio::abi/1.2", structs: [{ name: "record", base: "", fields: [{ name: "value", type: "uint64" }] }], actions: [{ name: "record", type: "record", ricardian_contract: "" }] });
    const snapshot: HyperionAbi = { block: 10, valid_from: 10, valid_until: 20, abi: JSON.stringify(abi), abi_hex: WireSerializer.encode({ object: abi, type: ABI }).hexString };

    it("decodes only a proven interval with its original binary ABI", () => {
        const selected = historicalAbiAtBlock(snapshot, 11);
        expect(selected?.getActionType("record")).toBe("record");
        const value = WireSerializer.objectify(WireSerializer.decode({ abi: selected!, type: "record", data: "ffffffffffffffff" }));
        expect(value.value).toBe("18446744073709551615");
    });

    it("rejects missing, future, same-block and expired snapshots", () => {
        expect(historicalAbiAtBlock(null, 11)).toBeNull();
        expect(historicalAbiAtBlock(snapshot, 9)).toBeNull();
        expect(historicalAbiAtBlock(snapshot, 10)).toBeNull();
        expect(historicalAbiAtBlock(snapshot, 20)).toBeNull();
    });

    it("can replay older and newer intervals without a mutable head cache", () => {
        const newer = { ...snapshot, block: 20, valid_from: 20, valid_until: null };
        expect(historicalAbiAtBlock(newer, 21)).not.toBeNull();
        expect(historicalAbiAtBlock(newer, 11)).toBeNull();
        expect(historicalAbiAtBlock(snapshot, 11)).not.toBeNull();
    });
});
