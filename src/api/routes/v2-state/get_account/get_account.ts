import { deprecatedRouteFactory } from "../../../../wire/WireRoutes.js";

/** @deprecated get_account is not a current-state projection in the Wire history MVP. */
export const getAccountHandler = deprecatedRouteFactory("get_account");
