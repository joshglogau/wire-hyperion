/** SDK-backed replacement for the upstream native ABI diagnostic. Run after build. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WireCodec } from "../build/wire/WireCodec.js";

const abi = JSON.parse(readFileSync(new URL("./fixtures/wire-ship-abi.json", import.meta.url), "utf8"));
const codec = new WireCodec();
codec.loadAbi("protocol", abi);
const request = ["get_blocks_request_v1", {
    start_block_num: 1, end_block_num: 2, max_messages_in_flight: 1,
    have_positions: [], irreversible_only: false, fetch_block: true,
    fetch_traces: true, fetch_deltas: true, fetch_finality_data: true
}];
const encoded = codec.jsonToHex("protocol", "request", request);
assert.deepEqual(codec.hexToJson("protocol", "request", encoded), request);
assert.throws(() => codec.hexToJson("protocol", "request", encoded + "ff"), /trailing bytes/);
process.stdout.write(JSON.stringify({ status: "passed", decoder: "sdk-core", nativeProbe: "deprecated" }) + "\n");
