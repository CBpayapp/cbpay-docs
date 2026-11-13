---
title: "出金错误与常见问题"
description: "出金错误、拒绝状态与排障"
slug: zh/guides/payout-errors
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/payout-errors
---
> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

## 常见错误

| HTTP | `error` | 应对方式 |
|---|---|---|
| 400 | `idempotency_key_required` | 在请求体或请求头中发送该键 |
| 400 | `beneficiary_required` | 包含 `beneficiary` 对象 |
| 400 | `supporting_document_required` | 美元银行通道转账缺少随附的支持文件 —— 使用 `POST /v1/payouts/documents` 上传并在 `options.supporting_document_key` 中传递（参见[支持文件](https://docs.cbpayapp.com/zh/guides/payout-special-cases#美元转账的强制支持文件)） |
| 400 | `invalid_document_key` | 该 `supporting_document_key` 不属于您的账户 —— 请使用您自己的凭据上传文件并使用返回的 key |
| 402 | `insufficient_funds` | 为账户充值；该出金未被创建 |
| 403 | `account_blocked` | 账户未处于激活状态；请联系 CBPay 团队 |
| 403 | `service_disabled` | 您的账户未启用出金服务 —— 参见[服务](https://docs.cbpayapp.com/zh/concepts/services) |
| 403 | `compliance_hold` | 该出金被保留审核且未被处理（没有资金移动）。API 消息为 `this operation was held for review and was not processed; no funds were moved; contact support with the request reference (X-Request-ID)`。联系支持团队时请复制门户中的引用行（UTC 时间、错误代码和短请求 ID）；参见[错误](https://docs.cbpayapp.com/zh/errors) |
| 422 | `currency_not_supported` | 该货币没有可用的外汇汇率 |
| 422 | （出金处于 `status: failed`） | 通道拒绝了该数据；扣款已退回 —— 修正 `beneficiary` 后使用新的键重试 |
| 503 | `channel_unavailable` | 出金通道暂时不可用；请稍后使用**相同的** `idempotency_key` 重试 |
| 503 | `compliance_check_unavailable` | 无法完成合规校验，也无法将 payout 写入技术筛查队列；请使用**相同**幂等键重试。队列可用时，创建请求返回 `202` 且资源为 `status: pending` |

## 立即拒绝与后续失败

如果处理方在创建时就拒绝了出金，您会收到 `422`，对象处于
`status: failed`，且退款已经完成。如果之后才失败（例如目标账户不存在），
webhook 会以 `status: failed` 送达，自动退款也在那一刻发生。

### 解读失败出金的 `status_code`

| `status_code` | 含义 | 处理方式 |
|---|---|---|
| `core_rejected` | 处理方在创建时拒绝了该操作（收款人数据无效、通道不可用） | 阅读 `status_message`，修正数据后使用新的键创建新出金 |
| `counterparty_rejected` | 银行通道拒绝了收款人本身（US/USD 通道） | 与账户持有人核对收款人的身份与地址信息，然后使用新的键创建新出金 |
| `channel_unavailable` | 出金通道暂时不可用 | 稍后重试；退款（如已扣款）已经完成 |
| *其他代码* | 银行通道在后续阶段拒绝（例如目标账户已注销） | 同上：修正数据后创建新的操作 |
| *（空）* | 通道的一般性失败 | 检查 `status_message`；如仍不清楚，请携带 `payout_id` 联系支持 |

无论哪种情况，退款均已完成 —— 可通过
[账户流水](https://docs.cbpayapp.com/zh/concepts/movements-reconciliation)中的 `payout_refund`
条目进行核实。

> **注**
处于 `processing` 状态的出金无法通过 API 取消：通道已经在处理它。请通过
webhook 或 `GET` 等待最终状态 —— 它一定会到达，失败时会自动退款。
## 常见问题

#### 我的余额什么时候被扣款？
创建时：payout 立即扣款并冻结资金。如果 payout 失败，精确的扣款金额
（含手续费）会自动退回。
#### 可以取消 processing 中的 payout 吗？
不可以 —— 一旦派发到通道，它会自行解析为 `completed` 或 `failed`。订阅
`payout_status_changed` 获取最终状态。
#### 我的 payout 使用哪个汇率？
创建时报价的汇率（以 `fx_rate` 返回），对该笔操作冻结。你约定的点差
已包含在汇率中。
#### 可以用 USDT 以外的余额付款吗？
可以 —— 设置账户级默认值（`PUT /v1/settlement`）或按笔用
`settlement_asset` 覆盖（USDC、BTC、GOLD）。退款返回精确的结算金额，
绝不重新报价。
#### `status: pending` 且 `compliance_pending: true` 是什么意思？
收款人筛查暂时不可用，但 CBPay 已将 payout 持久化到技术筛查队列。
没有扣款、hold 或账本分录，core 尚未被调用，也没有 `receipt_url`。使用相同
幂等键 replay 会返回同一个资源。等待 `payout_status_changed` 或查询
payout；结果为 `process` 时继续，`hold` 时进入防火墙，`rejected` 时
在不扣款的情况下变为 `failed`。
#### compliance_hold（403）是什么意思？
payout 被保留审核且**未被**处理：没有资金移动，你的 `idempotency_key` 也未被消耗。门户会显示可复制的引用行，其中包含 UTC 时间、错误代码和短请求 ID。
联系支持团队时请提供该引用；不会披露具体的合规原因。
#### 超时或 5xx 之后如何安全重试？
用**相同**的 `idempotency_key` 重试：会返回原始 payout
（`idempotency_hit: true`）—— 绝不会重复。新的 key 是一笔全新的独立
payout。
#### 为什么我的美国 ACH/wire/SWIFT payout 一直处于 processing？
创建时就已经返回 `bank_reference`（CBF）。payout 保持 `processing`，直到银行确认人工付款。
预计 ACH 为 24–48 个工作小时，wire/Fedwire 为同一工作日（最长 24 小时），
SWIFT 为 24–48 个工作小时且可能因收款银行而延长。监听
`payout_status_changed` 以获得 `completed` 或 `failed`（已退款）。该通道没有额外的收款人 AML/CFT hold。
出金限额错误见公开错误参考。

## 目的地拒绝保护

部分银行通道会在银行近期拒绝某个目的地后保护该目的地。API 会在创建
payout、扣除余额或消耗幂等键之前返回
`422 destination_recently_rejected`。明确重试使用新幂等键和
`options.destination_retry_ack`；完全相同的请求使用原幂等键重放。目的地
会被规范化，因此改变格式不能绕过保护。

详见[目的地拒绝保护与安全重试](https://docs.cbpayapp.com/zh/guides/payout-destination-retries)，
其中包含完整请求、响应、状态和恢复顺序。

## US/USD 付款用途与校验

对于 `US`/`USD` 银行通道出金（`ach`、`wire` 和 `swift`），
`options.purpose` 为必填。API 不区分大小写，接受下列可见标签或对应代码：

| 可见标签 | 接受的代码 |
|---|---|
| Asset Purchase | `Asset_Purchase` |
| Contract Payment | `Contract_Payment` |
| Dividends | `Dividends` |
| Education Payment | `Education_Payment` |
| Gift/Donation | `Gift_Donation` |
| Investment Purchase | `Investment_Purchase` |
| Invoice Payment | `Invoice_Payment` |
| Loan Payments | `Loan_Payments` |
| Materials Purchase | `Materials_Purchase` |
| Mortgage Payments | `Mortgage_Payments` |
| Payroll | `Payroll` |
| Personal/Family Payment | `Personal_Family_Payment` |
| Professional Service Payments | `Professional_Service_Payments` |
| Reimbursements | `Reimbursements` |
| Remittance | `Remittance` |
| Rent/Utility Payments | `Rent_Utility_Payments` |
| Savings | `Savings` |
| Settlement (Trade) | `Settlement_Trade` |
| Tax Payments | `Tax_Payments` |
| Treasury Movement | `Treasury_Movement` |
| Other (describe below) | `Other` |

只有当 `purpose` 为 `Other` 时才必须提供 `options.purpose_detail`，最长
140 个字符；其他用途提供该字段会被拒绝。创建请求缺少 `purpose` 现在返回
`400 purpose_required`，这是相对于过去默认 `Invoice_Payment` 的不兼容变更。

`beneficiary.account_type` 对 `ach` 和 `wire` 都是必填，值必须为
`checking` 或 `savings`（不区分大小写）；`swift` 不使用此字段。
`wire` 和 `swift` 低于 USD 25 时返回 `422 amount_below_minimum`。
收款人或银行位于附录 B 国家（`CU`、`IR`、`KP`、`SY`）时返回
`422 prohibited_country`。这些校验都在扣款前完成。

规范化错误包括 `invalid_beneficiary`、`invalid_amount`、
`amount_below_minimum`、`prohibited_country`、`purpose_required`、
`invalid_options` 和 `supporting_document_required`。请按 `message`
修正具体字段；拒绝请求不要原样重试，timeout 或 5xx 时使用相同幂等键。

OTC 派发路径仍在内部使用 `Invoice_Payment`，公共 payout 合约不变。
