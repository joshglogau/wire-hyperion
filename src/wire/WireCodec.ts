import { ABI, type ABIDef, type BytesType, type ABISerializable } from "./SdkCore.js";
import { WireSerializer } from "./WireSerializer.js";

/** Per-worker ABI context backed only by the public Wire SDK serializer. */
export class WireCodec {
    private readonly contracts = new Map<string, ABI>();

    /** Register a producer-advertised protocol or contract ABI. */
    loadAbi(account: string, definition: ABIDef): boolean {
        this.contracts.set(account, ABI.from(definition));
        return true;
    }

    /** Decode producer binary ABI metadata, not an Antelope table definition. */
    loadAbiHex(account: string, data: string): boolean {
        this.contracts.set(account, WireSerializer.decode({ data, type: ABI }));
        return true;
    }

    /** Invalidate a contract when its block-valid ABI changes. */
    deleteContract(account: string): boolean {
        return this.contracts.delete(account);
    }

    /** Resolve the action type from the registered producer ABI. */
    getTypeForAction(account: string, action: string): string {
        return this.getAbi(account).getActionType(action) ?? "";
    }

    /** Wire table names are strings, not legacy 64-bit account names. */
    getTypeForTable(account: string, table: string): string {
        return this.getAbi(account).tables.find(value => value.name === table)?.type ?? "";
    }

    /** Decode a complete protocol or contract payload to lossless JSON values. */
    binToJson(account: string, type: string, data: BytesType): ReturnType<typeof WireSerializer.objectify> {
        return WireSerializer.objectify(WireSerializer.decode({ data, type, abi: this.getAbi(account) }));
    }

    /** Hex and binary enter the same decoder; neither has a native fallback. */
    hexToJson(account: string, type: string, data: string): ReturnType<typeof WireSerializer.objectify> {
        return this.binToJson(account, type, data);
    }

    /** Re-encode history data with the same ABI and transport primitives. */
    jsonToHex(account: string, type: string, object: ABISerializable): string {
        return WireSerializer.encode({ object, type, abi: this.getAbi(account) }).hexString;
    }

    private getAbi(account: string): ABI {
        const abi = this.contracts.get(account);
        if (!abi) throw new Error(`ABI not loaded for ${account}`);
        return abi;
    }
}
