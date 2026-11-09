---
title: "已保存卡片与订阅"
description: "在持卡人同意下保存卡片，支持一键支付、持卡人不在场扣款（MIT）以及计划性循环订阅"
slug: zh/guides/stored-cards-subscriptions
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/stored-cards-subscriptions
---
> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

> **重要**
账户必须先通过身份审核，才能创建 `card` payin 首次支付、通过
`POST /v1/stored-cards/{storedCardID}/charges` 扣款，或创建订阅。个人账户需要
KYC 获批，企业账户需要 KYB 获批。未获批时，认证请求返回 HTTP
`403 verification_required`。
> **注**
该账户关卡不会阻止付款人的公开托管支付页面，也不会使已经创建的支付链接失效。
`card` 方式支持**存储凭证**（卡组织 COF 规范）：付款人在首次支付时明确同意保存卡片，之后你可以让他们免输卡号一键支付，
或在付款人不在场的情况下自行发起订阅和非定期扣款。卡号**从不存在**于你的集成或本平台：仅存储处理商的不透明引用和
展示数据（卡组织、末四位、有效期）。

**按账户隔离的 COF。** 已保存凭证属于创建它的 CBPay 账户。
`payer_reference` 只是该账户内的客户引用，不是全局身份：另一个账户中
使用相同邮箱或引用也无法发现、列出或扣款。使用其他账户的
`stored_card_id` 会返回与未知凭证相同的通用 `404 not_found`。

### 种子支付：首次支付时提供保存卡片选项

创建 `card` payin 时带上 `save_card: true` 和你的付款人引用：

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BO",
    "currency": "BOB",
    "method": "card",
    "amount": "700.00",
    "save_card": true,
    "payer_reference": "customer-1042",
    "idempotency_key": "topup-7720"
  }'
```

托管页面会显示"保存此卡以便将来支付"复选框。仅当付款人勾选且 3-D Secure 支付获批后才存储凭证。入账时你会收到
`card_stored` webhook，该卡出现在你的列表中。
### 列出付款人的卡片

```bash
curl "https://api.qbank.cl/platform/v1/stored-cards?from=2026-07-01&to=2026-07-20&payer_reference=customer-1042" \
  -H "Authorization: Bearer <token>"
```

```json
{
  "page": 1,
  "page_size": 50,
  "stored_cards": [{
    "stored_card_id": "5f0f2c9e-…",
    "payer_reference": "customer-1042",
    "country": "BO",
    "currency": "BOB",
    "brand": "visa",
    "last4": "2701",
    "expiry_month": "12",
    "expiry_year": "2028",
    "status": "active",
    "created_at": "2026-07-20T18:00:00Z"
  }]
}
```
### 使用已保存的卡支付（付款人在场）

创建带 `stored_card_id` 的 `card` payin：页面跳过卡片录入，显示已保存的卡（`VISA •••• 2701`），3-D Secure 照常
运行 — 付款人只需与其银行确认。付款人保存卡片时填写的**账单信息**也会一并存档：页面自动应用这些信息，只显示脱敏摘要
（姓名、部分邮箱和城市），并提供"使用其他信息"链接以便修改 — 无需重新输入任何内容。这条 server-to-server 路径
无需额外验证：你已认识你的客户。

不知道付款人保存了哪张卡（或是否保存过）？不传 `stored_card_id` 即可：支付页面会让付款人通过邮箱验证码发现自己的
卡片 — 参见[付款人在支付页面上发现自己的卡片](#付款人在支付页面上发现自己的卡片)。

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BO",
    "currency": "BOB",
    "method": "card",
    "amount": "350.00",
    "stored_card_id": "5f0f2c9e-…",
    "idempotency_key": "topup-7721"
  }'
```
### 循环 / 非定期扣款（付款人不在场）

直接对卡片扣款 — 订阅（`recurring: true`）或客户已同意的非定期金额：

```bash
curl -X POST https://api.qbank.cl/platform/v1/stored-cards/5f0f2c9e-…/charges \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "45.00",
    "description": "Monthly subscription",
    "recurring": true,
    "idempotency_key": "sub-2026-07-cust1042"
  }'
```

响应 `201` — 批准的扣款自动入账（`payin_credited` webhook，与任何卡 payin 相同的路径）：

```json
{
  "payin_id": "3c5b002c-…",
  "status": "pending",
  "reference": "3c5b002c-…",
  "transaction_id": "7846012604…",
  "note": "charge approved; the balance is credited automatically (payin_credited webhook)"
}
```

发卡行拒绝时返回 `422`，payin 标记为 `failed` 并带 `failure_reason`。使用相同 `idempotency_key` 的重试返回原
payin，**绝不重复扣款**。

如果处理方调用或本地持久化的结果不明确，平台会将 payin 保持为
`pending`/核对状态并返回核对响应。这是 fail-closed 行为：请使用**相同**
`idempotency_key` 重试，以恢复现有 claim；绝不要生成新键或发送第二笔 MIT
扣款。
撤销已保存的卡（应付款人要求或出于怀疑）：`DELETE /v1/stored-cards/{stored_card_id}` — 扣款立即失效，你会收到
`stored_card_revoked`（之后再尝试扣款返回 `422 stored_card_revoked`）。

> **重要**
付款人不在场的扣款按规范定义**不经过 3-D Secure**：拒付风险由你承担。只扣客户明确同意的金额 — 平台会保存种子支付的
同意证据（复选框、IP 和时间戳）用于争议处理。
## 存档的账单地址（捕获时必需）

每笔 MIT 扣款（无付款人在场）都需要一个**完整的账单地址**：收单机构在授权与捕获之间进行校验，缺少州/省（`administrative_area`）或任何其他账单字段的扣款会在**不扣款**的情况下被拒绝。

- **保存了完整账单信息的卡** — 照常运行，无需任何更改。
- **没有完整账单信息的旧卡** — 扣款被拒绝，返回 `422 core_rejected`（账单地址不完整）且**不扣款**。请让付款人通过 `save_card: true` 重新保存该卡（支付页面会捕获完整地址，包括州/省）。

当支付页面在 `save_card: true` 下运行时，它会要求完整的账单地址，并在国家/地区有 ISO 3166-2 行政区划时把州/省（`administrative_area`）设为必填 — 这样保存的卡从第一天起就可以用于 MIT 扣款。

## 付款人在支付页面上发现自己的卡片

每个银行卡支付页面 — `card` payin 的 `payment_url` 以及通用 checkout 的银行卡选项 — 都把**付款人邮箱作为第一个字段**。
如果该邮箱在你这里保存过卡片，页面会向其发送**验证码**（带有你组织的品牌标识），只有正确输入验证码后才会展示卡片：
品牌、末四位和有效期，绝不显示完整卡号。选择其中一张即可通过 3-D Secure 支付，无需重新输入；也可以选择"使用另一张卡"
用新卡支付。

### 付款人输入邮箱

如果你已在 `customer.email`（或包含邮箱的 `payer_reference`）中提供，页面会预填显示。如果该邮箱没有已保存的卡片，
新卡表单照常进行 — 不会透露任何信息。
### 用验证码验证（每个设备一次）

找到卡片后，页面会向邮箱发送验证码并要求输入。**"记住此设备"**复选框（默认勾选）会让该设备在 **30 天**内保持可信：
之后在该浏览器中用同一邮箱支付时直接展示卡片，无需再输入验证码。
### 选择卡片并支付

邮箱验证通过后，付款人看到脱敏的卡片列表，选择一张后只需完成 3-D Secure。**已验证**的邮箱将成为该笔收款的付款人身份
—— 优先于表单中填写的任何邮箱。
> **注**
信任按设备生效，为期 30 天；每位付款人最多可记住 10 台设备（超过上限时最早的一台会被遗忘）。如果付款人丢失了设备，
支持团队可以撤销其已记住的设备，下次支付时会重新收到验证码。
## 订阅（计划性循环扣款）

与其每月手动扣款，不如让**平台执行排期**：在已存卡上创建订阅 — 首个周期在创建时扣款（除非 `start_at` 为将来时间），
其余按 `interval` 自动触发。

```bash
curl -X POST https://api.qbank.cl/platform/v1/subscriptions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stored_card_id": "5f0f2c9e-…",
    "amount": "45.00",
    "interval": "monthly",
    "description": "Monthly plan",
    "idempotency_key": "plan-cust1042-monthly"
  }'
```

响应 `201`（在创建时扣款首个周期时包含 `first_charge`）：

```json
{
  "subscription_id": "7a1c9e2d-…",
  "stored_card_id": "5f0f2c9e-…",
  "amount": "45.00",
  "currency": "BOB",
  "interval": "monthly",
  "status": "active",
  "period": 1,
  "next_charge_at": "2026-08-20T18:00:00Z",
  "first_charge": { "outcome": "approved", "payin_id": "3c5b002c-…" }
}
```

- `interval`：`daily`、`weekly`、`monthly` 或 `yearly`。保留每月的日期并在短月份夹到最后一天（31 号的计划在 2 月
  28/29 日扣款，3 月回到 31 号）。
- `start_at`（可选，将来的 RFC3339）：推迟首次扣款（试用 / 开始日期）；不填则在创建时扣款。
- **催收（dunning）**：发卡行拒绝时，平台每 24 小时重试最多 3 次；用尽后订阅变为 `past_due`，你会收到
  `subscription_status_changed` webhook。`resume` 以一次新的尝试重新激活。
- 每次成功扣款都像普通卡 payin 一样入账（`payin_credited` webhook，携带 `subscription_id` 以关联到计划）。

生命周期管理：

```bash
# 暂停（停止扣款；恢复不会补扣错过的周期）
curl -X POST https://api.qbank.cl/platform/v1/subscriptions/7a1c9e2d-…/pause -H "Authorization: Bearer <token>"
# 恢复
curl -X POST https://api.qbank.cl/platform/v1/subscriptions/7a1c9e2d-…/resume -H "Authorization: Bearer <token>"
# 取消（终态）
curl -X POST https://api.qbank.cl/platform/v1/subscriptions/7a1c9e2d-…/cancel -H "Authorization: Bearer <token>"
# 列出 / 查询
curl "https://api.qbank.cl/platform/v1/subscriptions?from=2026-07-01&to=2026-07-31&status=active" -H "Authorization: Bearer <token>"
```

撤销已存卡（`DELETE /v1/stored-cards/{id}`）会自动取消其订阅（`cancel_reason: card_revoked`）。
## 订阅状态

| 状态 | 含义 | 处理方式 |
|---|---|---|
| `active` | 每个周期在 `next_charge_at` 扣款 | 无需操作 —— 调度器自动执行 |
| `paused` | 已冻结；错过的周期**不会**补扣 | 就绪后 `POST .../resume` |
| `past_due` | 3 次催缴重试（间隔 24 小时）均失败 | 修复卡片/余额后 `resume` 重新激活 |
| `canceled` | 终态 —— 由 `cancel` 触发或因保存的卡被吊销 | 如有需要创建新的订阅 |

## 错误

| HTTP | 代码 | 处理方式 |
|---|---|---|
| 400 | `idempotency_key_required` | 发送 `idempotency_key`（body 或 `Idempotency-Key` 请求头） |
| 400 | `invalid_amount` | `amount` 必须是正的十进制字符串 |
| 400 | `invalid_interval` | 使用 `daily`、`weekly`、`monthly` 或 `yearly` |
| 400 | `invalid_request` | 货币必须与保存卡片的通道一致 |
| 404 | `not_found` | 保存的卡片 / 订阅不存在或不属于你 |
| 409 | `idempotency_conflict` | 相同 key 但 payload 不同 —— 请使用新的 key |
| 409 | `subscription_state` | 当前状态不允许该操作（例如恢复已取消的计划） |
| 422 | `stored_card_revoked` | 卡片凭证已被吊销；请付款人重新保存 |
| 422 | `core_rejected` | 通道拒绝了扣款 —— 消息中携带原因。当报告**账单地址不完整**（或缺少州/省）时，已保存的卡没有可用的账单地址：请让付款人通过 `save_card: true` 重新保存 |

完整错误目录见[错误](https://docs.cbpayapp.com/zh/errors)。

## 常见问题

#### 你们会存储卡号（PAN）吗？
绝不会。保存卡片存储的是不透明的网络令牌 —— PAN 从不接触平台。吊销
凭证即令牌失效。
#### 为什么周期性扣款不要求 3-D Secure？
商户发起的交易（MIT）按卡组织的规定无需 3DS：付款人在经其同意的首次
支付中已完成 3DS 认证，每笔 MIT 都引用该笔交易。
#### 卡片被吊销后订阅会怎样？
自动取消（`card_revoked`）。付款人需要重新保存卡片，你再创建新的订阅。
#### 暂停会累积扣款吗？
不会 —— 没有补扣：暂停期间经过的周期只推进计数器而不扣款。恢复后仅
从下一个到期周期开始扣款。
#### 扣款被拒时催缴（dunning）如何运作？
调度器最多重试 3 次，每次间隔 24 小时。若全部失败，计划转为
`past_due` 并触发 `subscription_status_changed` —— 在你 `resume` 之前
不再扣款。
#### 第一期什么时候扣款？
创建时同步扣款，除非你传入未来的 `start_at`（试用期）：此时首次扣款
等到该日期。
#### 为什么支付页面要求输入发送到付款人邮箱的验证码？
为了在展示已保存卡片的同时，防止任何知道邮箱的人看到它们：只有通过
验证码验证邮箱（或在已记住的设备上）后才会展示卡片列表。如果该邮箱
没有卡片，页面会直接进入新卡表单。
#### 付款人每次支付都要验证邮箱吗？
不需要：勾选"记住此设备"（默认勾选）后，该浏览器在 30 天内保持可信，
之后用同一邮箱支付时直接展示卡片，无需验证码。超过期限或更换设备后
需重新验证。
