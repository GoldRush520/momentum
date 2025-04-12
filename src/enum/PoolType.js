import { CoinType } from "./CoinType.js";

export const PoolType = {
    SUI_USDC: {
        packageId: "0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388",
        initialSharedVersion: 499761256,
        tokenA: CoinType.SUI,
        tokenB: CoinType.USDC,
        parameter: "4295048017",
        reverseParameter: "79226673515401279992447579050"
    },
    USDT_USDC: {
        packageId: "0x8a86062a0193c48b9d7c42e5d522ed1b30ba1010c72e0cd0dad1525036775c8b",
        initialSharedVersion: 499761263,
        tokenA: CoinType.USDT,
        tokenB: CoinType.USDC,
        parameter: "4295048017",
        reverseParameter: "79226673515401279992447579050"
    }
};

export function getPoolByName(name) {
    switch (name) {
        case "SUI_USDC":
            return PoolType.SUI_USDC;
        case "USDT_USDC":
            return PoolType.USDT_USDC;
        case "USDC_USDT":
            return PoolType.USDT_USDC;
        default:
            throw new Error(`Pool ${name} not found`);
    }
}