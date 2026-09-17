---
title: "集成流程"
description: "典型集成的端到端流程，附分步时序图"
slug: zh/flows
lang: zh
source_url: https://docs.cbpayapp.com/zh/flows
---
本页将各产品串联成**完整的业务流程**：调用什么、期待什么，以及哪个
webhook 为每个闭环收尾。每个流程都链接到对应产品的详细指南。

## 1. 为账户注资

资金流入有三条路径；全部以 USDT 入账和一个 webhook 结束：

```mermaid
sequenceDiagram
    participant App as 您的应用
    participant CB as CBPay
    participant Pagador as 付款方 / 网络
    App->>CB: POST /v1/payins (or crypto wallet)
    CB-->>App: pending + 支付信息（二维码、URL、参考号、地址）
    App->>Pagador: 分享支付方式
    Pagador->>CB: 完成支付（转账、二维码、链上 USDT）
    CB->>CB: 按您的 payin_rate 兑换 − 手续费（法币）
    CB-->>App: webhook payin_credited / crypto_deposit_credited
    App->>CB: GET /v1/balances (verify)
```

| 路径 | 端点 | 收尾 webhook |
|---|---|---|
| 法币收款（二维码、转账、支付页面、扣款） | `POST /v1/payins` / `/collect` | `payin_credited` |
| 链上 USDT 充值 | `POST /v1/crypto/wallets`（固定地址） | `crypto_deposit_credited` |
| 来自其他账户的内部转账 | ——（由发送方发起） | `transfer_received` |

详情：[收款](https://docs.cbpayapp.com/zh/guides/payins) · [加密资产](https://docs.cbpayapp.com/zh/guides/crypto) ·
[转账](https://docs.cbpayapp.com/zh/guides/transfers)。

## 2. 付款（Payout）

```mermaid
sequenceDiagram
    participant App as 您的应用
    participant CB as CBPay
    participant Banco as 本地清算网络
    App->>CB: POST /v1/payouts (idempotency_key)
    CB-->>App: 202 processing（fx_rate、total_debit；扣款进入冻结）
    CB->>Banco: 执行出金
    alt 支付成功
        Banco-->>CB: 确认
        CB-->>App: webhook payout_status_changed (completed)
    else 被拒绝
        Banco-->>CB: 拒绝
        CB->>CB: 将全部扣款退回可用余额
        CB-->>App: webhook payout_status_changed (failed + status_code)
    end
    App->>CB: GET /v1/payouts/{id}（确认最终状态）
```

**二维码**变体（玻利维亚、巴西 PIX）：`POST /v1/payouts/qr/scan`（免费，
解码）→ 展示数据 → `POST /v1/payouts/qr/confirm`（按普通付款计费）。
详情：[付款](https://docs.cbpayapp.com/zh/guides/payouts) · [QR 出金](https://docs.cbpayapp.com/zh/guides/qr-payout)。

## 3. 向客户收款

根据国家和期望的体验选择模式：

| 模式 | 国家 | 付款方体验 | 确认方式 |
|---|---|---|---|
| 托管支付页面 | CL | 打开一个 URL，从其银行完成支付 | 自动 |
| 二维码 | BO、BR（PIX） | 使用其银行 App 扫码 | 自动 |
| 附参考号转账 | CL、PE、MX、BR | 转账时附带参考号 | 按参考号自动确认（或按金额） |
| 专属 CLABE / CVU | MX、AR | 转账到您的固定账户 | 自动，无需参考号 |
| 卡支付 | BO（BOB/USD） | 在安全托管页面输入卡片（3DS） | 自动 |
| 通用收款链接 | 所有已开通国家 + 加密货币 + 卡 | 打开一个链接自选支付方式 | 自动 |

所有模式都以 `payin_credited` 收尾，净额入账到您的余额。
详情：[收款](https://docs.cbpayapp.com/zh/guides/payins) · [Checkout](https://docs.cbpayapp.com/zh/guides/checkout)。

## 4. Checkout 端到端

一个链接覆盖所有支付轨道，结算到您选择的余额：

```mermaid
sequenceDiagram
    participant App as 您的应用
    participant CB as CBPay
    participant Pagador as 付款人
    App->>CB: POST /v1/payins (method: checkout, amount, settlement_asset)
    CB-->>App: checkout_url（品牌化公开页面）
    App->>Pagador: 分享链接
    Pagador->>CB: 选择法币 / 加密货币 / 卡 / CBPay 应用并支付
    CB->>CB: 入账并自动兑换为您的 settlement_asset
    CB-->>App: webhook payin_credited (settled_via, conversion_status)
```

详情：[Checkout](https://docs.cbpayapp.com/zh/guides/checkout)。

## 5. 已保存卡片与订阅

在持卡人同意下保存一次卡片，之后即可扣款 —— 一键支付、持卡人不在场
（MIT）或按周期循环：

```mermaid
sequenceDiagram
    participant App as 您的应用
    participant CB as CBPay
    participant Pagador as 付款人
    App->>CB: POST /v1/payins (method: card, save_card: true)
    Pagador->>CB: 完成 3DS 支付并勾选"保存我的卡片"
    CB-->>App: webhook card_stored (stored_card_id)
    App->>CB: POST /v1/stored-cards/{id}/charges（MIT，持卡人不在场）
    CB-->>App: webhook payin_credited
    App->>CB: POST /v1/subscriptions（周期 + 金额）
    CB-->>App: 每期 payin_credited + subscription_status_changed
```

详情：[已保存卡片与订阅](https://docs.cbpayapp.com/zh/guides/stored-cards-subscriptions)。

## 6. QR POS 收款（收单处理商）

面向运营线下销售点的企业：

```mermaid
sequenceDiagram
    participant POS as 您的 POS
    participant CB as CBPay
    participant Cliente as 顾客
    POS->>CB: POST /v1/pos/merchants（已验证商户，一次性）
    POS->>CB: POST /v1/pos/charges (amount, idempotency_key)
    CB-->>POS: 专属加密地址 + 二维码 + 报价应付额
    Cliente->>CB: 用加密货币支付（部分支付可累计）
    CB-->>POS: webhook payin_credited（含 pos_merchant 归属）
```

详情：[QR POS](https://docs.cbpayapp.com/zh/guides/qr-pos)。

## 7. 余额兑换（Swaps）

```mermaid
flowchart LR
    Q["GET /v1/swaps/quote<br/>（参考报价，免费）"] --> S["POST /v1/swaps<br/>(idempotency_key)"]
    S --> B["即时入账到<br/>目标余额"]
```

一次调用即可在 USDT、USDC、BTC、GOLD、SILVER 和 PLATINUM 之间按您账户的汇率兑换 ——
资金不离开账户，因此无需 OTP。详情：[兑换](https://docs.cbpayapp.com/zh/guides/swaps)。

## 8. 对账

```mermaid
flowchart LR
    webhooks["Webhooks<br/>（推送，按事件）"] --> interno["您的内部记录<br/>（按 idempotency_key）"]
    movements["GET /v1/movements<br/>（不可篡改账本）"] --> interno
    cartola["期间对账单<br/>（JSON/PDF/Excel）"] --> cierre["会计结账<br/>并核对余额"]
    interno --> cierre
```

完整做法见
[流水与对账](https://docs.cbpayapp.com/zh/concepts/movements-reconciliation)和
[对账单](https://docs.cbpayapp.com/zh/guides/statement)。

## 9. 端到端国际银行服务

```mermaid
sequenceDiagram
    participant App as 您的应用
    participant CB as CBPay
    App->>CB: POST /v1/banking/customers（资料，一次性）
    CB-->>App: webhook banking_customer_status_changed (approved)
    App->>CB: POST /v1/banking/accounts（USD/EUR 账户）
    App->>CB: POST /v1/banking/operations/prepare（报价，免费）
    App->>CB: POST /v1/banking/operations (idempotency_key)
    CB-->>App: webhook banking_operation_status_changed (completed/failed)
```

银行余额存放在您的银行账户中（与 USDT 分离）；CBPay 只收取已配置
的固定费用。详情：[银行服务](https://docs.cbpayapp.com/zh/guides/banking)。

> **提示**
首次集成？请按照[快速开始](https://docs.cbpayapp.com/zh/quickstart)（注资 → 付款 → webhook）
操作，添加更多产品时再回到本页。
