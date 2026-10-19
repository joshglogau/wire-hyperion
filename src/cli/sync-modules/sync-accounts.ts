import { deprecatedFeature } from "../../wire/Deprecation.js";

/** @deprecated Current-state projections require a separately validated Wire design. */
export class AccountSynchronizer {
    constructor(_chain: string, _contractFilter?: string) { deprecatedFeature("AccountSynchronizer"); }

    async run(_contract?: string, _table?: string): Promise<void> { deprecatedFeature("AccountSynchronizer"); }
}
