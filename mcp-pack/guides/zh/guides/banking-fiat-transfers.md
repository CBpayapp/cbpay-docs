---
title: "从 Banking 余额转出本地法币"
description: "从保留的 Banking 余额创建本地法币 payout"
slug: zh/guides/banking-fiat-transfers
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/banking-fiat-transfers
---
> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

使用 `POST /v1/banking/fiat-transfers`，从保留在 Banking 中的余额创建
本地 payout。请求和响应使用与 `POST /v1/payouts` 相同的 beneficiary
和 Payout 结构。使用 `GET /v1/payouts/{payoutID}` 查询，使用
`GET /v1/payouts` 列出，并订阅 `payout_status_changed`。

## 支持的走廊

| 国家 / 货币 | 方式 | Settlement |
|---|---|---|
| `BO/BOB` | `bank_transfer` | `BOB` |
| `MX/MXN` | `bank_transfer` | `MXN` |
| `AR/ARS` | `bank_transfer` | `ARS` |
| `CL/CLP` | `fintoc` | `CLP` |

Settlement 始终是 **identity**：从走廊货币的本地余额扣款。
`settlement_asset` 必须省略或等于该货币；该接口绝不会扣除 USDT。请在
请求体或 `Idempotency-Key` header 中发送幂等键；重放不会再次扣款。

```bash
curl -X POST https://api.qbank.cl/platform/v1/banking/fiat-transfers \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: banking-cl-0001" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "CL",
    "currency": "CLP",
    "method": "fintoc",
    "amount": "2000",
    "beneficiary": {
      "name": "Nicolas Merino",
      "tax_id": "17.629.916-9",
      "bank_code": "016",
      "account_type": "checking",
      "account_number": "72815742"
    },
    "settlement_asset": "CLP"
  }'
```

响应是标准 `Payout`，包含 `settlement_asset: "CLP"` 和
`settlement_rate: "1"`。无效资产返回 `400 invalid_settlement_asset`；
不支持的走廊返回 `422 banking_corridor_unsupported`。合规检查等待时
可能返回 `202` 与 `funds_debited: false`；请保持相同的幂等键并等待对账。

## 状态与错误

| 状态 | 含义 |
|---|---|
| `pending` | 合规检查或轨道处理仍在等待 |
| `processing` | Payout 已接受，正在派发 |
| `completed` / `failed` | 最终结果；查询 payout 和 webhook |

完整错误目录请参阅[错误](https://docs.cbpayapp.com/zh/errors)。

#### 该接口会扣除 USDT 吗？
不会。它从保留的本地 Banking 余额扣款，并以走廊货币进行 identity
结算。
