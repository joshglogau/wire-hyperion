import { describe, expect, it } from "bun:test";
import { compareGlobalSequence } from "../../src/wire/WireSequence.js";
import { UInt64 } from "../../src/wire/SdkCore.js";

describe("exact Wire history ordering", () => {
    it("orders adjacent uint64 sequences above JavaScript's safe integer range", () => {
        const values = ["18446744073709551615", "9007199254740993", "9007199254740992"];
        expect(values.sort(compareGlobalSequence)).toEqual(["9007199254740992", "9007199254740993", "18446744073709551615"]);
        expect(compareGlobalSequence(UInt64.from(2), "2")).toBe(0);
    });

    it("rejects already-rounded numeric or out-of-range input", () => {
        expect(() => compareGlobalSequence(9007199254740992, "1")).toThrow("Unsafe numeric");
        expect(() => compareGlobalSequence("18446744073709551616", "1")).toThrow();
    });
});
