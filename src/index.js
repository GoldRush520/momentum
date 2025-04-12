import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { claimPendingYield } from "./services/PoolService.js";
import { formatBalanceChange, getCoinObjects } from "./utils/TransactionUtil.js";
import { CoinType } from "./enum/CoinType.js";
import { trade } from "./services/TradeSerivce.js";
import { getPoolByName } from "./enum/PoolType.js";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'data', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });


async function main() {
    const suiPrivateKey = config[0].suiPrivateKey;
    const {schema, secretKey} = decodeSuiPrivateKey(suiPrivateKey);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    // await claimPendingYield(client, keypair)
    for (let tokenPair of config[0].tokenPairs) {
        let pool = getPoolByName(tokenPair.name)
        for (let i = 0; i < tokenPair.swapRound; i++) {
            await trade(client, keypair, pool)
        }
    }
    // await getBalanceChangesByTx(client, keypair, "AXrA9atEBG5uaZD1iUB5ypNCZ8KJHyeg2MN3niGHkW6w")
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
