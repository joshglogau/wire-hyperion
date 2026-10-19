import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated Specialized buyrambytes enrichment is retired; raw action history remains. */
export const hyperionModule = {
    chain: "*",
    contract: "*",
    action: "buyrambytes",
    parser_version: [],
    handler: () => deprecatedFeature("Specialized buyrambytes projection")
};
