import type { HyperionConfig } from "../interfaces/hyperionConfig.js";
import type { HyperionConnections } from "../interfaces/hyperionConnections.js";

const CHAIN_ID_HEX = /^[a-f\d]{64}$/i;
const NAMESPACE_RADIX = 36;
const NAMESPACE_WIDTH = 50;
const MAX_MONGO_DATABASE_BYTES = 63;

/** Lossless lowercase chain identity that also fits MongoDB's database-name limit. */
export function wireNamespace(chainId: string): string {
    if (!CHAIN_ID_HEX.test(chainId)) throw new Error("Wire history requires an explicit 32-byte chain ID");
    return `w${BigInt(`0x${chainId}`).toString(NAMESPACE_RADIX).padStart(NAMESPACE_WIDTH, "0")}`;
}

/** Separate human connection labels from immutable storage/queue/cache identity. */
export function configureWireRuntime(config: HyperionConfig, connections: HyperionConnections): void {
    const selection = connections.chains[config.settings.chain];
    if (!selection) throw new Error("Selected Wire connection is not configured");
    const namespace = wireNamespace(selection.chain_id);
    const prefix = `${namespace}::`;
    if (connections.redis.keyPrefix && connections.redis.keyPrefix !== prefix) throw new Error("Redis keyPrefix must match the selected Wire chain namespace");
    if (Buffer.byteLength(`${connections.mongodb.database_prefix}_${namespace}`) > MAX_MONGO_DATABASE_BYTES) throw new Error("MongoDB database_prefix is too long for a chain-scoped database");
    config.settings.chain = namespace;
    connections.chains[namespace] = { ...selection, chain_id: selection.chain_id.toLowerCase() };
    connections.redis.keyPrefix = prefix;
}
