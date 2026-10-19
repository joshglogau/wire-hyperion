import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated Specialized bprewdupdate enrichment is retired; raw action history remains. */
export const hyperionModule = {
    chain: "*",
    contract: "*",
    action: "bprewdupdate",
    parser_version: [],
    handler: () => deprecatedFeature("Specialized bprewdupdate projection")
};
