import type DSPoolWorker from "../../workers/ds-pool.js";
import type { ActionTrace } from "../../../interfaces/action-trace.js";
import { deprecatedFeature } from "../../../wire/Deprecation.js";

/** @deprecated DSP console-event parsing is not Wire action history. */
export async function parseDSPEvent(_worker: DSPoolWorker, _data: ActionTrace): Promise<void> {
    deprecatedFeature("DSP/LiquidApps console-event parsing");
}
