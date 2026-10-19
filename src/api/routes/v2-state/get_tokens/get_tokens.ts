import { deprecatedRouteFactory } from "../../../../wire/WireRoutes.js";

/** @deprecated get_tokens is not a current-state projection in the Wire history MVP. */
export const getTokensHandler = deprecatedRouteFactory("get_tokens");
