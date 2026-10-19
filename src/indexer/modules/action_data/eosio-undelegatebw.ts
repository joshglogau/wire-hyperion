import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated Specialized undelegatebw enrichment is retired; raw action history remains. */
export const hyperionModule = {
    chain: "*",
    contract: "*",
    action: "undelegatebw",
    parser_version: [],
    handler: () => deprecatedFeature("Specialized undelegatebw projection")
};
