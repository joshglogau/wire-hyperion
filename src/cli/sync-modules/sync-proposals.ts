import { deprecatedFeature } from "../../wire/Deprecation.js";

/** @deprecated Current-state projections require a separately validated Wire design. */
export class ProposalSynchronizer {
    constructor(_chain: string) { deprecatedFeature("ProposalSynchronizer"); }

    async run(_contract?: string, _table?: string): Promise<void> { deprecatedFeature("ProposalSynchronizer"); }
}

