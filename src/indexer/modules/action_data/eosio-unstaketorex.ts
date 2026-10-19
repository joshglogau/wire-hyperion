import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated Specialized unstaketorex enrichment is retired; raw action history remains. */
export const hyperionModule = {
    chain: "*",
    contract: "*",
    action: "unstaketorex",
    parser_version: [],
    handler: () => deprecatedFeature("Specialized unstaketorex projection")
};
