import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { trade } from "./services/TradeSerivce.js";
import { getPoolByName } from "./enum/PoolType.js";
import chalk from 'chalk';
import { shuffle } from "./utils/Util.js";
import { sleepRandomSeconds } from "./utils/TimeUtil.js";
import inquirer from 'inquirer';
import { getAccountsInfo, selectAccount, showAccountInfo } from "./services/AccountService.js";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'data', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const client = new SuiClient({url: 'https://fullnode.mainnet.sui.io:443'});

async function main() {
    const accountsInfo = await getAccountsInfo(client, config.accounts)
    await showAccountInfo(accountsInfo)
    let selectedAccounts = await selectAccount(accountsInfo, config);

    for (let account of selectedAccounts) {
        const suiPrivateKey = account.suiPrivateKey;
        const {schema, secretKey} = decodeSuiPrivateKey(suiPrivateKey);
        const keypair = Ed25519Keypair.fromSecretKey(secretKey);
        
        // 添加地址提示信息
        console.log(chalk.gray('----------------------------------------'));
        console.log(chalk.magenta('👤 正在处理地址:'), chalk.white(keypair.toSuiAddress()));

        if (config.shuffleTokenPairs) {
           account.tokenPairs = shuffle(account.tokenPairs)
        }

        for (let tokenPair of account.tokenPairs) {
            console.log(chalk.cyan(`💱 开始处理交易对: ${chalk.white(tokenPair.name)}`));
            let pool = getPoolByName(tokenPair.name);
            for (let i = 0; i < tokenPair.swapRound; i++) {
                console.log(chalk.yellow(`🔄 执行第 ${chalk.white(i + 1)}/${tokenPair.swapRound} 轮交易`));
                await trade(client, keypair, pool, tokenPair.amount);
                console.log(chalk.cyan("⏳ 随机等待一段时间后, 将执行下一轮操作......"))
                await sleepRandomSeconds()
            }
            console.log(chalk.green(`✅ 交易对 ${chalk.white(tokenPair.name)} 处理完成`));
        }
        console.log(chalk.green(`✅ ${keypair.toSuiAddress()} 交易全部执行完成，随机等待一段时间后，将为下一个地址执行交易~`));
    }
    console.log(chalk.gray('----------------------------------------'));

    const continueTrading = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: '✨ 所有交易执行完成！您想要继续选择地址交易还是退出？',
            choices: ['继续选择地址交易', '退出']
        }
    ]);

    if (continueTrading.action === '退出') {
        console.log(chalk.blue('感谢使用，再见！'));
        process.exit(0);
    } else {
        // 重新开始选择账户和交易
        await main(); 
    }
}

main();
