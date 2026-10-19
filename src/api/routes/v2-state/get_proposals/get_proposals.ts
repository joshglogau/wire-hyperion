import { deprecatedRouteFactory } from "../../../../wire/WireRoutes.js";

/** @deprecated get_proposals is not a current-state projection in the Wire history MVP. */
export const getProposalsHandler = deprecatedRouteFactory("get_proposals");
