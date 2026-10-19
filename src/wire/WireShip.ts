import { ABI, PackedTransaction, type PackedTransactionType } from "./SdkCore.js";

/** Request versions are negotiated from the advertised ABI, not node semver. */
export enum ShipRevision {
    v0 = "v0",
    v1 = "v1"
}

/** Select only a producer-defined request layout understood by this adapter. */
export function selectShipRevision(abi: ABI, requested?: string): ShipRevision {
    const requests = abi.getVariant("request")?.types ?? [];
    const revision = requested ?? (requests.includes("get_blocks_request_v1") ? ShipRevision.v1 : ShipRevision.v0);
    if (revision !== ShipRevision.v0 && revision !== ShipRevision.v1) throw new Error("Unsupported SHIP request revision");
    if (!requests.includes(`get_blocks_request_${revision}`)) throw new Error("Requested SHIP revision is not advertised");
    if (revision === ShipRevision.v1 && !abi.getStruct("get_blocks_request_v1")?.fields.some(field => field.name === "fetch_finality_data")) {
        throw new Error("Unsupported SHIP v1 layout: Wire requires fetch_finality_data");
    }
    return revision;
}

/** Require a verifiable feed identity before accepting or requesting blocks. */
export function assertShipChainId(actual: string | undefined, expected: string): void {
    if (!actual || actual.toLowerCase() !== expected.toLowerCase()) throw new Error("SHIP chain identity is missing or mismatched");
}

/** SDK decompression is bounded; inspect the object receipt, not an old variant. */
export function unpackReceiptTransaction(receipt: { trx: PackedTransactionType }): ReturnType<PackedTransaction["getTransaction"]> {
    return PackedTransaction.from(receipt.trx).getTransaction();
}

/** Sum all producer-defined CPU components; removed network/status fields stay absent. */
export function receiptCpuUsage(receipts: { cpu_usage_us: number[] }[]): number {
    const total = receipts.reduce((sum, receipt) => sum + receipt.cpu_usage_us.reduce((subtotal, value) => {
        if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid Wire receipt CPU component");
        return subtotal + value;
    }, 0), 0);
    if (!Number.isSafeInteger(total)) throw new Error("Wire block CPU total exceeds exact integer range");
    return total;
}
