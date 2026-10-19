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
| 8 | Planned | Configure bounded, chain-scoped read APIs with explicit compatibility/deprecation responses. |
| 9 | Planned | Retire obsolete specialized chain features without deleting generic governance history. |
| 10 | Planned | Remove replaced codecs and integrations only after retained callers pass. |
| 11 | Planned | Expose truthful coverage, lag and indexing failures through compatible health fields. |
| 12 | Planned | Record reproducible validation and operational/release gates. |

### Step 1 — baseline and contribution boundaries

The upstream author, credits, license file and commits are retained. The package
license field now points to the existing license rather than repeating the
inconsistent MIT label. CI has read-only repository permissions, covers `next`
and does not publish or deploy. Contributor guidance is intentionally scoped to
the compatibility work, not a rewrite of upstream conventions.

## Historical ABI boundary

The upstream ABI scan stores final ABI snapshots per block. It cannot prove the
ABI of each action within a block that changes that contract's ABI. This draft
therefore marks such actions (and missing ABI history) with `ds_error`, retains
their raw data and does not guess the latest or previous ABI. Reconstructing an
ordered in-block ABI timeline is still required for complete decoded history.
Generic action/transaction history remains present; health must report these
decode failures, not claim complete decoded coverage. Original ABI bytes and
their SHA-256 are archived separately from the SDK's parsed ABI representation.
Global sequence values are decimal strings with unsigned search mappings.

## Deprecation responses

Deprecated HTTP capabilities will retain their established method/path with an
explicit HTTP 410 response identifying the capability, reason and supported
replacement where one exists. Do not return HTTP 200 with fabricated empty data.
Deprecated CLI options/commands must fail explicitly before side effects. Generic
action history remains available even when a specialized legacy view is removed.

## Validation and promotion gates

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
