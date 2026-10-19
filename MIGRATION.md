# Wire history migration

## Status and attribution

**Experimental draft for testing and later Wire Network integration.** No live
ingestion, database-service matrix or production deployment is certified by this
branch. Version `4.1.1-wire.0` identifies changes based on Hyperion v4.1.0, not an
official upstream release. Package publication is disabled.

Upstream: [EOS Rio Hyperion](https://github.com/eosrio/hyperion-history-api),
[v4.1.0](https://github.com/eosrio/hyperion-history-api/releases/tag/v4.1.0),
commit `a11de79438a26434ea9024a89d877efa8272e22d`. The original project,
contributors, notices and history retain their attribution. Wire compatibility
work does not imply upstream endorsement. `license.md` is unchanged (SHA-256
`b1d9596672e2c4e4a36b353d45adf5313d029e67da1a8a66ad0f805a1a4f9bab`).
Upstream's package metadata says MIT but its tracked license is CC BY-NC-SA 4.0;
this fork points to that file instead of asserting broader rights. Rights holders
must resolve the inconsistency before production/commercial release. Dependencies
retain their own licenses; no ownership of their code is claimed.

## Intended architecture

Same-chain Wire history peer → private SHIP → existing Hyperion workers and
RabbitMQ → Elasticsearch history, MongoDB state support and Redis → read-only
Hyperion API → SDK Core / consumer application.

The MVP is account actions, transactions, account creation, historical ABIs and
honest coverage/lag. Live balances, permissions, LIQ accounting, operator lifecycle,
signing and financial readiness stay with Wire RPC and its SDKs. No Noco, outpost
SDK or cross-chain indexing dependency is introduced.

Reuse public `@wireio/sdk-core` types/RPC/serialization. Wire-specific SHIP codecs
must preserve exact bytes and distinguish FC signatures from detached wallet
signatures. Keep the upstream queue, backpressure, deduplication and recovery
machinery; historical decoding must never substitute today's ABI silently.

## Implementation ledger

Each numbered item is a targeted commit with its own tests and documentation.
This ledger records completed work rather than implying planned work has shipped.

| Step | Status | Change and reason |
|---|---|---|
| 1 | Complete | Preserve upstream attribution/license, mark draft version/private package, seed exact SDK/shared dependency pins, add contributor guidance and CI coverage for `next`. |
| 2 | Complete | Mechanically extract the producer SHIP ABI as a provenance-linked fixture; guard finality, receipt and KV schema differences before adapting decoders. |
| 3 | Complete | Replace retained WharfKit imports with public SDK Core 1.0.102 APIs, including RPC, ABI and exact Wire primitives; preserve existing service/worker structure. |
| 4 | Complete | Add SDK public-extension codecs for full 96-byte FC ED signatures and bitsets; use SDK EC/WA/BLS formats and reject truncated/trailing payloads. Replace native decode instances with isolated SDK ABI contexts, without changing SDK wallet/signing behavior. |
| 5 | Complete | Negotiate advertised Wire v0/v1 requests/status/results, stage ranges until verified status and re-negotiate on reconnect. Decode packed receipts/CPU arrays without invented legacy status/net/schedule fields. Reader decode failures no longer acknowledge lost payloads. |
| 6 | Conservative | Decode actions only from proven historical ABI intervals; remove head/previous-block guesses, preserve raw ABI/checksums and raw undecodable actions. Keep upstream inline/notification deduplication and exact sequence strings. Same-block ABI timeline reconstruction remains a promotion gate. |
| 7 | Complete | Preserve full raw KV key/value/table identity; hash full namespace/fork/deletion identity into bounded document IDs. Decode values only with proven historical ABIs, retain deletions and ignore secondary-index bookkeeping as duplicate business rows. No guessed scope/composite projection or generic current-state KV service. |
| 8 | Complete | Select the Wire parser/system contract, isolate queues/indices/cache/databases by lossless chain-derived namespace, reject mismatched RPC identity, retain bounded history and return explicit HTTP 410 for retired state/statistics/proxy capabilities. |
| 9 | Bounded | Replace legacy action enrichers, DSP console-event parser, state-route bodies and unsupported synchronizers with explicit deprecation stubs. Preserve account/multisig table handling and unproven backend consumers; broader table removal/startup feature rejection was not accepted by safety review and is deferred for explicit owner review. |
| 10 | Complete, bounded | Verify the public SDK CommonJS seam under Node 24, replace the manual native diagnostic with a passing SDK probe, then remove native ABI/WharfKit dependencies after an empty retained-import inventory. npm's lockfile is authoritative; the stale secondary Bun lockfile is removed. Optional backend removals remain deferred where consumers are unproven. |
| 11 | Offline verified | Add uncached, schema-scoped durable head/LIB/coverage/decode-error health with canonical LIB comparison. Preserve SDK health fields. Fix missing-index bulk acknowledgements/progress and normalize message IDs. Fork cleanup requires canonical RPC confirmation, includes ABI snapshots and retries failures; live concurrent replay remains an acceptance gate. |
| 12 | Planned | Record reproducible validation and operational/release gates. |

### Step 1 — baseline and contribution boundaries

The upstream author, credits, license file and commits are retained. The package
license field now points to the existing license rather than repeating the
inconsistent MIT label. CI has read-only repository permissions, covers `next`
and does not publish or deploy. Contributor guidance is intentionally scoped to
the compatibility work, not a rewrite of upstream conventions.

## Historical ABI boundary

### SDK package interoperability

The installed SDK Core 1.0.102 ESM entry fails under Node 24 because its graph
uses a named `elliptic` CommonJS import. Its published CommonJS entry loads
correctly. `src/wire/SdkCore.ts` uses that public require condition and exports
only the consumed public symbols/types; no private package paths, copied SDK
implementation, patched dependency files or SDK source changes are used. Keep
runtime and declaration types on the same entry-point graph. The compiled Node
diagnostic `node tests/ds-test.js` complements Bun's unit tests, which did not
expose the Node ESM failure. A future SDK release can remove this interop seam
after its public ESM entry passes the same runtime checks.

### ABI validity

The upstream ABI scan stores final ABI snapshots per block. It cannot prove the
ABI of each action within a block that changes that contract's ABI. This draft
therefore marks such actions (and missing ABI history) with `ds_error`, retains
their raw data and does not guess the latest or previous ABI. Reconstructing an
ordered in-block ABI timeline is still required for complete decoded history.
Generic action/transaction history remains present; health must report these
decode failures, not claim complete decoded coverage. Original ABI bytes and
their SHA-256 are archived separately from the SDK's parsed ABI representation.
Global sequence values are decimal strings with unsigned search mappings.
Transaction-cache entries are parsed before sorting; cached and flattened action
order uses SDK Core `UInt64` comparison, not JavaScript subtraction. Already
rounded numeric sequences are rejected instead of silently misordering history.

## Deprecation responses

Deprecated HTTP capabilities will retain their established method/path with an
explicit HTTP 410 response identifying the capability, reason and supported
replacement where one exists. Do not return HTTP 200 with fabricated empty data.
Deprecated CLI options/commands must fail explicitly before side effects. Generic
action history remains available even when a specialized legacy view is removed.

Retired enrichers: RAM/bandwidth/REX, obsolete DPoS voter/proxy, FIO-specific
rewards and float-valued transfer projections. Transfer data remains exact in
`act.data`; it is not converted into a floating-point balance view. The account
creation and permission enrichers remain. Generic multisig/council actions remain
history regardless of whether a specialized state API is offered.

Old account/voter/proposal/custom-state synchronizer constructors now fail with
`DeprecatedFeatureError` before reading files, pausing the indexer or touching
databases. The permission synchronizer remains and uses chain-scoped storage.
The existing account/multisig table handlers and other unproven backend consumers
are retained rather than removed wholesale. Experimental reference defaults keep
legacy state projections off; they are not verified current Wire KV state views.

### Runtime configuration

Use `settings.parser: "wire"`, `system_contract: "sysio"` and a new
`index_version: "wire-v1"`; do not reuse an existing index mapping. Connection
labels and `api.chain_name` remain operator-owned display/configuration choices.
Runtime storage identity is `w` plus the 32-byte chain ID losslessly encoded as
50 lowercase base-36 digits. This fits Elasticsearch naming and MongoDB's
63-byte database-name limit without truncating chain identity. Keep the MongoDB
database prefix short. Redis receives the same namespace as its key prefix.
Reusing a human label after a respin therefore selects new storage, not old data.

The read API retains health, action/transaction/account-creation/ABI/block/delta
history, v1 history compatibility and the narrow RPC read allowlist in
`WireRoutes.ts`. State summaries, token/voter/table projections, legacy
schedule/statistics/trace/stream APIs and transaction-forwarding routes return
410 with a replacement. SDK/Hub native account reads remain authoritative.
No live service, public endpoint or consumer configuration was changed.

## Validation and promotion gates

### Health and recovery semantics

`v2/health` retains upstream fields and adds `wire_history`. Its durable
coverage is sampled without response caching and scoped to the selected index
schema. It compares the indexed LIB's ID with canonical RPC, counts unresolved
action/delta decode errors and reports a count-based gap lower bound. Document
counts cannot prove distinct-height continuity (duplicates can conceal gaps), so
the response explicitly does not certify contiguous or genesis-complete history.
Default health bounds are 64 blocks of lag and 60 seconds of
RPC-head age; the response includes these policy limits. Backend errors produce
`UNAVAILABLE`, not an empty healthy range.

Bulk writes to missing indices are requeued; an absent-document delete alone can
acknowledge a 404 without an error. Partially failed batches do not advance
reported indexed progress, and message IDs use the same string identity as the
search backend. Fork cleanup compares canonical block IDs by height, never treats
an RPC failure as proof of a fork, covers partitioned/nonpartitioned block/action/
delta/ABI indices, and retains retry checkpoints after incomplete cleanup. ABI
snapshots carry their source block ID. These are offline-tested behaviors, not
proof of live queue fencing, cache invalidation or concurrent reorg recovery.

- Preserve and run upstream unit tests; add binary-consumption and SDK consumer
  fixtures, exact integer/key identities and malformed-input cases.
- Typecheck each targeted code change; perform build/clean-install checks at
  integration boundaries. Record exact results and limitations below.
- Verify the service-version matrix, restart/replay/reorg recovery and interrupted
  bulk writes before claiming operational readiness.
- Live deployment is separate: SHIP must be enabled on a compatible Wire peer.
  A snapshot does not provide prior history; expose actual retained coverage.
- Verify SHIP/RPC/index chain identity. Scope all persistent resources by actual
  chain identity and do not reuse a prior chain's indices after a respin.
- All newly allocated local ports, including test dependencies, come from the
  platform bind registry. Do not hard-code a local database/container stack.
- Keep SHIP and databases private, expose read routes only, and measure storage
  growth and catch-up before production sizing.

## Validation record

- Baseline license checksum recorded before changes; no license text modified.
- Unmodified upstream unit baseline: 133 passed, 0 failed (Bun 1.3.14).
- Baseline TypeScript diagnostics: passed on Node 24.21.0.
- Full runtime/service and live-chain acceptance: **not run**.
