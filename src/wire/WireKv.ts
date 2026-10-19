import { createHash } from "node:crypto";
import { ABI } from "@wireio/sdk-core";
import { WireSerializer } from "./WireSerializer.js";
import type { HyperionDelta } from "../interfaces/hyperion-delta.js";

/** Producer SHIP transport row, not a generated business-contract table row. */
export interface WireKvRow {
    code: string;
    payer: string;
    table_id: number;
    key: string;
    value: string;
}

/** Preserve complete raw keys; unknown scope/composite components are not guessed. */
export function decodeWireKvRow(row: WireKvRow, present: boolean, abi: ABI | null) {
    if (!/^(?:[a-f\d]{2})*$/i.test(row.key) || !Number.isInteger(row.table_id) || row.table_id < 0 || row.table_id > 0xffff) {
        throw new Error("Invalid Wire KV key or table namespace");
    }
    const table = abi?.tables.find(candidate => candidate.table_id === row.table_id);
    const identity = { ...row, raw_key: row.key.toLowerCase(), primary_key: row.key.toLowerCase(), scope: "", table: table?.name ?? "" };
    if (!present) return { ...identity, ds_error: !table };
    if (!table || !abi) return { ...identity, ds_error: true };
    try {
        return { ...identity, data: WireSerializer.objectify(WireSerializer.decode({ type: table.type, data: row.value, abi })), ds_error: false };
    } catch (error) {
        return { ...identity, ds_error: true, decode_error: error instanceof Error ? error.message : String(error) };
    }
}

/** Fixed-size IDs distinguish full composite keys, forks, namespaces and deletions. */
export function deltaDocumentId(row: HyperionDelta): string {
    if (row.raw_key !== undefined) {
        return createHash("sha256").update(JSON.stringify([row.block_id, row.block_num, row.code, row.table_id, row.raw_key, Number(row.present)])).digest("hex");
    }
    return `${row.block_num}-${row.code}-${row.scope}-${row.table}-${row.primary_key}`;
}
