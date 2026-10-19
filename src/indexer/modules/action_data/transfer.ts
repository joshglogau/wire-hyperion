import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated Specialized transfer enrichment is retired; raw action history remains. */
export const hyperionModule = {
    chain: "*",
    contract: "*",
    action: "transfer",
    parser_version: [],
    handler: () => deprecatedFeature("Specialized transfer projection")
};
