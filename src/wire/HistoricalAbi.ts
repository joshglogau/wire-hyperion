import { ABI } from "./SdkCore.js";
import type { HyperionAbi } from "../interfaces/hyperion-abi.js";
import { WireSerializer } from "./WireSerializer.js";

/** Resolve only a proven historical interval; never replace missing history with head. */
export function historicalAbiAtBlock(snapshot: HyperionAbi | null, block: number): ABI | null {
    if (!snapshot?.block || snapshot.block >= block || (snapshot.valid_until && snapshot.valid_until <= block)) return null;
    return snapshot.abi_hex ? WireSerializer.decode({ data: snapshot.abi_hex, type: ABI }) : ABI.from(snapshot.abi);
}
