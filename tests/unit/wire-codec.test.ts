import { describe, expect, it } from "bun:test";
import { ABI, ABIDecoder, ABIEncoder, Bytes, KeyType, Signature } from "@wireio/sdk-core";
import { WireSignature } from "../../src/wire/WireSignature.js";
import { WireBitset } from "../../src/wire/WireBitset.js";
import { WireSerializer } from "../../src/wire/WireSerializer.js";
import { WireCodec } from "../../src/wire/WireCodec.js";
import ship from "../fixtures/wire-ship-abi.json";

const ED_SIZE = 96;
const MARKER = 0x2a;
const abi = ABI.from(ship);

describe("Wire FC transport codecs", () => {
    it.each([[KeyType.K1, 65], [KeyType.R1, 65], [KeyType.EM, 65], [KeyType.ED, ED_SIZE], [KeyType.BLS, 192]] as const)("consumes and preserves %s signature bytes", (type, size) => {
        const bytes = new Uint8Array(size).fill(1);
        if (type === KeyType.EM) bytes[size - 1] = 27;
        const encoded = Uint8Array.from([KeyType.indexFor(type), ...bytes]);
        const decoder = new ABIDecoder(Uint8Array.from([...encoded, MARKER]));
        const signature = WireSignature.fromABI(decoder);
        expect(decoder.getPosition()).toBe(size + 1);
        expect(decoder.readByte()).toBe(MARKER);
        const encoder = new ABIEncoder();
        signature.toABI(encoder);
        expect(encoder.getBytes().hexString).toBe(Bytes.from(encoded).hexString);
        expect(WireSignature.from(signature.toJSON()).equals(signature)).toBe(true);
    });

    it("preserves WA variable-length auth data and client JSON", () => {
        const bytes = Uint8Array.from([2, ...new Uint8Array(65).fill(1), 2, 1, 2, 3, 3, 4, 5]);
        const decoder = new ABIDecoder(bytes);
        const value = WireSignature.fromABI(decoder);
        expect(decoder.canRead()).toBe(false);
        const encoder = new ABIEncoder();
        value.toABI(encoder);
        expect(encoder.getBytes().hexString).toBe(Bytes.from(bytes).hexString);
    });

    it("rejects detached or truncated ED signatures rather than inventing a public key", () => {
        expect(() => WireSignature.from(new Signature(KeyType.ED, new Bytes(new Uint8Array(64))))).toThrow("96 bytes");
        expect(() => WireSignature.fromABI(new ABIDecoder(Uint8Array.from([4, ...new Uint8Array(95)])))).toThrow();
        expect(() => WireSignature.fromABI(new ABIDecoder(Uint8Array.from([6])))).toThrow();
    });

    it("retains non-byte-aligned bit counts and rejects padding/truncation", () => {
        const value = WireBitset.fromABI(new ABIDecoder(Uint8Array.from([9, 0x55, 0x01])));
        expect(value.toJSON()).toEqual({ size: 9, data: "5501" });
        expect(WireBitset.from(value).equals({ size: 9, data: "5501" })).toBe(true);
        expect(() => WireBitset.fromABI(new ABIDecoder(Uint8Array.from([9, 0x55])))).toThrow();
        expect(() => WireBitset.from({ size: 9, data: "5581" })).toThrow("unused bits");
    });

    it("decodes the producer ABI through the SDK and rejects partial payloads", () => {
        const object = ["get_blocks_request_v1", { start_block_num: 1, end_block_num: 2, max_messages_in_flight: 1, have_positions: [], irreversible_only: false, fetch_block: true, fetch_traces: true, fetch_deltas: true, fetch_finality_data: true }];
        const encoded = WireSerializer.encode({ abi, type: "request", object });
        expect(WireSerializer.objectify(WireSerializer.decode({ abi, type: "request", data: encoded }))).toEqual(object);
        expect(() => WireSerializer.decode({ abi, type: "request", data: Uint8Array.from([...encoded.array, MARKER]) })).toThrow("trailing bytes");
    });

    it("has an isolated ABI context and no native deserializer fallback", () => {
        const codec = new WireCodec();
        codec.loadAbi("protocol", ship);
        expect(codec.hexToJson("protocol", "get_status_request_v0", "")).toEqual({});
        expect(codec.deleteContract("protocol")).toBe(true);
        expect(() => codec.hexToJson("protocol", "get_status_request_v0", "")).toThrow("ABI not loaded");
    });
});
