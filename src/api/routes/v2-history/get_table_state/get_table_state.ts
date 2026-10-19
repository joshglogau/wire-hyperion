import { deprecatedRouteFactory } from "../../../../wire/WireRoutes.js";

/** @deprecated get_table_state is not a current-state projection in the Wire history MVP. */
export const getTableStateHandler = deprecatedRouteFactory("get_table_state");
