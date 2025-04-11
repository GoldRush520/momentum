import { TransactionBlock } from '@mysten/sui.js/transactions';
import { CoinType, getTokenNameByAddress } from "../enum/CoinType.js";
import { getCoinObjects } from "../utils/TransactionUtil.js";


export async function trade(client, keypair) {
    const sourceCoin = CoinType.USDT
    const targetCoin = CoinType.USDC
    const amount = await calculateSwapAmount(client, keypair, sourceCoin)
    await executeTrade(client, keypair, sourceCoin, targetCoin, amount)
}

async function calculateSwapAmount(client, keypair, sourceCoin) {
    const coinObjects = await getCoinObjects(client, keypair, sourceCoin)
    let amount = coinObjects.reduce((acc, it) => acc + BigInt(it.balance), 0n);
    return amount
}

async function mergeSourceCoins(client, keypair, sourceTokenAddress, tx, amount) {
    const coins = await getCoinObjects(client, keypair, sourceTokenAddress)
    tx.mergeCoins(tx.object(coins[0].coinObjectId), coins.slice(1).map(it => tx.object(it.coinObjectId)))
    return tx.splitCoins(tx.object(coins[0].coinObjectId), [amount])
}

export async function executeTrade(client, keypair, sourceCoin, targetCoin, amount) {
    const tx = new TransactionBlock();

    // ==== Inputs ====
    const splitAmount = tx.pure.u64(amount);

    const sharedPool = tx.sharedObjectRef({
        objectId: '0x8a86062a0193c48b9d7c42e5d522ed1b30ba1010c72e0cd0dad1525036775c8b',
        initialSharedVersion: 499761263,
        mutable: true,
    });
    const isReverse = tx.pure.bool(targetCoin === CoinType.USDC);
    const simulate = tx.pure.bool(true);
    const quantity = tx.pure.u64(amount);
    const minOut = tx.pure.u128(targetCoin === CoinType.USDT ? '79226673515401279992447579050' : '4295048017');
    const clock = tx.sharedObjectRef({
        objectId: '0x0000000000000000000000000000000000000000000000000000000000000006',
        initialSharedVersion: 1,
        mutable: false,
    });
    const market = tx.sharedObjectRef({
        objectId: '0x2375a0b1ec12010aaea3b2545acfa2ad34cfbba03ce4b59f4c39e1e25eed1b2a',
        initialSharedVersion: 499761252,
        mutable: false,
    });
    const slippageAmount = tx.pure.u128(targetCoin === CoinType.USDT ? '79226673515401279992447579050' : '4295048017');
    const revertOnSlippage = tx.pure.bool(targetCoin === CoinType.USDC);
    const recipient = tx.pure.address(keypair.toSuiAddress());
    const refund = tx.pure.address(keypair.toSuiAddress())

    // ==== Transactions ====
    const splitResult = await mergeSourceCoins(client, keypair, sourceCoin, tx, splitAmount)
    // flash_swap
    const [coinOut, coinDebt, coinReceived] = tx.moveCall({
        target: '0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860::trade::flash_swap',
        typeArguments: [
            CoinType.USDT,
            CoinType.USDC,
        ],
        arguments: [sharedPool, isReverse, simulate, quantity, minOut, clock, market],
    });

    // destroy_zero
    tx.moveCall({
        target: '0x2::balance::destroy_zero',
        typeArguments: [sourceCoin],
        arguments: [coinOut],
    });

    // 4 coin::zero
    const result4 = tx.moveCall({
        target: '0x2::coin::zero',
        typeArguments: [targetCoin],
    });

    // 5 swap_receipt_debts
    const result5 = tx.moveCall({
        target: '0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860::trade::swap_receipt_debts',
        arguments: [coinReceived],
    });

    // 6 coin::split source coin
    const result6 = tx.moveCall({
        target: '0x2::coin::split',
        typeArguments: [sourceCoin],
        arguments: [splitResult[0], result5[0]],
    });

    // 7 into_balance (target coin)
    const balanceTarget= tx.moveCall({
        target: '0x2::coin::into_balance',
        typeArguments: [CoinType.USDT],
        arguments: [result6],
    });

    // 8 into_balance (source coin)
    const balanceSource = tx.moveCall({
        target: '0x2::coin::into_balance',
        typeArguments: [CoinType.USDC],
        arguments: [result4[0]],
    });

    // 9 repay_flash_swap
    tx.moveCall({
        target: '0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860::trade::repay_flash_swap',
        typeArguments: [
            CoinType.USDT,
            CoinType.USDC
        ],
        arguments: [sharedPool, coinReceived, balanceTarget, balanceSource, market],
    });

    // 10 slippage_check
    tx.moveCall({
        target: '0x8add2f0f8bc9748687639d7eb59b2172ba09a0172d9e63c029e23a7dbdb6abe6::slippage_check::assert_slippage',
        typeArguments: [
            CoinType.USDT,
            CoinType.USDC
        ],
        arguments: [sharedPool, slippageAmount, revertOnSlippage],
    });

    // coin::from_balance (target)
    const [coinToTransfer] = tx.moveCall({
        target: '0x2::coin::from_balance',
        typeArguments: [targetCoin],
        arguments: [coinDebt],
    });

    // Transfer coin to recipient
    tx.transferObjects([splitResult], recipient);

    // coin::value
    const [coinValue] = tx.moveCall({
        target: '0x2::coin::value',
        typeArguments: [targetCoin],
        arguments: [coinToTransfer],
    });

    // Transfer value object
    tx.transferObjects([coinToTransfer], refund);

    // ==== Done ====
    try {
        const result = await client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
        });
        console.log(`✅ swap ${getTokenNameByAddress(sourceCoin)} to ${getTokenNameByAddress(targetCoin)} successfully:`, result);
    } catch (error) {
        console.error(`❌ Failed to swap ${getTokenNameByAddress(sourceCoin)} to ${getTokenNameByAddress(targetCoin)}:`, error);
    }

}

