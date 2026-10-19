/** Stable failure for retired CLI/plugin capabilities, before any side effects. */
export class DeprecatedFeatureError extends Error {
    readonly code = "DeprecatedFeature";
    constructor(readonly capability: string, readonly replacement: string) {
        super(`${capability} is deprecated in this Wire history draft. ${replacement}`);
        this.name = "DeprecatedFeatureError";
    }
}

/** Retain old entry points without running their retired implementations. */
export function deprecatedFeature(capability: string, replacement = "Use generic Wire action history or live Wire RPC / SDK Core"): never {
    throw new DeprecatedFeatureError(capability, replacement);
}
