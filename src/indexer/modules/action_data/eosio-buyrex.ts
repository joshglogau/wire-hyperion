import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated Specialized buyrex enrichment is retired; raw action history remains. */
export const hyperionModule = {
    chain: "*",
    contract: "*",
    action: "buyrex",
    parser_version: [],
    handler: () => deprecatedFeature("Specialized buyrex projection")
};
