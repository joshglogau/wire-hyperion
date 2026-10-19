import { ABIDecoder, ABIEncoder, Bytes, KeyType, Signature, type SignatureType } from "@wireio/sdk-core";

const ED_SIGNATURE_BYTES = 96;

/** FC/SHIP signature carrier; deliberately not a wallet signer or verifier. */
export class WireSignature {
    static abiName = "signature";

    constructor(readonly value: Signature) {
        if (value.type === KeyType.ED && value.data.length !== ED_SIGNATURE_BYTES) {
            throw new Error("Wire FC ED signatures require the embedded public key and all 96 bytes");
        }
    }

    /** Parse canonical SDK representations without padding detached signatures. */
    static from(value: WireSignature | SignatureType): WireSignature {
        return value instanceof WireSignature ? value : new WireSignature(Signature.from(value));
    }

    /** Consume FC's curve variant, preserving the embedded ED public key. */
    static fromABI(decoder: ABIDecoder): WireSignature {
        const start = decoder.getPosition();
        const type = KeyType.from(decoder.readVaruint32());
        if (decoder.getPosition() - start !== 1) {
            throw new Error("Non-canonical signature curve discriminator");
        }
        if (type === KeyType.ED) {
            return new WireSignature(new Signature(type, new Bytes(decoder.readArray(ED_SIGNATURE_BYTES))));
        }
        decoder.setPosition(start);
        return new WireSignature(Signature.fromABI(decoder));
    }

    /** Emit FC bytes; SDK owns the EC/WA/BLS representations and EM conversion. */
    toABI(encoder: ABIEncoder): void {
        this.value.toABI(encoder);
    }

    /** Preserve the complete canonical signature text, including ED's public key. */
    toJSON(): string {
        return this.value.toString();
    }

    /** Compare the complete typed signature, not detached signature bytes only. */
    equals(other: WireSignature | SignatureType): boolean {
        return this.value.equals(WireSignature.from(other).value);
    }
}
