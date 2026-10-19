import { ABIDecoder, ABIEncoder, Bytes, type BytesType } from "./SdkCore.js";

const BITS_PER_BYTE = 8;
const MAX_VARUINT32 = 0xffffffff;

interface BitsetValue {
    size: number;
    data: BytesType;
}

/** FC packs bit count followed by ceil(bit count / 8) little-bit-order bytes. */
export class WireBitset {
    static abiName = "bitset";

    constructor(readonly size: number, readonly data: Bytes) {
        if (!Number.isInteger(size) || size < 0 || size > MAX_VARUINT32 || data.length !== Math.ceil(size / BITS_PER_BYTE)) {
            throw new Error("Invalid FC bitset size");
        }
        const usedBits = size % BITS_PER_BYTE;
        if (usedBits && (data.array[data.length - 1] & (0xff << usedBits))) {
            throw new Error("FC bitset has nonzero unused bits");
        }
    }

    /** Resolve an explicit size/raw-byte representation; do not infer bit count. */
    static from(value: WireBitset | BitsetValue): WireBitset {
        return value instanceof WireBitset ? value : new WireBitset(value.size, Bytes.from(value.data));
    }

    /** Read only the bytes advertised by the FC bit count. */
    static fromABI(decoder: ABIDecoder): WireBitset {
        const size = decoder.readVaruint32();
        return new WireBitset(size, Bytes.from(decoder.readArray(Math.ceil(size / BITS_PER_BYTE))));
    }

    /** Preserve the original bit count, including trailing zero bits. */
    toABI(encoder: ABIEncoder): void {
        encoder.writeVaruint32(this.size);
        encoder.writeArray(this.data.array);
    }

    /** Expose lossless transport data rather than a guessed governance meaning. */
    toJSON(): { size: number; data: string } {
        return { size: this.size, data: this.data.hexString };
    }

    /** Compare both bit count and all stored bytes. */
    equals(other: WireBitset | BitsetValue): boolean {
        const value = WireBitset.from(other);
        return this.size === value.size && this.data.equals(value.data);
    }
}
