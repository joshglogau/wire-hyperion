import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated Specialized voteproducer enrichment is retired; raw action history remains. */
export const hyperionModule = {
    chain: "*",
    contract: "*",
    action: "voteproducer",
    parser_version: [],
    handler: () => deprecatedFeature("Specialized voteproducer projection")
};
