import { deprecatedRouteFactory } from "../../../../wire/WireRoutes.js";

/** @deprecated get_voter_scopes is not a current-state projection in the Wire history MVP. */
export const getVoterScopesHandler = deprecatedRouteFactory("get_voter_scopes");
