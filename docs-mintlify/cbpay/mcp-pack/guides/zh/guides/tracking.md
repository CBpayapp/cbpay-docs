---
title: "交易跟踪链接"
description: "每张回单现在都有一个可分享的公开跟踪链接 — Wise 风格的状态时间线、PDF 下载和三种语言，无需登录"
slug: zh/guides/tracking
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/tracking
---
> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

## 功能介绍

平台出具的每张回单（出款、入款、退款、内部转账、兑换、加密货币提现或充值、银行操作、银行卡消费）都有一个**公开跟踪链接**，风格与 Wise 一致：

```
https://business.cbpayapp.com/t/{code}
```

任何持有该链接的人都可以打开页面 — **无需登录、无需 API key** — 查看该交易的实时状态、分步时间线、完整回单详情，并可下载 PDF 回单。

`{code}` 是与回单校验（`GET /verify/receipts/{code}` 及每张 PDF 上打印的二维码）完全相同的 **HMAC 签名代码**。链接*即*凭证：无法被猜测或伪造，且永远只暴露这一笔交易。

## 链接从哪里来

你无需自行构建 URL — 平台会直接提供：

1. **回单载荷中的 `verify_url`。** 当交易到达最终状态时，其回单包含 `verify_url`。启用跟踪器后，该 URL 现在指向 `https://business.cbpayapp.com/t/{code}`。
2. **回单邮件。** 你的客户收到的品牌化回单邮件带有相同的链接（"在线验证" / 跟踪按钮）。
3. **每张 PDF 回单上的二维码**编码了相同的代码 — 扫码即打开跟踪页面。

将链接原样转发给你的客户、支持团队或财务团队。所有持有链接的人看到同一页面。

## 通过 API 获取已有交易的链接

回单和邮件始终带有链接,但你无需下载任何内容即可获取:使用交易的 `kind` 和 `id` 调用 `GET /v1/track-link`,为你自己的 UI 中的**"分享链接"**按钮提供数据。

| 参数 | 类型 | 说明 |
|---|---|---|
| `kind` | string | 交易所属的产品类别:`payout`、`payin`、`payin_refund`、`transfer`、`crypto_withdrawal`、`crypto_deposit`、`swap`、`card_purchase`、`banking_operation`、`wallet_send`、`wallet_deposit` |
| `id` | string | 交易标识符 —— 与该 `kind` 对应的产品端点和 webhook 返回的 `id` 相同 |

```bash
curl -G "https://api.qbank.cl/platform/v1/track-link" \
  -H "Authorization: Bearer $CBPAY_TOKEN" \
  --data-urlencode "kind=payout" \
  --data-urlencode "id=9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
```

响应 `200 OK`:

```json
{
  "track_url": "https://business.cbpayapp.com/t/P9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d8f4a2c1e5b7",
  "code": "P9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d8f4a2c1e5b7"
}
```

`code` 与打印在每张回单上的二维码使用同一个 HMAC 签名代码,因此链接是**确定性的**:对同一交易重复调用该端点始终返回相同的 URL。

**谁可以调用。** 交易所属账户本身(API 密钥或成员会话)、组织管理员和平台管理员 —— 与回单相同的读取范围。范围之外的交易(或未知的 `kind`)统一返回 `404 not_found` 而非 `403`:绝不泄露交易是否存在。缺少 `kind` 或 `id` 时返回 `400 invalid_payload`。

## 页面展示内容

- **状态徽章** — 公开、易读的状态（`completed`、`processing`、`failed`），附操作详情（收款人、参考号、金额、汇率）。
- **时间线** — 每种操作类型有固定的步骤序列（例如出款：*已发起 → 处理中 → 在途 → 已完成*）。只显示真实时间戳：第一步带有创建时间，已到达的最终步骤带有最后更新时间；中间步骤绝不显示虚构的日期。
- **PDF 回单** — 相同的品牌化可验证回单，实时生成，可直接从页面下载。
- **你的品牌** — 你组织的名称、logo、网站和主题色（白标设计）。
- **区块链浏览器链接** — 对于带链上哈希的加密货币交易，提供公开浏览器链接。
- **支持区块** — "这笔转账有问题？"指向你组织的网站。

## 公开 JSON API（构建你自己的跟踪器）

托管页面渲染的相同数据也可以 JSON 形式获取 — 如果你想把跟踪功能嵌入自己的门户而不是跳转到我们的页面，这非常有用：

```bash
curl "https://api.qbank.cl/platform/v1/public/track/P9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d8f4a2c1e5b7?lang=zh"
```

无需认证。一笔已完成出款的响应：

```json
{
  "kind": "payout",
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "completed",
  "status_class": "ok",
  "subtitle": "Venezuela — Pago Móvil",
  "fields": [
    { "label": "交易编号", "value": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "mono": true },
    { "label": "日期和时间", "value": "2026年8月8日 15:29 UTC" },
    { "label": "收款人", "value": "María Pérez" },
    { "label": "银行", "value": "Banco de Venezuela" },
    { "label": "电话", "value": "0414-1234567" },
    { "label": "附言", "value": "Invoice 1042" }
  ],
  "amounts": [
    { "label": "到账金额", "value": "1250000.00 VES" },
    { "label": "汇率", "value": "950.00" },
    { "label": "扣款总额", "value": "1315.79 USDT" }
  ],
  "created_at": "2026-08-08T15:29:00Z",
  "timeline": [
    { "key": "initiated",   "state": "complete", "at": "2026-08-08T15:29:00Z" },
    { "key": "processing",  "state": "complete", "at": null },
    { "key": "in_transit",  "state": "complete", "at": null },
    { "key": "completed",   "state": "complete", "at": "2026-08-08T15:31:12Z" }
  ],
  "branding": {
    "name": "CBPay",
    "logo_url": "https://cdn.cbpayapp.com/branding/cbpay/logo.svg",
    "website": "https://www.cbpayapp.com",
    "accent": "#FBC140"
  },
  "receipt_pdf_url": "https://api.qbank.cl/platform/v1/public/track/P9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d8f4a2c1e5b7/receipt.pdf",
  "whats_next": "payout.done",
  "support": { "website": "https://www.cbpayapp.com" }
}
```

| 字段 | 说明 |
|---|---|
| `kind` | `payout` · `payin` · `payin_refund` · `transfer` · `swap` · `crypto_withdrawal` · `crypto_deposit` · `wallet_send` · `wallet_deposit` · `banking_operation` · `card_purchase` |
| `status` | **公开**状态：平台状态的小写形式 — 见下方防提示表。审核状态绝不对外暴露。 |
| `status_class` | `ok`（completed、credited、confirmed、settled、captured、approved）· `failed`（failed、declined、canceled、rejected、reversed、expired）· `pending`（其余所有）— 决定徽章颜色。 |
| `fields` / `amounts` | 标签/值行。**标签已按 `?lang=` 翻译好**；你的前端只需翻译页面框架和时间线步骤。`mono: true` 标记长值（ID、哈希），用较小的等宽字体渲染。 |
| `timeline[].key` | 步骤的 i18n 键（如 `initiated`、`in_transit`、`credited`）。 |
| `timeline[].state` | `complete` · `in_progress` · `upcoming` · `failed`。 |
| `timeline[].at` | 真实的 RFC3339 时间戳或 `null`。只有第一步（创建）和已到达的最终步骤带日期 — **时间戳绝不虚构**。 |
| `whats_next` | 上下文 i18n 键，告诉接收者接下来会发生什么：`<kind>.done`（ok）、`<kind>.failed`（failed）或进行中的 `<kind>.<当前步骤>`（如 `payout.in_transit`、`crypto_withdrawal.confirming`）。 |
| `explorer_url` | 公开的区块链浏览器 URL — 仅在有真实链上哈希的加密货币交易中出现。 |
| `receipt_pdf_url` | PDF 回单的直接 URL（同一签名代码）。 |

### 公开状态（防提示 / anti tipping-off）

敏感的内部状态在到达公开页面之前会被泛化 — 处于合规审核中的操作不得与正常处理中的操作有所区别：

| 内部状态 | 状态 | 类别 |
|---|---|---|
| `in_review`、`held`、`review`、`on_hold`、`compliance_hold` | `processing` | `pending` |
| `completed`、`credited`、`confirmed`、`settled`、`captured`、`approved` | （小写状态原样） | `ok` |
| `failed`、`declined`、`canceled`、`rejected`、`reversed`、`expired` | （小写状态原样） | `failed` |
| 其他任何瞬时状态（`pending`、`matched`、`broadcasting`……） | （小写状态原样） | `pending` |

### 时间线序列

步骤序列**按操作系列固定** — 接收者对同一产品永远看到相同的步骤：

| 系列 | 步骤 |
|---|---|
| 出款（Payout） | `initiated` → `processing` → `in_transit` → `completed` |
| 入款 — 预报转账（push） | `initiated` → `matched` → `processing` → `completed` |
| 入款 — 二维码 / 代扣 / 银行卡 / 专属账户 | `initiated` → `processing` → `completed` |
| 入款退款 | `initiated` → `processing` → `completed` |
| 内部转账 · 兑换 | `initiated` → `completed` |
| 加密货币提现 / 钱包转出 | `initiated` → `broadcasting` → `confirming` → `completed` |
| 加密货币充值 | `detected` → `confirming` → `credited` |
| 银行操作 | `initiated` → `processing` → `completed` |
| 银行卡消费 | `authorized` → `settled` |

操作进行中时，当前步骤之前的步骤为 `complete`，当前步骤为 `in_progress`，其余为 `upcoming`。操作**失败**时，停下的那一步为 `failed`，之前的步骤为 `complete`，之后的为 `upcoming`。操作**完成**时，所有步骤均为 `complete`。

## PDF 回单端点

```bash
curl -OJ "https://api.qbank.cl/platform/v1/public/track/P9b1deb4d.../receipt.pdf?lang=zh"
```

返回品牌化 PDF 回单（`Content-Type: application/pdf`，`Content-Disposition: attachment`），使用与认证端点相同的渲染器实时生成 — 包括完整的中文渲染（Noto Sans SC 字体）。PDF 端点与 JSON 端点共享相同的按 IP 速率限制。

## 隐私与安全

| 措施 | 说明 |
|---|---|
| **链接 = 凭证** | `code` 使用 HMAC 签名（每笔交易 80 位熵）。无法猜测或枚举，且只能解锁这一笔交易。 |
| **防枚举** | 无效、格式错误或不存在的代码始终返回相同的统一 `404` — 攻击者无法判断代码是否存在。 |
| **速率限制** | 两个端点共享按 IP 的限流；滥用将收到 `429`。 |
| **不被索引** | 所有响应都带 `X-Robots-Tag: noindex` 和 `Cache-Control: no-store`；页面本身声明 `noindex`/`nofollow` meta 标签 — 跟踪页面绝不会出现在搜索引擎中，也不会被缓存。 |
| **中性的链接预览** | 在聊天工具中粘贴链接时，预览卡片只显示你的品牌名称 — 绝不显示金额、对手方或状态。 |
| **防提示** | 合规审核状态绝不公开显示（见上表）。 |
| **与提供商无关** | 页面绝不透露由哪些通道或提供商处理付款。 |

> **重要**
链接即凭证：**任何持有链接的人都能查看该交易**。请只与预期接收者分享，就像你分享 PDF 回单本身一样。
## 语言

页面和 PDF 完全支持三种语言 — **英语、西班牙语和简体中文**：

- 解析顺序（公开链）：`?lang=` / `?locale=`（无效值会被忽略，永不 400），然后是付款人 cookie `cbpay_pay_locale`（HttpOnly=false、Secure、SameSite=Lax、30 天），然后是商户账户，然后是组织 `default_locale`，然后是 Accept-Language，最后是英语。门户 SSR cookie `cbpay_lang` 是另一枚前端 cookie——API 不读取它。
- JSON API 使用同一参数在服务端翻译 `fields`/`amounts` 标签。
- PDF 完全以所请求的语言渲染，包括中文。

## 旧版验证端点（保持不变）

`GET /platform/v1/verify/receipts/{code}` **继续有效** — 无需任何迁移：

- 用**浏览器**打开（带 `Accept: text/html` 的请求）会收到 `302` 重定向到跟踪页面。
- **API 客户端**收到与往常相同的 JSON 载荷。

新回单和回单邮件直接生成跟踪器 URL；在此变更之前出具的回单通过重定向永远有效。

## 错误

| HTTP | `error` | 何时 | 怎么办 |
|---|---|---|---|
| 404 | `not_found` | 代码无效、格式错误或不存在（设计上统一） | 从回单或邮件中重新复制完整链接 — 代码被截断是常见原因。 |
| 429 | `too_many_attempts` | 触发按 IP 速率限制 | 稍等片刻后重试；不要循环轮询该端点。 |

查看[错误参考](https://docs.cbpayapp.com/zh/errors)了解全局错误格式。

## 常见问题

#### 打开跟踪链接需要 API key 或登录吗？
    不需要。URL 中的签名代码就是凭证。这正是通过邮件、聊天或短信与客户安全分享链接的原因。
#### 有人能通过猜测代码枚举交易吗？
    不能。代码使用 HMAC 签名，每笔交易有 80 位熵；无效代码与"有效但不存在"的代码无法区分（统一 404），且按 IP 的速率限制会阻止暴力破解。
#### 为什么交易显示 'processing' 的时间比平时长？
    `processing` 涵盖所有瞬时状态，包括内部合规审核。公开页面有意不区分审核状态 — 操作解决后将变为 `completed` 或 `failed`。
#### 时间线会显示预计日期吗？
    绝不。只渲染真实时间戳：交易创建时间和到达当前最终步骤的时间。中间步骤不显示日期。
#### 我已经集成的旧版 /verify/receipts 链接会失效吗？
    不会。它会继续为 API 客户端返回 JSON，现在还会把浏览器重定向到跟踪页面。两种行为都是永久性的。
#### 我可以隐藏跟踪页面、只保留 JSON 验证吗？
    跟踪器是同一签名代码的公开界面，面向整个平台启用。如果你不想暴露托管页面，只需不分享该 URL — JSON 端点无论如何都会继续工作。
- **电子回单** - 回单如何生成、PDF 布局和验证二维码。
- **错误** - 全局错误目录和响应格式。
