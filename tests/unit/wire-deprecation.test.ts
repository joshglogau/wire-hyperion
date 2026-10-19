import { describe, expect, it } from "bun:test";
import Fastify from "fastify";
import { AccountSynchronizer } from "../../src/cli/sync-modules/sync-accounts.js";
import { VoterSynchronizer } from "../../src/cli/sync-modules/sync-voters.js";
import { ProposalSynchronizer } from "../../src/cli/sync-modules/sync-proposals.js";
import { ContractStateSynchronizer, ConfigLoadError } from "../../src/cli/sync-modules/sync-contract-state.js";
import { DeprecatedFeatureError } from "../../src/wire/Deprecation.js";
import { getTokensHandler } from "../../src/api/routes/v2-state/get_tokens/get_tokens.js";
import { hyperionModule as retiredTransfer } from "../../src/indexer/modules/action_data/transfer.js";

describe("explicit legacy deprecation", () => {
    it("fails synchronizers before configuration or service side effects", () => {
        expect(() => new AccountSynchronizer("unconfigured")).toThrow(DeprecatedFeatureError);
        expect(() => new VoterSynchronizer("unconfigured")).toThrow(DeprecatedFeatureError);
        expect(() => new ProposalSynchronizer("unconfigured")).toThrow(DeprecatedFeatureError);
        expect(() => new ContractStateSynchronizer("unconfigured")).toThrow(DeprecatedFeatureError);
        expect(new ConfigLoadError("example", "missing").path).toBe("example");
    });

    it("does not import deployment configuration or round transfers into floats", () => {
        expect(retiredTransfer.parser_version).toEqual([]);
        expect(() => retiredTransfer.handler()).toThrow(DeprecatedFeatureError);
    });

    it("preserves a retired route module as a real HTTP 410 stub", async () => {
        const app = Fastify();
        app.get("/v2/state/get_tokens", getTokensHandler(app, "get_tokens"));
        try {
            const response = await app.inject({ method: "GET", url: "/v2/state/get_tokens" });
            expect(response.statusCode).toBe(410);
            expect(response.json().capability).toBe("get_tokens");
        } finally { await app.close(); }
    });
});
