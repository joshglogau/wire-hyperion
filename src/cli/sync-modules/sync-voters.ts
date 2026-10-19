import { deprecatedFeature } from "../../wire/Deprecation.js";

/** @deprecated Current-state projections require a separately validated Wire design. */
export class VoterSynchronizer {
    constructor(_chain: string) { deprecatedFeature("VoterSynchronizer"); }

    async run(_contract?: string, _table?: string): Promise<void> { deprecatedFeature("VoterSynchronizer"); }
}
