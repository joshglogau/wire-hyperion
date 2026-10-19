import { deprecatedFeature } from "../../wire/Deprecation.js";

/** Retained error shape for callers of the retired state synchronizer. */
export class ConfigLoadError extends Error {
    constructor(readonly path: string, message: string) { super(message); this.name = "ConfigLoadError"; }
}

/** @deprecated Current-state projections require a separately validated Wire design. */
export class ContractStateSynchronizer {
    constructor(_chain: string) { deprecatedFeature("ContractStateSynchronizer"); }

    isEnabled(): boolean { return deprecatedFeature("ContractStateSynchronizer"); }

    async run(_contract?: string, _table?: string): Promise<void> { deprecatedFeature("ContractStateSynchronizer"); }
}
