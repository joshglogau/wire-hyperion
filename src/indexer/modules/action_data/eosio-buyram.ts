import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated Specialized buyram enrichment is retired; raw action history remains. */
export const hyperionModule = {
    chain: "*",
    contract: "*",
    action: "buyram",
    parser_version: [],
    handler: () => deprecatedFeature("Specialized buyram projection")
};
