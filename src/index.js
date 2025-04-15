import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { claimPendingYield } from "./services/PoolService.js";
import { formatBalanceChange, getCoinObjects } from "./utils/TransactionUtil.js";
import { CoinType } from "./enum/CoinType.js";
import { getLatestFlashSwapTime, getTradeVolume, trade } from "./services/TradeSerivce.js";
import { getPoolByName } from "./enum/PoolType.js";
import chalk from 'chalk';
import { shuffle } from "./utils/Util.js";
import { sleepRandomSeconds } from "./utils/TimeUtil.js";
import inquirer from 'inquirer';
import Table from 'cli-table3';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'data', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const client = new SuiClient({url: 'https://fullnode.mainnet.sui.io:443'});

async function main() {
    const accountsInfo = await getAccountsInfo()
    await showAccountInfo(accountsInfo)

    // 使用 inquirer 让用户选择账户
    const { selectedAccountIndex } = await inquirer.prompt([
        {
            type: 'input',
            name: 'selectedAccountIndex',
            message: '请选择需要操作的账户的序号：',
            validate: input => {
                return isNaN(input) ? '必须是数字' : true;
            }
        }
    ]);
    const selectedAccount = accountsInfo[selectedAccountIndex - 1];
    console.log(chalk.blue(`您选择的账户是: ${selectedAccount[1]} (${selectedAccount[2]})`));

    if (config.shuffleAccounts) {
        config.accounts = shuffle(config.accounts)
    }

    for (let account of config.accounts) {
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
    console.log(chalk.green('✨ 所有交易执行完成！'));
    console.log(chalk.gray('----------------------------------------'));
}

async function getAccountsInfo() {
    const accountsInfo = [];

    for (let i = 0; i < config.accounts.length; i++) {
        const account = config.accounts[i]
        const {secretKey} = decodeSuiPrivateKey(account.suiPrivateKey);
        const keypair = Ed25519Keypair.fromSecretKey(secretKey);
        const address = keypair.toSuiAddress();

        const lastSwapTime = await getLatestFlashSwapTime(client, address);
        const volumeInfo = await getTradeVolume(address)

        const formattedTime = lastSwapTime
            ? lastSwapTime.toLocaleString('zh-CN', {hour12: false})
            : '无记录';

        accountsInfo.push([
            i + 1,
            account.nickname || '未设置',
            address,
            volumeInfo.value.toFixed(2),
            volumeInfo.rank,
            formattedTime,
        ]);
    }
    return accountsInfo;
}

async function showAccountInfo(accountsInfo) {

    const table = new Table({
        head: ['序号', '备注', '地址', '交易额', '交易额排名', '上次swap的时间'],
        style: {
            head: ['cyan'],
            border: ['gray'],
        },
        colWidths: [8, 15, 68, 25],
        chars: {
            top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
            bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
            left: '│', 'left-mid': '', mid: '', 'mid-mid': '',
            right: '│', 'right-mid': '', middle: '│',
        },
        wordWrap: true,
    });

    table.push(...accountsInfo);
    console.log(table.toString());
}

main();
