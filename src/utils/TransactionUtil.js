import { CoinType } from "../enum/CoinType.js";

/**
 * 获取推荐 gas 配置并设置到 tx 上
 * @param client
 * @param {TransactionBlock} tx
 */
export async function estimateGasCostAndSet(client, tx) {
    // Dry run 估算 gas 使用量
    const dryRunResult = await client.dryRunTransactionBlock({
        transactionBlock: await tx.build({ client }),
    });

    const gasUsed = dryRunResult.effects.gasUsed;
    const gasPrice = await client.getReferenceGasPrice();

    // 推荐 budget：通常建议乘个 buffer，比如 × 1.2
    const gasBudget = (BigInt(gasUsed.computationCost) + BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate)) * 120n / 100n

    // 设置回 tx 上
    tx.setGasPrice(gasPrice);
    tx.setGasBudget(gasBudget);
}

export async function getCoinObjects(client, keypair, coinAddress) {
    const objects = await client.getCoins({
        owner: keypair.toSuiAddress(),
        coinType: coinAddress
    });

    if (objects.data.length === 0) {
        console.error('No related coin objects for this address');
        throw new Error('No related coin objects for this address');
    }

    return objects.data
}

export function formatBalanceChange(balanceChanges, sourceCoin, targetCoin) {
    const decimals = {
        [CoinType.SUI]: 9,
        [CoinType.USDC]: 6,
        [CoinType.USDT]: 6
    };
    const sourceCoinAmount = BigInt(Math.abs(balanceChanges.filter(it => it.coinType === sourceCoin)[0].amount))
    const targetCoinAmount = BigInt(Math.abs(balanceChanges.filter(it => it.coinType === targetCoin)[0].amount))
    return [formatAmount(sourceCoinAmount, decimals[sourceCoin]), formatAmount(targetCoinAmount, decimals[targetCoin])]
}

function formatAmount(amount, decimals) {
    const amt = BigInt(amount);
    const factor = 10n ** BigInt(decimals);
    const whole = amt / factor;
    const fraction = amt % factor;

    if (fraction === 0n) return whole.toString();

    const fracStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${whole}.${fracStr}`;
}
