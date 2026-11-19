---
title: "RWA 版税代币"
description: "购买版税代币，按比例获得分配，并将代币兑换为 USDT。"
slug: zh/guides/rwa-royalty-tokens
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/rwa-royalty-tokens
---
RWA 代币代表公开版税项目中的比例权益。API 使用精确的小数字符串；不要发送浮点数。项目会在购买前公布价格、供应量、版税条款、认购窗口和赎回开关。

> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

## 投资者流程

```mermaid
sequenceDiagram
  participant I as 投资者
  participant C as CBPay
  participant P as 项目
  participant W as Webhook
  I->>C: 查询募资项目
  C-->>I: 条款和进度
  I->>C: 使用 USDT 认购
  C->>P: 原子扣款和代币入账
  C-->>I: 完成认购并返回收据
  P->>C: 批准版税周期
  C-->>I: 按比例入账 USDT
  C->>W: rwa_distribution_credited
  I->>C: 赎回 RWA 代币
  C-->>I: USDT 入账和收据
```

## 1. 查找项目

```bash
curl "https://api.qbank.cl/platform/v1/rwa/projects?status=funding&limit=50&page=1" \
  -H "Authorization: Bearer $CBPAY_TOKEN"
```

响应中的 `code`、`status`、`royalty_pct`、`supply_total`、`subscription_price_usdt` 和 `redeem_enabled` 是做决定前应检查的字段。使用 `GET /platform/v1/rwa/projects/{code}` 获取完整条款。状态包括 `draft`、`funding`、`active`、`distributing`、`defaulted`、`redeemed` 和 `paused`。

## 2. 购买代币

请求金额是 USDT 毛额。配置的 `rwa_subscription` 手续费另收，代币数量按净额计算。

```bash
curl -X POST https://api.qbank.cl/platform/v1/rwa/subscriptions \
  -H "Authorization: Bearer $CBPAY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sub-min01-0001" \
  -d '{"project_code":"RWA-MIN01","usdt_amount":"1000.000000","idempotency_key":"sub-min01-0001"}'
```

```json
{
  "subscription_id": "22222222-2222-4222-8222-222222222222",
  "project_code": "RWA-MIN01",
  "usdt_gross": "1000.000000",
  "fee_usdt": "10.000000",
  "usdt_net": "990.000000",
  "tokens_credited": "990.000000",
  "price_usdt": "1.000000",
  "status": "completed",
  "created_at": "2026-11-15T13:00:00Z",
  "receipt_url": "/platform/v1/rwa/subscriptions/22222222-2222-4222-8222-222222222222/receipt"
}
```

认购需要完成身份验证、必要的人类会话 OTP、足够的 USDT 和幂等键。重复使用同一幂等键会返回原始认购，不会重复扣款。

## 3. 在内部二级市场交易

二级市场是同一组织内两个已验证账户之间的 RFQ。创建报价会锁定精确
的代币数量；取消或过期会释放锁定，并且一份报价只能由一个买方成交。

```bash
curl -X POST https://api.qbank.cl/platform/v1/rwa/secondary/offers \
  -H "Authorization: Bearer $CBPAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_code":"RWA-MIN01","quantity":"10.000000","total_usdt":"21.000000","ttl_minutes":60,"idempotency_key":"sec-min01-0001"}'
```

报价会发出 `rwa_secondary_offer_open`。买方使用
`POST /platform/v1/rwa/secondary/offers/{offerID}/accept` 和幂等键接受。
结算是原子的：代币转给买方，约定的 USDT 收益转给卖方，配置的
`rwa_secondary` 百分比加固定手续费由买方承担。账本条目为
`secondary_hold`、`secondary_release`、`secondary_fill`、
`secondary_proceeds` 和 `secondary_charge`。取消或过期发出
`rwa_secondary_offer_closed`，成交发出 `rwa_secondary_filled`。

超时后不要使用新幂等键重试。创建时 TTL 不在 15–1440 分钟范围返回
`400 invalid_ttl`；接受已过期报价返回 `410 offer_expired`。自成交返回
`400`，第二个买方返回 `409`。

## 4. 报告、违约和最终赎回

持有人只能查看已批准的月度报告。期间格式为 `YYYY-MM`，批准后 NAV
和收益率被冻结。服务器使用精确算术验证
`gross_sales = units_sold × realized_price` 以及
`royalty_due = floor(net_payable × royalty_pct / 100)`。maker 提交，
另一名已命名管理员批准或拒绝。

自动违约每天使用 `cure_days` 扫描；`NULL` 表示安全的手动模式。只发送
一次预警，使用 `rwa_default_declared` 的 `stage=prealert`，正式声明使用
`stage=declared`。平台管理员可用 PATCH 修复；如果状态转换仍有效，即使
超过期限也可以修复。证据保留 90 天。

最终赎回使用 `is_final=true` 的 maker-checker 分配。它要求精确的剩余
精确的 cap 剩余金额（包括精确零），escrow 足以覆盖该金额（`>=`），队列清空
且没有未处理报价。项目暂停，未关闭报价被取消，之前的最终提案被 supersede；
批准后支付余额、销毁全部剩余代币并标记
为 `redeemed`。关闭后的销毁会停放等待复核，不会静默入账。

## 5. 查看持仓和分配

```bash
curl "https://api.qbank.cl/platform/v1/rwa/holdings" -H "Authorization: Bearer $CBPAY_TOKEN"
curl "https://api.qbank.cl/platform/v1/rwa/distributions?from=2026-01-01T00:00:00Z&to=2026-12-31T23:59:59Z&page=1" \
  -H "Authorization: Bearer $CBPAY_TOKEN"
```

分配使用 ex-date 快照时的余额。示例信用记录：

```json
{
  "leg_id": "55555555-5555-4555-8555-555555555555",
  "distribution_id": "66666666-6666-4666-8666-666666666666",
  "project_code": "RWA-MIN01",
  "period": "2026-Q4",
  "tokens": "890.000000",
  "share_usdt": "12.500000",
  "fee_usdt": "0.125000",
  "created_at": "2026-11-15T15:00:00Z"
}
```

认购、赎回和分配列表支持 `from`、`to` 和 `page`；每个资源都有详情和 PDF 收据接口。

## 6. 赎回

```bash
curl -X POST https://api.qbank.cl/platform/v1/rwa/redemptions \
  -H "Authorization: Bearer $CBPAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_code":"RWA-MIN01","tokens":"100.000000","idempotency_key":"red-min01-0001"}'
```

```json
{
  "redemption_id": "44444444-4444-4444-8444-444444444444",
  "project_code": "RWA-MIN01",
  "tokens": "100.000000",
  "usdt_credited": "100.000000",
  "price_usdt": "1.000000",
  "status": "completed",
  "created_at": "2026-11-15T14:00:00Z",
  "receipt_url": "/platform/v1/rwa/redemptions/44444444-4444-4444-8444-444444444444/receipt"
}
```

赎回按项目认购价返还 USDT，并原子扣减 RWA 代币。

## 状态、错误和 Webhook

`funding` 在窗口和额度允许时接受认购；`active` 可产生分配；`distributing` 正在处理分配；`paused` 应等待项目恢复；`defaulted` 和 `redeemed` 不接受新认购。

请查看[错误](https://docs.cbpayapp.com/zh/errors)中的 `rwa_window_closed`、`rwa_cap_exceeded`、`rwa_fee_exceeds_amount`、`rwa_redeem_disabled` 和 `rwa_escrow_insufficient`。遇到 timeout 或 5xx 时，先用同一幂等键查询原始资源。

验证 `rwa_subscription_completed`、`rwa_distribution_credited`、
`rwa_redeem_completed`、`rwa_secondary_offer_open`、
`rwa_secondary_offer_closed` 和 `rwa_secondary_filled` 的签名。详见 [Webhook](https://docs.cbpayapp.com/zh/webhooks)。

## 常见问题

#### 代币价格会浮动吗？不会。F1 按项目认购价赎回。#### 失败后可以重新发送吗？遇到 timeout 或 5xx 时，先用同一幂等键查询原操作。#### 为什么分配不按当前余额计算？权益按 ex-date 快照余额计算。#### Bridge 可用吗？不可用。Bridge 属于 F2，不是 RWA F1 功能。
