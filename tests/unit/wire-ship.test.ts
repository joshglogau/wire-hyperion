import { describe, expect, it, mock } from "bun:test";
import { ABI, Bytes, KeyType, Signature, Transaction } from "../../src/wire/SdkCore.js";
import { WireSerializer } from "../../src/wire/WireSerializer.js";
import { assertShipChainId, receiptCpuUsage, selectShipRevision, ShipRevision, unpackReceiptTransaction } from "../../src/wire/WireShip.js";
import ship from "../fixtures/wire-ship-abi.json";

// The upstream queue-definition module reads deployment configuration on import.
// These tests exercise reader logic without creating services or configuration.
mock.module("../../src/indexer/definitions/index-queues.js", () => ({ RabbitQueueDef: { durable: true }, index_queues: [] }));
const { default: StateReader } = await import("../../src/indexer/workers/state-reader.js");

const abi = ABI.from(ship);
const zeroChecksum = "00".repeat(32);

describe("current Wire SHIP", () => {
    it("negotiates advertised request revisions, not a node version string", () => {
        expect(selectShipRevision(abi)).toBe(ShipRevision.v1);
        expect(selectShipRevision(abi, ShipRevision.v0)).toBe(ShipRevision.v0);
        expect(() => selectShipRevision(abi, "v9")).toThrow();
        expect(() => selectShipRevision(ABI.from({ variants: [] }), ShipRevision.v1)).toThrow();
    });

    it("rejects unidentified or wrong-chain feeds", () => {
        expect(() => assertShipChainId(undefined, "expected")).toThrow();
        expect(() => assertShipChainId("different", "expected")).toThrow();
        expect(() => assertShipChainId("EXPECTED", "expected")).not.toThrow();
    });

    it("decodes a populated block, ED signatures and CPU arrays from the producer ABI", () => {
        const transaction = Transaction.from({ expiration: "2026-01-01T00:00:00", ref_block_num: 1, ref_block_prefix: 2, actions: [{ account: "sysio", name: "onblock", authorization: [], data: "" }] });
        const receipt = { cpu_usage_us: [11, 29], trx: { signatures: [new Signature(KeyType.ED, new Bytes(new Uint8Array(96))).toString()], compression: 0, packed_context_free_data: "", packed_trx: WireSerializer.encode({ object: transaction }).hexString } };
        const object = {
            timestamp: "2025-01-01T00:00:00.000", producer: "sysio", previous: zeroChecksum,
            transaction_mroot: zeroChecksum, finality_mroot: zeroChecksum,
            qc_claim: { block_num: 1, is_strong_qc: true }, new_finalizer_policy_diff: null,
            new_proposer_policy_diff: null, header_extensions: [], producer_signatures: receipt.trx.signatures,
            transactions: [receipt], qc: null, block_extensions: []
        };
        const bytes = WireSerializer.encode({ abi, type: "signed_block", object });
        const block = WireSerializer.objectify(WireSerializer.decode({ abi, type: "signed_block", data: bytes }));
        expect(block).toEqual(object);
        expect(receiptCpuUsage(block.transactions)).toBe(40);
        expect(unpackReceiptTransaction(block.transactions[0]).actions[0].name.toString()).toBe("onblock");
        expect(block.schedule_version).toBeUndefined();
        expect(block.transactions[0].status).toBeUndefined();
        expect(() => receiptCpuUsage([{ cpu_usage_us: [-1] }])).toThrow();
    });

    it("stages early ranges without dereferencing missing initial status", () => {
        const reader = Object.create(StateReader.prototype) as InstanceType<typeof StateReader>;
        reader.newRange({ first_block: 3, last_block: 8 });
        expect(Reflect.get(reader, "pendingRequest")).toEqual([3, 8]);
    });

    it("does not acknowledge a batch after a decode failure", async () => {
        let acknowledged = false;
        const reader = Object.assign(Object.create(StateReader.prototype), {
            async onMessage() { throw new Error("malformed payload"); },
            ackBlockRange() { acknowledged = true; }
        });
        await expect(Reflect.apply(Reflect.get(reader, "processIncomingBlocks"), reader, [[Buffer.from([0])]])).rejects.toThrow("malformed payload");
        expect(acknowledged).toBe(false);
    });
});
