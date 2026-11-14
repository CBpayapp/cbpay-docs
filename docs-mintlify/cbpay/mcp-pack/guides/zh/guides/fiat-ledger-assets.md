---
title: "法币账本资产"
description: "BOB、MXN、ARS 和 CLP 账本余额的行为以及支持它们的产品"
slug: zh/guides/fiat-ledger-assets
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/fiat-ledger-assets
---
> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

> **重要**
**破坏性变更 — 2026-11-13。** BOB、MXN、ARS 和 CLP 余额以及 `BANK_*` 镜像仅属于 Banking。平台 payout、swap、内部转账、银行卡、checkout、POS 和手续费拒绝法币结算并返回 HTTP `400`。已有账户保留明确设置的 `USDT` 默认值；新账户使用 `USD` 作为主余额。法币操作请使用 Banking。
> **注**平台旧模型已下线。自 2026-11-13 起，法币余额、`BANK_*` 镜像和法币流水操作均属于 [Banking](https://docs.cbpayapp.com/zh/guides/banking)。本页保留旧账本契约用于历史对账；不要据此构建新的平台集成。## 平台历史模型（已下线）

历史上，CBPay 账户支持四种本地法币账本资产：**BOB**、**MXN**、**ARS** 和
**CLP**。BOB/MXN/ARS 使用两位小数；CLP 使用零位小数（整数比索）。
它们是独立余额，与 USD、USDT、USDC、BTC、GOLD、SILVER 和 PLATINUM 一起返回。

CLP 在 Banking 中本地保留，并按工具展示派生余额。相同资产的内部转账
允许使用 CLP。`settlement_asset: CLP` 仅可用于 CLP payout：使用同币种
身份汇率和零 spread。CLP 的任何非零小数都会返回 `400 invalid_amount`。

```mermaid
flowchart LR
  balances["GET /v1/balances"] --> ledger["账本资产"]
  history["GET /v1/balances/history"] --> ledger
  analytics["GET /v1/analytics/summary"] --> valuation["feed price or unpriced"]
```

## 法币资产出现在哪里

- `GET /v1/balances`：返回当前有效的账本行。已停用的 USDCE 和 UF 在余额恰为
  零时省略；非零或负余额仍会返回。BOB/MXN/ARS 使用两位小数；CLP 使用零位
  小数，例如 `"125.40"` 或 `"125"`。
- `GET /v1/balances/history`：为每种法币提供每日序列。全零的 USDCE 和 UF
  序列省略，但有真实历史的序列保留；当前快照使用相同规则。序列跟踪
  `available`，当前快照包含 held。
- `GET /v1/analytics/summary`：有余额或交易时包含法币。USD 估值使用组织
  汇率源（`1 / 本地货币每 USD`）；没有有效汇率时标记为 `unpriced`，不
  会把它加入 USD 总额。

```json
{
  "account_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "balances": [
    { "asset": "BOB", "available": "15000.00", "held": "0.00" },
    { "asset": "MXN", "available": "0.00", "held": "0.00" },
    { "asset": "ARS", "available": "0.00", "held": "0.00" },
    { "asset": "CLP", "available": "0", "held": "0" }
  ]
}
```

## 转账

`POST /v1/transfers` 支持相同资产的内部转账。法币转账保留两位小数，
CLP 保持整数比索；不会隐式转换为 USDT 或其他货币。

## v1 产品限制

账本登记法币并不代表所有产品都可以消费它：

| 产品 | v1 中的 BOB/MXN/ARS |
|---|---|
| 余额、history 和 analytics | 支持；CLP 通过 feed 估值，无 feed 时为 `unpriced` |
| 相同资产的内部转账 | 支持 |
| payout settlement asset 和组织默认值 | CLP 同币种允许；跨法币返回 `503 pricing_unavailable` |
| Swaps 和自动/手动转换 | CLP 返回 `400 invalid_pair` 或 `400 invalid_asset` |
| Checkout 和 POS | CLP 作为 settlement asset 返回 `400 invalid_asset` |
| Cards | 返回 `400 spending_asset_unavailable` |
| `default_payin_asset` | CLP 返回 `400 invalid_asset` |

这是有意的分层：余额可以先存在账本中，定价或外部结算路径可以稍后上线。

## 错误与精度

金额使用十进制字符串。`1.50` BOB 表示 150 个最小单位；`1.234` BOB、
MXN 或 ARS 会被拒绝；`"100.50"` CLP 也会被拒绝。跨法币 settlement
可能返回 `503 pricing_unavailable`，因为没有 FX 定价路径。

#### 增加法币会改变默认 settlement asset 吗？
不会。现有账户保留当前默认值。只有在资产启用且产品 gate 接受时才会使用法币。
#### 可以用法币余额支付卡片消费吗？
不可以。v1 卡片拒绝法币 spending asset；余额仍可被上表中的支持产品使用。
