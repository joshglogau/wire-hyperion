import type { FastifyInstance } from "fastify";
import type { HyperionBlock } from "../cli/repair-cli/interfaces.js";

const MAXIMUM_LAG_BLOCKS = 64;
const MAXIMUM_HEAD_AGE_MS = 60000;

export interface HistoryPosition {
    block_num: number;
    block_id: string;
    timestamp?: string;
}

/** Observations from RPC and durable indices, not reader/queue progress. */
export interface WireHistoryFacts {
    expected_chain_id: string;
    rpc_chain_id: string;
    rpc_head: HistoryPosition;
    rpc_lib: HistoryPosition;
    indexed_head: HistoryPosition | null;
    indexed_lib: HistoryPosition | null;
    canonical_indexed_lib_id: string | null;
    first_block: number;
    total_blocks: number;
    decode_errors: number;
    rpc_head_time_ms: number;
}

/** Assess bounded coverage honestly; a partial retained range is not genesis history. */
export function assessWireHistory(facts: WireHistoryFacts, nowMs = Date.now()) {
    const head = facts.indexed_head;
    const lag = head ? facts.rpc_head.block_num - head.block_num : null;
    const missing = head ? Math.max(0, head.block_num - facts.first_block + 1 - facts.total_blocks) : null;
    const countMatchesRange = Boolean(head && facts.first_block > 0 && facts.total_blocks === head.block_num - facts.first_block + 1);
    const verifiedLib = Boolean(facts.indexed_lib && facts.indexed_lib.block_id === facts.canonical_indexed_lib_id);
    const age = nowMs - facts.rpc_head_time_ms;
    const identity = facts.expected_chain_id.toLowerCase() === facts.rpc_chain_id.toLowerCase();
    const ready = Boolean(identity && head && verifiedLib && countMatchesRange && facts.decode_errors === 0 && lag !== null && lag >= 0 && lag <= MAXIMUM_LAG_BLOCKS && age >= -MAXIMUM_HEAD_AGE_MS && age <= MAXIMUM_HEAD_AGE_MS);
    return {
        experimental: true,
        status: ready ? "OK" : "DEGRADED",
        chain_id: facts.expected_chain_id,
        chain_identity_verified: identity,
        indexed_head: head,
        indexed_lib: facts.indexed_lib,
        indexed_lib_verified: verifiedLib,
        rpc_head: facts.rpc_head,
        rpc_lib: facts.rpc_lib,
        head_lag_blocks: lag,
        rpc_head_age_ms: age,
        decode_errors: facts.decode_errors,
        // Counts are a bounded observation, not a distinct-height/reorg audit.
        // Duplicate heights in multiple partitions can conceal an actual gap.
        coverage: { first_block: facts.first_block || null, last_block: head?.block_num ?? null, total_blocks: facts.total_blocks, missing_blocks_lower_bound: missing, count_matches_range: countMatchesRange, starts_at_genesis: facts.first_block === 1, contiguous_range_verified: false, complete_from_genesis: false },
        limits: { maximum_lag_blocks: MAXIMUM_LAG_BLOCKS, maximum_head_age_ms: MAXIMUM_HEAD_AGE_MS }
    };
}

/** Match exactly one schema version, including partitioned and nonpartitioned indices. */
export function activeHistoryIndices(namespace: string, kind: string, version: string): string[] {
    const name = `${namespace}-${kind}-${version}`;
    return [name, `${name}-*`];
}

/** Sample uncached durable coverage; absence and backend failures never become green. */
export async function sampleWireHistory(fastify: FastifyInstance) {
    const { chain: namespace, config, conn } = fastify.manager;
    const version = config.settings.index_version;
    const blockIndices = activeHistoryIndices(namespace, "block", version);
    const [info, blocks, actionErrors, deltaErrors] = await Promise.all([
        fastify.antelope.chain.get_info(),
        fastify.elastic.search<HyperionBlock, { first_block: { value: number | null } }>({ index: blockIndices, ignore_unavailable: true, size: 1, track_total_hits: true, sort: [{ block_num: "desc" }], aggs: { first_block: { min: { field: "block_num" } } } }),
        fastify.elastic.count({ index: activeHistoryIndices(namespace, "action", version), ignore_unavailable: true, query: { term: { ds_error: true } } }),
        fastify.elastic.count({ index: activeHistoryIndices(namespace, "delta", version), ignore_unavailable: true, query: { term: { ds_error: true } } })
    ]);
    if (blocks._shards.failed || actionErrors._shards.failed || deltaErrors._shards.failed) throw new Error("History health search has failed shards");
    const head = blocks.hits.hits[0]?._source ?? null;
    const lib = await fastify.elastic.search<HyperionBlock>({ index: blockIndices, ignore_unavailable: true, size: 1, query: { range: { block_num: { lte: info.last_irreversible_block_num.toNumber() } } }, sort: [{ block_num: "desc" }] });
    if (lib._shards.failed) throw new Error("Indexed LIB search has failed shards");
    const indexedLib = lib.hits.hits[0]?._source ?? null;
    const canonical = indexedLib ? await fastify.antelope.chain.get_block(indexedLib.block_num) : null;
    const total = blocks.hits.total;
    return assessWireHistory({
        expected_chain_id: conn.chains[namespace].chain_id,
        rpc_chain_id: info.chain_id.toString(),
        rpc_head: { block_num: info.head_block_num.toNumber(), block_id: info.head_block_id.toString() },
        rpc_lib: { block_num: info.last_irreversible_block_num.toNumber(), block_id: info.last_irreversible_block_id.toString() },
        indexed_head: head ? { block_num: head.block_num, block_id: head.block_id, timestamp: head["@timestamp"] } : null,
        indexed_lib: indexedLib ? { block_num: indexedLib.block_num, block_id: indexedLib.block_id } : null,
        canonical_indexed_lib_id: canonical?.id.toString() ?? null,
        first_block: blocks.aggregations?.first_block.value ?? 0,
        total_blocks: typeof total === "number" ? total : total?.value ?? 0,
        decode_errors: actionErrors.count + deltaErrors.count,
        rpc_head_time_ms: info.head_block_time.toMilliseconds()
    });
}
