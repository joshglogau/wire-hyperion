import { ABIDecoder, Bytes, Serializer, type ABISerializable, type ABISerializableConstructor } from "@wireio/sdk-core";
import { WireBitset } from "./WireBitset.js";
import { WireSignature } from "./WireSignature.js";

type DecodeArguments = Parameters<typeof Serializer.decode>[0];
type EncodeArguments = Parameters<typeof Serializer.encode>[0];
const customTypes = [WireSignature, WireBitset];

/** SDK serialization with the explicit Wire FC transport extensions. */
export namespace WireSerializer {
    /** Encode using producer ABI and the FC signature/bitset representations. */
    export function encode(args: EncodeArguments): Bytes {
        return Serializer.encode({ ...args, customTypes: [...(args.customTypes ?? []), ...customTypes] });
    }

    export function decode<T extends ABISerializableConstructor>(args: DecodeArguments & { type: T }): InstanceType<T>;
    export function decode(args: DecodeArguments): ABISerializable;
    /** Reject trailing bytes in a complete payload instead of accepting a prefix. */
    export function decode(args: DecodeArguments): ABISerializable {
        const input = args.data;
        const owned = input !== undefined && !(input instanceof ABIDecoder);
        const decoder = input !== undefined && !(input instanceof ABIDecoder) ? new ABIDecoder(Bytes.from(input).array) : input;
        const result = Serializer.decode({ ...args, data: decoder, customTypes: [...(args.customTypes ?? []), ...customTypes] });
        if (owned && decoder instanceof ABIDecoder && decoder.canRead()) {
            throw new Error("Wire payload contains undecoded trailing bytes");
        }
        return result;
    }

    export const objectify = Serializer.objectify;
    export const stringify = Serializer.stringify;
}
