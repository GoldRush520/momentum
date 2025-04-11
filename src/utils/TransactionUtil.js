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
