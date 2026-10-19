import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const HISTORY_METHODS = new Set(["GET", "POST", "HEAD"]);
const READ_CHAIN_PATHS = new Set(["get_info", "get_block", "get_account", "get_abi", "get_raw_abi"]);
const DEPRECATED_STATE = new Set(["get_account", "get_tokens", "get_top_holders", "get_voters", "get_voter_scopes", "get_proposals", "get_table_rows"]);
const DEPRECATED_HISTORY = new Set(["get_schedule", "get_table_state", "export_actions"]);

/** Explicit retirement result, never an empty successful response. */
export function deprecatedResponse(capability: string, replacement: string) {
    return { statusCode: 410, error: "DeprecatedFeature", capability, message: "This capability is deprecated in the experimental Wire history fork.", replacement };
}

/** Shared stub for old route modules, including imports outside normal routing. */
export function deprecatedRouteFactory(capability: string) {
    return (_server: FastifyInstance, _route: string) => async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const response = deprecatedResponse(capability, "Use generic Wire history or live Wire RPC / SDK Core");
        reply.code(response.statusCode).send(response);
    };
}

/** Classify removed upstream routes and prevent history from forwarding writes. */
export function retiredCapability(path: string): ReturnType<typeof deprecatedResponse> | null {
    const route = path.split("?")[0].replace(/\/+$/, "");
    const name = route.slice(route.lastIndexOf("/") + 1);
    if (route.startsWith("/v1/chain/") && !READ_CHAIN_PATHS.has(name)) return deprecatedResponse("chain request forwarding", "Use the separately configured Wire RPC endpoint");
    if (route.startsWith("/v2/state/") && DEPRECATED_STATE.has(name)) return deprecatedResponse(name, "Use Wire RPC / SDK Core for current state; use history/get_actions for events");
    if ((route.startsWith("/v2/history/") && DEPRECATED_HISTORY.has(name)) || route.startsWith("/v2/stats/")) return deprecatedResponse(name, "Use bounded Wire action/block history or live RPC");
    if (route.startsWith("/v1/trace_api/") || route.startsWith("/socket.io")) return deprecatedResponse("legacy trace/stream API", "Use bounded v2/history/get_actions and get_transaction polling");
    return null;
}

/** Install actual 410 stubs before upstream handlers, including wildcard proxies. */
export function registerWireRoutePolicy(server: FastifyInstance): void {
    server.addHook("onRequest", (request, reply, done) => {
        const retired = retiredCapability(request.url);
        if (retired) { reply.code(retired.statusCode).send(retired); return; }
        if (request.url.startsWith("/v") && !HISTORY_METHODS.has(request.method)) { reply.code(405).send({ error: "ReadOnlyHistoryAPI" }); return; }
        done();
    });
    server.addHook("onRoute", route => {
        if (retiredCapability(route.url)) route.schema = { ...route.schema, deprecated: true };
    });
}
