import { UInt64 } from "./SdkCore.js";

/** Compare exact sequence values without converting uint64 history to float64. */
export function compareGlobalSequence(left: string | number | UInt64, right: string | number | UInt64): number {
    for (const value of [left, right]) {
        if (typeof value === "number" && !Number.isSafeInteger(value)) throw new RangeError("Unsafe numeric global sequence; supply its exact decimal string");
    }
    const a = UInt64.from(left);
    const b = UInt64.from(right);
    return a.equals(b) ? 0 : a.lt(b) ? -1 : 1;
}
