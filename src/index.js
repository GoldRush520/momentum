import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { claimPendingYield } from "./services/PoolService.js";
import { trade } from "./services/TradeSerivce.js";
import { getPoolByName } from "./enum/PoolType.js";
import { sleepRandomSeconds } from "./utils/TimeUtil.js";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'data', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const client = new SuiClient({url: 'https://fullnode.mainnet.sui.io:443'});


async function main() {
    if (config.shuffleAccounts) {
        config.accounts = config.accounts.sort(() => Math.random() - 0.5);
    }
    for (let account of config.accounts) {
        const suiPrivateKey = account.suiPrivateKey;
        const {schema, secretKey} = decodeSuiPrivateKey(suiPrivateKey);
        const keypair = Ed25519Keypair.fromSecretKey(secretKey);
        console.log("------------------------------------------------")
        console.log(`开始为地址:${keypair.toSuiAddress()}执行交易。`)

        // await claimPendingYield(client, keypair)
        for (let tokenPair of account.tokenPairs) {
            let pool = getPoolByName(tokenPair.name)
            for (let i = 0; i < tokenPair.swapRound; i++) {
                await trade(client, keypair, pool, tokenPair.amount)
                await sleepRandomSeconds()
            }
        }
        console.log(`${keypair.toSuiAddress()}交易全部执行完成。随机等待一段时间后，将为下一个地址执行交易~`)
    }
    console.log("所有地址交易全部执行完成，退出脚本...")
}

async function getBalanceChangesByTx(client, keypair, txDigest) {
    const txDetails = await client.getTransactionBlock({
        digest: txDigest,
        options: {
            showBalanceChanges: true,
        },
    });

    console.log(formatBalanceChange(txDetails.balanceChanges, CoinType.USDC, CoinType.USDT))
}

main();
