import {ABI} from "../wire/SdkCore.js";

export interface HyperionAbi {
    valid_until: number | null;
    valid_from: number | null;
    block?: number;
    block_id?: string;
    account?: string;
    abi: ABI.Def | string;
    abi_hex?: string;
    actions?: string[];
    tables?: string[];
}

export interface SavedAbi {
    block?: number;
    abi_hex?: string;
    abi: ABI.Def;
    valid_until: number | null;
    valid_from: number | null;
    actions?: string[];
}
