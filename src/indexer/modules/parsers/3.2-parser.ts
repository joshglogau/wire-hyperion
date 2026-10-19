/** @deprecated The Wire draft only supports the producer-ABI-driven Wire parser. */
export default class DeprecatedAntelopeParser {
    constructor() {
        throw new Error("Deprecated parser 3.2: configure settings.parser=wire for this Wire history draft");
    }
}
