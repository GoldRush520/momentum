# Momentum 交易机器人

这是一个基于 Sui 网络上[Momentum](https://app.mmt.finance/leaderboard?refer=K702JN)的自动化交易机器人，支持多账户管理和自动交易执行。

**更多脚本分享, 关注我的[X](https://x.com/0Xiaofan22921)**

## 功能特点

- 🔄 支持多账户自动交易
- 💱 支持多种交易对（目前支持SUI/USDC, USDC/USDT 等）
- ⚡ 自动执行交易
- 🎲 支持随机地址以及随机币种顺序同时地址和币种之间会随机等待一段时间，避免被女巫

## 安装

1. 克隆项目
```bash
git clone [项目地址]
cd momentum
```

2. 安装依赖
```bash
npm install
```

## 配置

在 `src/data/config.json` 中配置您的账户信息：

```json
{
  "shuffleAccounts": true,
  "shuffleTokenPairs": true,
  "accounts": [
    {
      "suiPrivateKey": "你的私钥",
      "tokenPairs": [
        {
          "name": "SUI_USDC",
          "swapRound": 1,
          "amount": 10
        }
      ]
    }
  ]
}
```

### 配置说明

- `shuffleAccounts`: 是否随机打乱账户执行顺序
- `shuffleTokenPairs`: 是否随机打乱交易对执行顺序
- `accounts`: 账户配置数组
  - `suiPrivateKey`: Sui 私钥
  - `tokenPairs`: 交易对配置
    - `name`: 交易对名称（SUI_USDC/USDC_USDT）
    - `swapRound`: 交易轮次
    - `amount`: 交易数量

## 使用方法

1. 启动交易
```bash
node src/index.js
```

2. 查看交易日志
交易执行过程中会显示详细的交易信息，包括：
- 交易对信息
- 交易金额
- 交易哈希
- 交易状态

## 注意事项

- 请确保账户中有足够的代币余额
- 请妥善保管私钥信息

## 免责声明

本项目仅供学习研究使用，使用本项目产生的任何风险由使用者自行承担。 