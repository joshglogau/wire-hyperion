# Wire compatibility fixtures

`wire-ship-abi.json` is mechanically extracted from the public ABI literal in
[`wire-sysio/libraries/state_history/abi.cpp`](https://github.com/Wire-Network/wire-sysio/blob/200aa30e88ac82799ee19f458a9edafa44ee9122/libraries/state_history/abi.cpp).
It is a protocol test fixture, not a copied node ledger or a claim of live capture.
Preserve its producer provenance; regenerate deliberately when the target changes.

Binary vectors in unit tests are synthetic. Assertions on fixed lengths, field
alignment and malformed buffers are independent of encoder round trips. They
prove serialization compatibility, not valid signatures, live ingestion or replay.
No private keys, operator identities or deployment-specific chain IDs belong here.
