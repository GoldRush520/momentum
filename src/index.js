import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { claimPendingYield } from "./services/PoolService.js";
import { getCoinObjects } from "./utils/TransactionUtil.js";
import { CoinType } from "./enum/CoinType.js";
import { trade } from "./services/TradeSerivce.js";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'data', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });


async function main() {
    const suiPrivateKey = config.suiPrivateKey;
    const {schema, secretKey} = decodeSuiPrivateKey(suiPrivateKey);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    // await claimPendingYield(client, keypair)
    // const coinObjects = await getCoinObjects(client, keypair, CoinType.SUI)
    // console.log(coinObjects)
    await trade(client, keypair)
}

main();
