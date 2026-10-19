import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated Specialized fdtnrwdupdat enrichment is retired; raw action history remains. */
export const hyperionModule = {
    chain: "*",
    contract: "*",
    action: "fdtnrwdupdat",
    parser_version: [],
    handler: () => deprecatedFeature("Specialized fdtnrwdupdat projection")
};
