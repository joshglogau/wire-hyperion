import { describe, expect, it } from "bun:test";
import Fastify from "fastify";
import { registerWireRoutePolicy, retiredCapability } from "../../src/wire/WireRoutes.js";
import { configureWireRuntime, wireNamespace } from "../../src/wire/WireConfiguration.js";
import type { HyperionConfig } from "../../src/interfaces/hyperionConfig.js";
import type { HyperionConnections } from "../../src/interfaces/hyperionConnections.js";

describe("Wire history API policy", () => {
    it.each(["/v2/state/get_tokens", "/v2/state/get_account", "/v2/state/get_voters", "/v2/history/get_schedule", "/v2/stats/get_missed_blocks", "/v1/chain/push_transaction"])("keeps an explicit deprecation stub at %s", async path => {
        const server = Fastify();
        let invoked = false;
        registerWireRoutePolicy(server);
        server.all(path, async () => { invoked = true; return {}; });
        try {
            const result = await server.inject({ method: "POST", url: `${path}?account=alice` });
            expect(result.statusCode).toBe(410);
            expect(result.json().error).toBe("DeprecatedFeature");
            expect(result.json().replacement).toBeTruthy();
            expect(invoked).toBe(false);
        } finally { await server.close(); }
    });

    it("retains read routes and blocks wildcard transaction forwarding before proxy execution", async () => {
        const server = Fastify();
        registerWireRoutePolicy(server);
        server.all("/v1/chain/*", async () => ({ read: true }));
        try {
            expect((await server.inject({ method: "POST", url: "/v1/chain/get_info" })).statusCode).toBe(200);
            expect((await server.inject({ method: "POST", url: "/v1/chain/send_transaction" })).statusCode).toBe(410);
            expect((await server.inject({ method: "DELETE", url: "/v1/chain/get_info" })).statusCode).toBe(405);
            expect(retiredCapability("/v2/history/get_actions?account=alice")).toBeNull();
        } finally { await server.close(); }
    });
});

describe("chain-scoped storage configuration", () => {
    const identity = "a1".repeat(32);

    it("losslessly encodes identity without truncation or deployment labels", () => {
        const namespace = wireNamespace(identity);
        expect(namespace).toHaveLength(51);
        const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
        const restored = [...namespace.slice(1)].reduce((value, digit) => value * 36n + BigInt(alphabet.indexOf(digit)), 0n);
        expect(restored.toString(16).padStart(64, "0")).toBe(identity);
        expect(wireNamespace("a2".repeat(32))).not.toBe(namespace);
        expect(() => wireNamespace("missing")).toThrow();
    });

    it("scopes runtime aliases, Mongo databases and all Redis keys idempotently", () => {
        // Partial test doubles contain only consumed metadata; no sockets or ports.
        const config = { settings: { chain: "example" } } as HyperionConfig;
        const connections = { chains: { example: { chain_id: identity } }, redis: {}, mongodb: { database_prefix: "history" } } as HyperionConnections;
        configureWireRuntime(config, connections);
        expect(config.settings.chain).toBe(wireNamespace(identity));
        expect(connections.chains[config.settings.chain].chain_id).toBe(identity);
        expect(connections.redis.keyPrefix).toBe(`${wireNamespace(identity)}::`);
        expect(() => configureWireRuntime(config, connections)).not.toThrow();
        connections.redis.keyPrefix = "other::";
        expect(() => configureWireRuntime(config, connections)).toThrow("keyPrefix");
    });
});
