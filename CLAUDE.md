# Wire Hyperion contributor notes

Experimental Wire Network compatibility fork of EOS Rio Hyperion. Preserve
upstream attribution, license text and Git history. See `MIGRATION.md` for scope,
changes, evidence and remaining deployment gates; this is not a production release.

- Keep the reader, queues, recovery and search pipeline upstream-owned in shape.
- Reuse public `@wireio/sdk-core` APIs; never copy SDK internals or generated types.
- Decode historical actions with their historical ABI; retain original ABI bytes.
- Do not truncate keys/signatures, round integer quantities or silently drop blocks.
- Removed public capabilities return explicit deprecation errors, not empty data.
- Use platform logging and bind-registry rules in new Wire code. No fixed local
  service/test ports, keys, ledgers or environment files in source control.
- Tests: `npm test` (Bun). Diagnostics: `npm run typecheck`. Build: `npm run build`.
- Update the migration log and relevant tests with each targeted change. Do not
  claim live ingestion, recovery or database compatibility from unit tests alone.
