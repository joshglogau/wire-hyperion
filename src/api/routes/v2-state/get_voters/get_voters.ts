import { deprecatedRouteFactory } from "../../../../wire/WireRoutes.js";

/** @deprecated get_voters is not a current-state projection in the Wire history MVP. */
export const getVotersHandler = deprecatedRouteFactory("get_voters");
