---
title: "Payout 汇率来源与 FIFO 指示性报价"
description: "了解 lot、blend、spot 定价并预览 FIFO 指示性报价"
slug: zh/guides/payout-rate-sources
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/payout-rate-sources
---
> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

## 汇率来源与 FIFO 指示性报价

Payout 响应可能包含 `rate_source`，用于说明执行市场汇率的来源：

| 值 | 含义 |
|---|---|
| `lot` | 本地金额完全由组织的 FIFO 法币库存覆盖。 |
| `blend` | FIFO 库存覆盖一部分，其余使用现货汇率。 |
| `spot` | 未使用可用的 FIFO 库存。 |

当归因已加载时，创建和详情响应会提供该字段。历史或列表记录可能省略；
它不会改变扣款、费用或 webhook 合约。

### `GET /v1/rates` 中的当前 payout 报价

账户视图的汇率响应仍使用 `rate` 作为 payout 侧字段。它表示下一笔
payout 的可执行市场报价：平台会检查该国家货币最早的开放 FIFO 批次。
如果存在可用库存，`rate_source` 为 `lot`；否则使用 spot，且
`rate_source` 为 `spot`。库存读取失败时也会回退到 spot；payout 扣款本身
仍然 fail-closed。

`payin_rate` 是入金侧报价。在 USDT v1 中，它可以由已结算
`buy_crypto` 交易提供的启用 payin FIFO 批次支持；
`payin_rate_source` 返回 `lot` 或 `spot`。payin create/detail 在加载报价
时可能包含 `rate_source`。银行卡 payin 仍使用 spot。组织管理员 endpoint
使用 `payout_rate`、`payin_rate`、`rate_source` 和 `payin_rate_source`
表达这些来源区别。

```json
{
  "rates": {
    "chile": {
      "currency": "CLP",
      "rate": "910.896551",
      "rate_source": "lot",
      "payin_rate": "955.10",
      "payin_rate_source": "spot"
    }
  }
}
```

这个按国家返回的值是下一笔 payout 的指示性视图。较大的 payout 可能会
消耗多个批次；如需按金额获取指示性报价，请使用下方的可选
`lot_quote`，并以 payout 响应和最终 webhook 作为执行的权威记录。

要预览考虑库存的指示性报价，请为 `GET /v1/rates` 添加 `currency` 和
`amount`：

```bash
curl "https://api.qbank.cl/platform/v1/rates?currency=CLP&amount=100000.00"   -H "Authorization: Bearer <token>"
```

正常 rates 响应可能包含：

```json
{
  "lot_quote": {
    "currency": "CLP",
    "amount": "100000.00000000",
    "market_rate": "13.42150000",
    "rate_source": "blend",
    "marked_rate": "13.28728500",
    "indicative": true
  }
}
```

`lot_quote` 是只读的指示性结果。执行会在扣款事务中锁定库存，因此并发
payout 可能改变结果。`marked_rate` 可选。校验错误作为正常 `200` rates
响应中的值返回：`invalid_amount`、`currency_not_supported` 或
`quote_unavailable`。

报价不保证未来 payout 价格。payout 响应和最终
`payout_status_changed` 事件才是权威记录。对于 payin，报价在异步入账
边界之前固定；FIFO 消费在入账时记录库存归因。库存不足时回退到 spot，
并发送运维告警，但不会改变已经报价的入账金额。

### 报价状态

| 状态 | 含义 | 下一步 |
|---|---|---|
| `indicative` | 报价在没有执行锁的情况下计算。 | 使用相同幂等键创建 payout，并读取执行后的 `rate_source`。 |
| `executed` | payout 响应包含权威归因。 | 保存响应和最终 webhook 用于对账。 |
| `error` | 响应包含 `invalid_amount`、`currency_not_supported` 或 `quote_unavailable`。 | 修正输入或重试只读报价；不要从错误响应创建 payout。 |

### SEPA EUR 汇率键

唯一的欧洲（`EU`）/EUR/`sepa` 路由走廊共享汇率键 `sepa`，其
`currency: "EUR"`。payout 目录对该行返回 `country: "EU"`，受益人的实际
国家取自 IBAN。payout fee 与 FX spread 都解析到 `EU` pricing 行。
`rate_source` 仍表示可执行的 payout 报价来源（`lot` 或 `spot`）；
`payin_rate` 仍是入金侧的 spot 报价。

#### Does this quote reserve inventory?
  No. It is read-only and indicative. The payout debit transaction locks and
  consumes inventory atomically.
#### What should I store for reconciliation?
  Store the payout response and its final `payout_status_changed` event. Use
  `rate_source` as the execution provenance; do not treat `lot_quote` as a
  guarantee.
