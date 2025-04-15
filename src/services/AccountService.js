import { getFormatCoinBalance } from "../utils/TransactionUtil.js";
import { CoinType } from "../enum/CoinType.js";
import { getLatestFlashSwapTime, getTradeVolume } from "./TradeSerivce.js";
import inquirer from "inquirer";
import chalk from "chalk";
import { shuffle } from "../utils/Util.js";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import Table from 'cli-table3';

export const getAccountsInfo = async (client, accounts) => {
    const accountsInfo = [];

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const { secretKey } = decodeSuiPrivateKey(account.suiPrivateKey);
        const keypair = Ed25519Keypair.fromSecretKey(secretKey);
        const address = keypair.toSuiAddress();

        const lastSwapTime = await getLatestFlashSwapTime(client, address);
        const volumeInfo = await getTradeVolume(address);
        const suiBalance = await getFormatCoinBalance(client, keypair, CoinType.SUI);
        const usdcBalance = await getFormatCoinBalance(client, keypair, CoinType.USDC);

        const formattedTime = lastSwapTime
            ? lastSwapTime.toLocaleString('zh-CN', { hour12: false })
            : '无记录';

        accountsInfo.push([
            i + 1,
            account.nickname || '未设置',
            address,
            suiBalance,
            usdcBalance,
            volumeInfo.value.toFixed(2),
            volumeInfo.rank,
            formattedTime,
        ]);
    }
    return accountsInfo;
};

export const showAccountInfo = (accountsInfo) => {
    const table = new Table({
        head: ['序号', '备注', '地址', 'Sui余额', 'USDC余额', '交易额', '交易额排名', '上次swap的时间'],
        style: {
            head: ['cyan'],
            border: ['gray'],
        },
        colWidths: [8, 10, 68, 15, 15, 10, 15, 25],
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
};

export async function selectAccount(accountsInfo, config) {
    let selectedAccounts = []
    const {selectedAccountIndex} = await inquirer.prompt([
        {
            type: 'input',
            name: 'selectedAccountIndex',
            message: '请输入账户序号(回车表示全部账户):',
            validate: input => {
                if (input === '') return true; // 空表示默认执行全部
                return isNaN(input) ? '必须是数字' : true;
            }
        }
    ]);

    if (selectedAccountIndex === '') {
        console.log(chalk.blue('将根据config.json文件里的配置操作所有账户'));
        if (config.shuffleAccounts) {
            config.accounts = shuffle(config.accounts)
        }
        selectedAccounts = config.accounts
    } else {
        const selectedAccount = accountsInfo[selectedAccountIndex - 1];
        console.log(chalk.blue(`你选择的账户是: ${selectedAccount[1]} (${selectedAccount[2]})`));
        const account = config.accounts[selectedAccountIndex - 1]
        const {selectedTokenPair} = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedTokenPair',
                message: '请选择交易对：',
                choices: ['USDC_USDT', 'SUI_USDC'],
                default: 'USDC_USDT' // 可选：默认选中项
            }
        ]);

        const {swapAmount} = await inquirer.prompt([
            {
                type: 'input',
                name: 'swapAmount',
                message: '请输入交易数量(回车表示全部数量):',
                validate: input => {
                    if (input === '') return true; // 空表示默认执行全部
                    return isNaN(input) ? '必须是数字' : true;
                }
            }
        ]);
        const {swapRounds} = await inquirer.prompt([
            {
                type: 'input',
                name: 'swapRounds',
                message: '请输入交易回合数(回车表示1):',
                default: 1,
                validate: input => {
                    return isNaN(input) ? '必须是数字' : true;
                }
            }
        ]);
        account.tokenPairs = [{
            "name": selectedTokenPair,
            "amount": swapAmount === '' ? undefined : Number(swapAmount),
            "swapRound": Number(swapRounds)
        }]

        selectedAccounts.push(account)
    }
    return selectedAccounts;
}