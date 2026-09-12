---
title: "更新日志"
description: "API 与文档变更历史"
slug: zh/changelog
lang: zh
source_url: https://docs.cbpayapp.com/zh/changelog
---
CBPay API 及本文档的每一次变更，最新的排在最前。
破坏性变更会提前公告，并标注为 **Breaking**。

## v2.76 · 2 versions - 2026年9月12日

### v2.76

**变更**

- **Payout 技术筛查队列**：当收款人筛查暂时不可用但队列可用时，
  `POST /v1/payouts` 返回 `202`，资源为 `status: pending`、
  `status_code: compliance_pending`、`compliance_pending: true` 与
  `funds_debited: false`。等待期间不会创建 hold、账本分录、core 派发或
  `receipt_url`。相同幂等键 replay 返回同一个 payout。`process` 继续正常
  流程，有效 `hold` 进入防火墙，`rejected` 在不扣款的情况下将队列中的
  payout 结束为 `failed`。

### v2.75

**变更**

- **Payout 状态 webhook** 现在会在 `status` 和 `status_code` 旁边返回可选的
  `status_message`。该值已规范化并清理；没有额外详情时可以为空，且不会暴露
  上游服务商身份。

## v2.74 · 1 个版本 - 2026年9月11日

### v2.74

**变更**

- **Collect 与托管 checkout 的合规暂留**现在在付款人扣款前发生。批准只
  释放审核；使用相同的幂等上下文重试同一个 collect 请求。不明确的
  timeout/5xx 会保持 pending 并等待 webhook 对账，绝不会自动重发。
  新增 `checkout_not_pending` 冲突说明，并记录只有证件的付款人应作为
  独立身份 screening（`document_value`/`idNumber`，而非 `name`）。
- **交易筛查现在区分已识别的 AML 类别与模糊候选结果**：已识别的类别在
  `target=true` 或 `target=false` 时仍可触发行动。当 `target=false` 且 AML
  类别未被识别时，结果不可触发行动，也不会产生错误的暂留或错误响应。
  缺少 `target` 的旧版响应，以及不完整或格式错误的响应，仍然采用
  fail-closed 行为。

## v2.73 · 1 个版本 - 2026年9月10日

### v2.73

**新增**

- **EUR 虚拟 IBAN**：账户可以用幂等键申请持久化的
  `funding_usdt` 或 `banking_eur` vIBAN，支持人工批准、状态查询、日期
  列表和 ownership 校验。终态入金现在按用途进入对应资金路径。
- **Returns 和 recalls**：`returned`、`recalled` 和 `reversed` 幂等对账。
  Funding chargeback/refund 与 Banking EUR reverse entry 均为 append-only；
  后续 completion 不会复活已 returned 的 operation。

## v2.72 · 1 个版本 - 2026年9月9日

### v2.72

- **Recovery contract**：新增核心幂等状态路由和组织运营对充值账户
  歧义 claim 的 reconciliation 路由。Recovery 采用 fail-closed，并使用
  `deposit_account_not_recoverable`、`idempotency_conflict` 与 recovery
  lease fence。平台管理员 adoption 是独立的最后恢复操作，不是幂等
  replay；要重放已核验的 core fence，请使用 reconciliation。

**变更**

- **企业多个 CLABE**：企业账户可以创建多个
  `MX`/`MXN`/`bank_transfer` 充值目的地。每个目的地仍绑定同一

  账户，并按目的地入账。企业创建必须提供幂等 key：新 key 返回
  `201`，完成后重放返回 `200` 并带 `idempotency_hit: true`，处理中重放
  可能返回 `409 idempotency_conflict`。个人账户和 legacy 通道仍然
  每个通道一个目的地；列表现在支持分页。

账户，并按目的地入账。创建支持幂等：新 key 返回 `201`，完成后
  重放返回 `200` 并带 `idempotency_hit: true`，处理中重放可能
  返回 `409 idempotency_conflict`。个人账户和 legacy 通道仍然
  每个通道一个目的地；列表现在支持分页。

**BOB 虚拟收款账户**：payin 目录现在记录
  `BO/BOB/bank_transfer` 专属收款账户流程，包括创建/列表、轮询对账、
  `payin_credited`、错误和 provider-agnostic 的 BOB payout 合同。

## v2.71 · 3 个版本 - 2026年9月6日

### v2.71

**变更**

- **欺诈与身份报告明确声明征信覆盖**：没有征信证据时，报告仍可能以
  `THIN_FILE` 就绪，包括明确的无数据源情况。PDF 现在声明来源新鲜度
  （`live` 或 `unavailable`）和记录数量。传输、认证、存储、契约无效以及
  非空 `sources_failed` 仍通过现有 recovery/退款路径 fail-closed。

### v2.70

**新增**

- **最终银行恢复语义**：记录 `400 idempotency_key_mismatch`、不会终结 claim 的提供商 `401`/`403`、基于 `ProviderID` 的所有权验证、无需再次调用提供商的完成重放、稳定恢复锁，以及公共/平台 body key 不转发。

- **欺诈与身份报告**：新增 `POST/GET /v1/qscore/fraud/reports`、认证 detail/PDF、四个 purpose、幂等计费与失败退款、签名 `risk_fraud_score_ready` webhook、best-effort 邮件和 `/verify/qscore-fraud/{code}` 公开验证。
- **Qscore Index**：新增 `/v1/qscore/index` 和 `/v1/qscore/index/account` 的季度快照、国家/行业筛选以及至少五个主体的匿名桶。

### v2.69

**新增**

- **您的 `idempotency_key` 会随 webhook 返回**。您使用幂等键创建的资金操作，
  其账户 webhook 现在会在负载中以 `idempotency_key` 字段将其带回——无需额外
  GET 即可将通知与您自己的参考号对账。覆盖事件：`payout_status_changed`、
  `payin_credited`、`payin_settlement_scheduled`、`payin_expired`、
  `payin_refunded`、`crypto_withdrawal_status_changed` 和
  `wallet_send_status_changed`。该字段为可选：当操作未携带键创建时省略，
  平台内部键永远不会暴露。`transfer_received` 不携带该字段。payin 资源在
  `GET /v1/payins/{id}` 中也会返回该字段。参见
  [webhooks](https://docs.cbpayapp.com/zh/webhooks) 和 [幂等性](https://docs.cbpayapp.com/zh/concepts/idempotency)。

## v2.68 - 2026年9月4日

### v2.68

**Breaking**

- **委内瑞拉的拉取式收款（`c2p` / `debito_inmediato`）已不再提供**。
  在 VE/VES 通道上创建拉取式收款现在会返回该通道不受支持，且结账报价
  不再列出任何 `collect: true` 选项。collect 端点仍保留在 API 中，标记为
  已弃用（deprecated）。向委内瑞拉的对外付款（`pago_movil`、
  `bank_transfer`）不受影响 —— 且 `pago_movil` 仍要求 `beneficiary.name`
  （自 v2.66 起不变）。参见 [payins](https://docs.cbpayapp.com/zh/guides/payins) 与
  [checkout](https://docs.cbpayapp.com/zh/guides/checkout)。

## v2.67 · 2 个版本 - 2026年9月3日

### v2.67

**已修复**

- **以卡支付的收银台和 POS 收款现在遵循银行卡结算延迟**。当您的
  `payin_card` 费用配置了大于零的 `settlement_hours` 时，以**银行卡**
  支付的托管收银台链接或 POS 收款与直接银行卡收款行为完全一致：立即
  确认为 `credited` 并关闭为已支付，但**余额**到 `settle_at` 才到账
  （在此之前携带 `settlement_pending: true`，可由机构管理员提前释放）。
  此前这些收款计收银行卡费用但却立即入账。通过 QR、加密货币、CBPay
  应用或 fintoc 支付的收款仍立即入账。API 和 webhook 的结构均未变化。
  详见[费用——银行卡收款结算延迟](https://docs.cbpayapp.com/zh/concepts/fees#银行卡收款结算延迟)。

### v2.66

**已变更**

- **委内瑞拉 `pago_movil` payout 现在要求 `beneficiary.name`**。通道要求受益人的名 + 第一姓氏（与证件一致）—— 单个词会被拒绝。[payout 指南](https://docs.cbpayapp.com/zh/guides/payouts)和 API 参考示例现在将 `name` 列为必填字段的第一项。委内瑞拉 `bank_transfer` 此前已记录 `name`；此处无变更。

## v2.65 - 2026年9月2日

### v2.65

**已修复**

- **委内瑞拉 payout：即使 payout 在创建时已同步变为 `failed`，通道的失败原因（`ERR-XXX`）现在也会到达 `GET`**。当 VE 的 `pago_movil` / `bank_transfer` payout 在创建时被同步标记为 `failed`，而通道随后通过 webhook 报告原因时，平台会将其持久化：payout 的 `GET` 在 `status_code` / `status_message` 中显示通道真实的 `ERR-XXX` 代码（此前由于 payout 已为 `failed`，webhook 会被丢弃）。这是仅元数据的补充：不会二次退款，也不会改变状态。

## v2.64 - 2026年8月21日

### v2.64

**新增**

- **签名证明 —— 使用钱包签名消息（EIP-191 / TIP-191）。** 通过对结构化反钓鱼信封（域名、用途、账户、nonce 以及 10 分钟有效期窗口 —— 绝不是自由格式消息）的加密签名来证明对钱包的控制。两种流程：通过 `POST /v1/segregated-wallets/{walletID}/signatures` 对**隔离钱包**进行服务端签名（成员会话需要 OTP 验证），以及通过 `POST /v1/wallet-links/challenges` + `POST /v1/wallet-links/verify` 以签名挑战**绑定外部钱包**（MetaMask、TronLink）。指南：[签名证明](https://docs.cbpayapp.com/zh/guides/signature-proofs)。
- **证明管理。** `GET /v1/signature-proofs`（分页，支持 `from`/`to`/`status`/`purpose` 筛选）、`GET /v1/signature-proofs/{proofID}` 和 `POST /v1/signature-proofs/{proofID}/revoke`。已绑定的钱包通过 `GET /v1/wallet-links` 列出，通过 `DELETE /v1/wallet-links/{linkID}` 撤销。
- **公开验证。** 每个证明都带有 `proof_code` 和 `verify_url`；任何人都可以在 `GET /v1/public/signature-proofs/{code}` 无需身份验证即可验证 —— 状态、有效期窗口、链、地址以及（已签名时）签名和消息哈希。
- **Webhook `wallet_signature_created` 和 `wallet_linked`。** 在创建证明和绑定外部钱包时发出。参考：[Webhooks](https://docs.cbpayapp.com/zh/webhooks)。
- **每次服务端签名都会发送安全邮件。** 账户持有人会收到一封品牌化邮件，其中包含每次签名的钱包、链、用途和时间戳。

## v2.63 - 2026年8月20日

### v2.63

**修复**

- **`verifications_unavailable` 的提示不再声称已退还费用。** 身份验证返回 503 并不意味着退款：验证文档接口从不收费，自助入驻也不收取任何费用。该提示现在仅建议稍后重试。参考：[错误](https://docs.cbpayapp.com/zh/errors) 与 [KYC 指南](https://docs.cbpayapp.com/zh/guides/kyc)。

## v2.62 - 2026年8月19日

### v2.62

**变更**

- **当账单国家/地区要求时，托管卡支付页面现在强制填写账单州/省。** 对于捕获卡扣款时 ISO 3166-2 行政区为必填的国家（例如美国、加拿大、巴西），现在会向付款人显示必填的**州/省**字段，选项来自行政区目录；该值作为账单地址的 `administrative_area` 传输。无强制行政区的国家仍保持该字段可选。指南：[银行卡支付](https://docs.cbpayapp.com/zh/guides/payins)。
- **已保存卡（MIT）扣款在发起前校验账单地址。** 保存时已带完整账单地址的卡照常工作。如果已保存的卡没有可用的账单地址，扣款将被拒绝并返回 `422 core_rejected`，消息会提示付款人通过 `save_card: true` 重新保存该卡 —— 不会发生资金变动。指南：[已保存的卡片与订阅](https://docs.cbpayapp.com/zh/guides/stored-cards-subscriptions)。

**修复**

- **因缺少账单州/省而导致"已授权但从未捕获"的卡交易不会再发生。** 账单地址会被提前校验 —— 托管页面上对付款人校验，已保存卡扣款在发起前校验 —— 行政区名称会被规范化为通道要求的 ISO 3166-2 代码（例如 "California" → `CA`）。

## v2.61 - 2026年8月17日

### v2.61

**新增**

- **账户 locale `en` / `es` / `zh`。** `GET /v1/me` 现在返回 `locale`。`PATCH /v1/me` 发送 `{ "locale": "en" | "es" | "zh" }` 即可持久化；空字符串存为英语；其他非空值返回 `400 invalid_locale`（`"locale must be en, es or zh"`）。新账户在创建时选择 locale（请求体，然后是 `Accept-Language`，然后是组织的 `default_locale`，最后是英语）。指南：[语言与 locale](https://docs.cbpayapp.com/zh/guides/locale)。

**变更**

- **面向人的界面默认英语。** 托管页面（收银台、公开 tracker、收据、状态页、Qscore 印章、核验报告）、收据/对账单 PDF 以及 CSV **表头** 解析为 `en`，除非有效的 `?lang=` / `?locale=`、账户资料、组织默认值或 `Accept-Language` 另有指定。无效的 query locale 会被忽略（绝不会 `400`）。API JSON 与 webhook 仍为英语。
- **付款人 cookie `cbpay_pay_locale`**（30 天，`Secure`，`SameSite=Lax`）用于公开页面；不会翻译 JSON。
- **既有账户保持西班牙语。** 部署时的一次性步骤会为尚无 locale 的账户写入 `locale=es`，以免现网西语客户被切到英语。新账户仍默认英语。

## v2.60 - 2026年8月12日

### v2.60

**变更**

- **US ACH、wire 与 SWIFT 立即返回 `bank_reference`。** 创建响应保持 `processing`，并已带上受益人（以及你）可与银行核对的 CBF 参考号。银行确认后 payout 才会完成 — 请监听 `payout_status_changed`。其他通道的 `bank_reference` 仍在渠道报告前为空。

## v2.59 - 2026年8月11日

### v2.59

**变更**

- **美元银行通道付款：收款人可居住在任何国家**
  （[付款指南](https://docs.cbpayapp.com/zh/guides/payouts)）：对于 `ach`、`wire` 和 `swift`
  转账，收款人的 `country_code` 不再固定为 `US` —— 例如，可以为居住在德国的人
  向美国银行账户发起 ACH。对于 `ach`/`wire`，接收银行必须在美国
  （`bank_country: "US"` —— 国内通道不向境外银行付款）；对于 `swift`，银行可位于
  任何国家。仅当收款人居住在美国时才要求 `state`。附录 B 司法管辖区
  （CU/IR/KP/SY）对收款人和银行所在国家均保持封锁。
- **每笔美元银行通道转账均要求支持文件**：通过 `ach`、`wire` 和 `swift`
  发起的美元付款始终要求先通过 `POST /v1/payouts/documents` 上传支持文件
  （发票/收据），无论收款人所在国家 —— 此前该要求取决于国家。缺少文件将返回
  `400 supporting_document_required`。

## v2.58 · 3 个版本 - 2026年8月10日

### v2.58

**变更**

- **配置结算延迟的银行卡收款会立即确认为 `credited`**
  （[费用](https://docs.cbpayapp.com/zh/concepts/fees#银行卡收款结算延迟)）：当
  `settlement_hours > 0` 时，已支付的银行卡收款现在会在**付款时**变为
  `status: credited` —— `payin_credited` webhook 立即发出，以卡支付的收银台
  链接随即关闭为已支付。等待的只有**余额**：它在到达 `settle_at` 时进入您的账本
  （结算 worker 每分钟运行一次），或由机构管理员提前手动释放。此前收款会保持
  `pending`，且 `payin_credited` 仅在结算时才发出。
- **收款新增字段**：余额排期期间，create/GET/列表响应携带
  `settle_at`（RFC 3339）和 `settlement_pending: true`；余额到账后则携带
  `settled_at`。
- **`payin_settlement_scheduled` 负载**：该 webhook 现在报告
  `status: "credited"`（原为 `pending`），与即时确认保持一致。

**新增**

- **新错误 `settlement_pending`**（`422`）：对余额仍在结算排期中的银行卡收款
  发起退款将被拒绝，直到资金释放（到达 `settle_at`，或由机构管理员提前释放）。
  详见[退款](https://docs.cbpayapp.com/zh/guides/refunds)。

### v2.57

**新增**

- **新 webhook 事件 `payin_settlement_scheduled`**：当您的组织为银行卡 payin
  配置了延迟结算（`settlement_hours > 0`）时，已支付的银行卡 payin 会保持
  `pending` 状态，并带有未来的 `settle_at`，直到结算 worker 释放资金。
  从现在起，付款确认的那一刻您将收到恰好一次的
  `payin_settlement_scheduled`（幂等——重试不会重复发送），其中包含完整报价：
  `usdt_gross`、`fee`、`usdt_net`（到期时将入账的金额）、`settle_at` 和
  `receipt_url`。此前唯一的信号只是 payin 处于 `pending` 而没有任何确认。
  到期时，worker 会入账余额并照常发送 `payin_credited`。订阅方式与任何账户事件相同：
  `event_type: "payin_settlement_scheduled"`。

### v2.56

**变更**

- **银行余额新增中性摘要字段**：`GET
  /v1/banking/accounts/{bankAccountID}/balance` 和 `GET
  /v1/banking/third-parties/{thirdPartyID}/accounts/{bankAccountID}/balance`
  现在在（不变的）`balance` 对象之外返回三个可选的顶层字段：`available` 和
  `held` 为平面小数字符串（如 `"1250.00"`、`"0.00"`），`currency` 为 ISO
  4217 货币代码（如 `"USD"`）。这是读取金额的推荐方式——此前金额仅嵌套在通道原生的
  `balance` 对象内，其结构因通道而异。`balance`
  对象保留完整的账户详情（显示名称、收款要素）。

## v2.55 · 6 个版本 - 2026年8月9日

### v2.55

**新增**

- **可配置的银行卡收款结算延迟**
  （[费用](https://docs.cbpayapp.com/zh/concepts/fees#银行卡收款结算延迟)）：`payin_card`
  服务的费用配置现在接受 `settlement_hours` 字段（整数 ≥ 0，默认 `0`
  = 立即入账，与之前完全一致）。配置延迟后，已批准的银行卡扣款会使收款保持
  `pending` 状态，并在创建、详情和列表响应中返回新的 `settle_at`
  时间戳（RFC 3339）——余额入账、`payin_credited` webhook、
  收银台链接关闭和自动兑换全部在 `settle_at`
  时发生（worker 每分钟结算一次到期的收款）。在批准或分配时已超过期限的收款会立即入账。对任何其他服务发送
  `settlement_hours`（或负数）将返回 `400 invalid_settlement_hours`。
- **按通道计收的银行费用**
  （[费用](https://docs.cbpayapp.com/zh/concepts/fees#按通道计收的银行费用)）：新增五个交易型费用服务
  —— `banking_deposit`、`banking_transfer_ach`、
  `banking_transfer_swift`、`banking_transfer_wire` 和
  `banking_transfer_sepa` —— 按百分比 + 固定费用计收，以操作货币
  （`BANK_USD` / `BANK_EUR`）收取。存款在入账时收取
  （以存款金额为上限，小额存款不会出现负数）；转出转账在发起时收取，
  并强制执行 `余额 >= 金额 + 手续费`
  的校验，若转账被最终拒付则退还手续费。未配置特定通道时回退到旧的
  `banking_operation` 服务；通道配置为 0% + 0 固定费用表示明确免费，
  不会回退。

### v2.54

**变更**

- **日期筛选器现在使用贵组织的时区**：平台所有列表（payouts、payins、
  加密货币提现、银行转账、费用、对账单、分析、收入）的 `from`/`to`
  日期筛选器（`YYYY-MM-DD`）现在按贵组织的时区解释日期，而不再使用
  UTC。`from` 为该日期在您时区的午夜（含），`to` 为次日午夜（不含）。
  时区是组织级设置（`timezone`，IANA 名称），由平台管理——默认为
  `America/New_York`——当前值通过 `GET /v1/branding` 以 `timezone`
  字段暴露。分析与收入的每日分桶也按贵组织的民用日聚合。请求格式
  未变：仅 `YYYY-MM-DD` 筛选器所覆盖的日历日发生变化。

### v2.53

**新增**

- **Qscore 可验证公开印章**（[印章指南](https://docs.cbpayapp.com/zh/guides/qscore-seal)）：
  等级为 A 或 B 且评估新鲜（不超过 90 天）的企业账户可以激活公开可验证印章 ——
  `POST /v1/qscore/my-seal`（设计上幂等：重放返回 200 及当前印章），
  通过 `GET /v1/qscore/my-seal` 查询，随后分享公开页面或嵌入实时 SVG 徽章
  （`badge_url`）。页面和徽章在每次访问时实时重新评估资格：若分数降至 B
  级以下或评估超过 90 天，印章将切换为"已失效"——绝不透露原因或数字分数
  （反预言机）。持有人可随时通过 `DELETE /v1/qscore/my-seal` 撤销；撤销对该印章
  永久生效，并可立即激活新印章。新增公开端点：`GET
  /platform/verify/qscore/seal/{code}`（JSON，或面向浏览器的品牌化 HTML
  页面）和 `GET /platform/verify/qscore/seal/{code}/badge.svg`（可嵌入实时
  徽章）。新增错误码：`seal_companies_only`、`seal_not_eligible` 和
  `no_active_seal`。无新增 webhook。

### v2.52

**新增**

- **Qscore 授权链接（持有人授权）**（[授权链接指南](https://docs.cbpayapp.com/zh/guides/qscore-consents)）：
  通过可分享的链接请求主体授权读取其银行数据 —— `POST /v1/qscore/consents`
  （幂等，可选择以您的品牌将链接发送至持有人邮箱），随后通过
  `GET /v1/qscore/consents` 和 `GET /v1/qscore/consents/{id}` 跟踪状态，
  或通过 `POST /v1/qscore/consents/{id}/revoke` 撤销。持有人在公开页面
  （无需登录）上作出决定：通过安全组件连接其银行，银行核实的持有人身份
  必须与主体的证件完全一致（他人证件下的账户永远无法授予授权）。授权后，
  CBPay 会将正面银行事实（账户、余额、90 天收支活动）派生至主体的信用档案 ——
  Qscore 报告在每次生成时都会重新派生这些数据以保持新鲜。新增 webhook：
  `risk_consent_granted` 和 `risk_consent_revoked`。新增错误码：
  `purpose_required`、`invalid_purpose`、`invalid_doc_id`、
  `invalid_subject_type`、`invalid_email`、`already_decided`、
  `link_inactive` 和 `holder_mismatch`。

### v2.51

**新增**

- **Qscore 批量评分(组合评分)**([批量评分指南](https://docs.cbpayapp.com/zh/guides/qscore-batch)):
  通过 `POST /v1/qscore/batches` 上传一批主体 —— JSON 数组或 CSV 字符串,
  每批最多 5,000 个 —— 平台将异步为每个主体出具一份完整的 Qscore 报告。
  行在创建时即完成校验(无效证件号、不支持的 `subject_type` 以及批内重复项
  会在 `rejected_items` 中报告且不予处理);每个条目在处理时收取相应的
  独立报告费用,若发生终态失败则自动退款。批次完成后,您将收到一个
  `risk_batch_completed` webhook 和一封包含计数器的邮件 —— 单个报告不再
  单独发送 webhook 或邮件。通过 `GET /v1/qscore/batches/{batchID}/items`
  读取逐条结果,或通过 `GET /v1/qscore/batches/{batchID}/results.csv`
  下载。新增错误码:`no_valid_items` 和 `too_many_items`。

### v2.50

**新增**

- Qscore 企业报告现在可能包含 `peer_benchmark` 块：评分在其行业细分中的相对位置（相同国家、相同 ISIC 行业）。报告包含行业代码与名称（`segment_code`/`segment_label`）、可比企业数量（`peers`）、`percentile`（评分更低的同业占比）以及该细分的 `median_score`（评分中位数）。该块仅在至少有 5 家可比企业时发布，且仅适用于企业报告。

## v2.49 · 9 个版本 - 2026年8月8日

### v2.49

**新增**

- **Qscore —— 您自己的信用报告,免费**([Qscore 指南](https://docs.cbpayapp.com/zh/guides/qscore)):已验证账户的
  持有人现在可以获取其本人的 Qscore 信用报告 —— 即 ARCO / 数据保护访问权 ——
  通过 `POST /v1/qscore/my-report`(可选 `{"lang":"es"|"en"|"zh"}`)生成,
  通过 `GET /v1/qscore/my-report` 读取最新报告,并通过
  `GET /v1/qscore/my-report/pdf` 下载品牌化 PDF。与购买的报告不同,自助报告
  **免费**(不收取费用),主体身份来自账户已验证的 `tax_id`(请求从不接受
  `doc_id` —— 通过这些端点获取第三方报告在设计上是不可能的),每 30 天可生成
  一份新报告(在该时间窗口内将返回现有报告并带 `idempotency_hit: true`),
  且自助报告不计入主体的查询次数,因此查看您自己的报告绝不会影响您的评分。
  自助报告的 `risk_report_ready` webhook 会携带 `purpose: "self_access"`。
  商业端点 `POST /v1/qscore/reports` 现在会拒绝 `purpose: "self_access"`,
  返回 `400 invalid_purpose`。新增错误码:`kyc_required`、`no_tax_id`、
  `invalid_tax_id`([错误](https://docs.cbpayapp.com/zh/errors))。

### v2.48

**变更**

- **银行与开卡申请现在可被挂起审核**([银行指南](https://docs.cbpayapp.com/zh/guides/banking)、[开卡指南](https://docs.cbpayapp.com/zh/guides/cards)、[交易审核](https://docs.cbpayapp.com/zh/guides/transaction-reviews)):如果您所在的组织启用了申请审核,`POST /v1/banking/customer`、`POST /v1/banking/third-parties` 和 `POST /v1/cards` 可能会返回 **`202 Accepted`**(`{"status":"in_review","kind":"...","review_id":"..."}`),而不是立即创建资源——在合规团队批准审核之前,不会发送任何内容进行处理。开户/发卡费用在申请被挂起时收取,若被拒绝将**自动退还**。使用相同 `idempotency_key` 的重试会返回同一审核(`idempotency_hit: true`),绝不会重复收费。通过 `txn_review_status_changed` webhook 或在[交易审核](https://docs.cbpayapp.com/zh/guides/transaction-reviews)(类型 `banking_application` / `card_application`)中跟踪结果。

### v2.47

**新增**

- **Qscore —— 主体持续监控**([Qscore 指南](https://docs.cbpayapp.com/zh/guides/qscore)):当你已持有某主体的
  `ready` 报告后,可通过 `PUT /v1/qscore/subjects/{docID}/monitoring` 订阅监控,
  平台每约 5 分钟重新评估该主体,当评分跌破你的 `monitor_since_score` 阈值
  (`score_drop_below`)、征信出现新记录(`new_records`)或记录被移除
  (`records_removed`)时,发出新的 webhook `risk_monitoring_alert` —— 设置
  `only_material: true` 后仅触发重大变更。可通过
  `GET /v1/qscore/subjects/{docID}/monitoring`、`GET /v1/qscore/monitoring`
  (账户下所有被监控主体)和 `DELETE /v1/qscore/subjects/{docID}/monitoring`
  (停用,`active: false` —— 历史记录永不删除)管理订阅。监控免费,但需要先购买
  该主体的报告:否则 API 返回 `403 report_required`,与主体不存在时的响应相同
  (有意设计,防止探测主体是否存在)。新增错误码:`report_required`([错误](https://docs.cbpayapp.com/zh/errors))。

### v2.46

**新增**

- **付款的银行参考号现已覆盖所有界面**([付款指南](https://docs.cbpayapp.com/zh/guides/payouts)):每笔付款都会展示
  `bank_reference` —— 收款银行/通道分配的交易号 —— 包括 `POST /v1/payouts`、
  `GET /v1/payouts` 和 `GET /v1/payouts/{payoutID}` 的响应、
  `payout_status_changed` webhook 负载、PDF 回执、付款 CSV 导出以及对账单
  (JSON 和 Excel)。付款处理中该字段为空(`""`),付款完成后即为收款人
  可用来与银行核对付款的参考号。

### v2.45

**新增**

- **Qscore — API 优先的信用局**([Qscore 指南](https://docs.cbpayapp.com/zh/guides/qscore)):购买个人
  和企业的信用报告(`POST /v1/qscore/reports`),首先在智利上线。每份报告将
  负面记录、劳动和社保背景、未缴票据及官方公报发布汇总为 0–1000 的评分,
  等级为 A–E(无数据时为 `SC`),并附原因代码、品牌化 PDF 和公开验证码。
  `GET /v1/qscore/subjects/{docID}/score` 读取你已出具报告主体的当前评分,
  `GET /v1/qscore/reports/{reportID}/pdf` 下载 PDF,数据主体更正(ARCO)流程通过
  `POST /v1/qscore/subjects/{docID}/disputes` +
  `GET /v1/qscore/disputes/{disputeID}` 运行。报告按证件类型计费
  (`risk_report_person` / `risk_report_company`),并依法要求声明 `purpose`。新增 webhook:
  `risk_report_ready` 和 `risk_score_changed`。需要 `risk` 服务标志。
- **报告公开验证**:`GET /v1/verify/qscore/{code}` 验证印在 Qscore 报告上的
  验证码,返回非敏感事实(主体类别、等级、签发日期)— 不含 PII。
- 新增错误码:`purpose_required`、`invalid_purpose`、`invalid_doc_id`、`invalid_subject_type`、
  `no_score`、`pdf_not_ready`([错误](https://docs.cbpayapp.com/zh/errors))。

### v2.44

**修复**

- `payin_received` 事件不再针对运营方资金库账户的内部银行冲正生成
  （自身出金交易的冲正从来都不是客户付款）。

### v2.43

**变更**

- **城市目录质量改进**([AML 目录指南](https://docs.cbpayapp.com/zh/guides/aml)):
  `GET /v1/aml/catalogs/cities?country=<CC>` 返回的城市数据已重新生成,
  覆盖更完整、拼写更准确。名称保留本地拼写(重音符号、`ñ`、`ü` ——
  如 "Alhué"、"Coyoacán"、"São Paulo"),本地名称取代英文外来名(如
  "Ciudad de México" 而非 "Mexico City"),城市辖区覆盖完整 ——
  圣地亚哥所有 comuna、利马各区、墨西哥城各 alcaldía 以及整个地区的
  市镇。同时清理了源数据噪音(美国普查后缀如 "Abanda CDP"、残留的
  行政前缀、重复拼写)。响应结构与错误码不变 —— 无需调整集成。

### v2.42

**新增**

- **通过 API 获取跟踪链接**([跟踪指南](https://docs.cbpayapp.com/zh/guides/tracking)):新增的认证端点
  `GET /v1/track-link?kind=<kind>&id=<id>` 返回你读取范围内任意交易的可分享公开跟踪链接
  —— `{ "track_url", "code" }` —— 无需下载回单 PDF。这是你 UI 中"分享链接"按钮的基础组件。
  `code` 与每张回单上打印的 HMAC 确定性代码相同,因此同一交易的链接始终不变。账户本身、
  组织管理员和平台管理员均可使用;范围之外的交易统一返回 `404 not_found`。

### v2.41

**新增**

- **每笔交易的公开跟踪链接**（[跟踪指南](https://docs.cbpayapp.com/zh/guides/tracking)）：每张回单（payout、payin、
  退款、内部转账、兑换、加密货币提现或充值、银行操作、刷卡消费）现在都带有一个可分享的
  公开链接——`https://business.cbpayapp.com/t/{code}`，与回单上打印的签名代码相同——打开
  Wise 风格的跟踪页面，展示实时时间线、回单 PDF 下载和语言选择（EN/ES/ZH）。页面为
  `noindex`，永不缓存，并将审核类状态显示为 `processing`（防提示）。
- **公开跟踪接口**：`GET /v1/public/track/{code}?lang=` 返回交易的公开 JSON 状态，
  `GET /v1/public/track/{code}/receipt.pdf?lang=` 即时重新生成回单 PDF。两者均无需鉴权、
  按 IP 限流，并对无效或被篡改的代码返回统一的 `404 not_found`。
- **中文回单**：回单 PDF 和跟踪页面现已完整支持 `lang=zh`。

**变更**

- **回单 `verify_url` 打开跟踪页面**：新回单及回单邮件中的 `verify_url` 现在指向跟踪页面。
  旧的 `GET /v1/verify/receipts/{code}` 继续保留——浏览器会被重定向（302）到跟踪页面，
  而 API 客户端仍收到与之前相同的 JSON 结果。

## v2.40 · 4 个版本 - 2026年8月7日

### v2.40

**新增**

- **银行目录查询**（[付款指南](https://docs.cbpayapp.com/zh/guides/payouts)）：新增的
  `GET /v1/payouts/bank-directory/lookup` 可从嵌入式公开银行目录自动补全收款银行——`routing_number`
  （9 位数字，仅限美国）与 `swift`（8 或 11 个字符；`XXX` 后缀会归一化为总行）二者必传其一，
  它会解析出银行名称、城市、州和地址块，便于 payout 和交易对手表单在付款人输入时预填
  `bank_name` 和选填的 `bank_*` 字段。返回 `404 bank_not_found` 仅表示该代码不在目录中：
  表单保持手动填写即可。静态数据，带 `Cache-Control: public, max-age=86400`。
- **邮政编码查询**（[AML 指南](https://docs.cbpayapp.com/zh/guides/aml)）：新增的
  `GET /v1/aml/catalogs/postal-code?country=US&code=33130` 可将美国 ZIP 编码解析为其
  `city` 和 `state`，便于地址表单在用户输入 ZIP 时自动填充这两个字段。目前仅美国有数据集；
  返回 `404 postal_code_not_found` 表示该 ZIP 未知（或该国家/地区没有数据集），字段保持手动填写。

**修复**

- **城市目录质量清理**：`GET /v1/aml/catalogs/cities` 现在按折叠形式（去除变音符号、不区分大小写）
  对城市去重，统一夏威夷 ʻokina 字符，删除两条损坏粘连的条目，折叠内部多余空格，并以
  `Content-Type: application/json; charset=utf-8` 提供响应。

### v2.39

**新增**

- **按国家查询城市目录**（[AML 指南](https://docs.cbpayapp.com/zh/guides/aml)）：新增的
  `GET /v1/aml/catalogs/cities?country=US` 返回某个 ISO 3166-1 alpha-2
  国家的城市，按行政区划分组——`states` 的键与主目录中
  `country_subdivisions` 的 ISO 3166-2 代码一致，`country_cities`
  列出无法映射到行政区的城市（两个字段都不会为 `null`）。无覆盖的
  国家返回 `200` 和空列表（前端回退为自由文本输入）；格式错误的
  国家代码返回 `400 invalid_country`，未知代码返回
  `404 country_not_found`。静态数据，带
  `Cache-Control: public, max-age=86400`——每个国家调用一次，然后
  在客户端按州/省筛选。
- **US/USD 充值现在发布两条存款通道**（[充值指南](https://docs.cbpayapp.com/zh/guides/payins)）：
  公告式 `bank_transfer` 走廊同时提供**美国国内电汇**指令（ABA
  `routing_number`）和**国际 SWIFT** 指令（BIC + 代理行）——公告、
  充值读取以及 `GET /v1/payins/deposit-instructions` 预览都会暴露
  `deposit_instructions`（国内）和 `deposit_instructions_swift`
  （国际），各自带有可复制的 QR，付款方选择其银行支持的通道。两个
  指令块在配置后都会携带新的 `holder_address` 和 `notes` 字段（QR
  中以 "Holder address" 和 "Note" 行打印）。失败关闭：缺少 SWIFT
  变体的 US/USD 走廊在公告时返回
  `422 deposit_instructions_unavailable`。

### v2.38

**新增**

- **按审核期限自动拒绝**（[交易审核指南](https://docs.cbpayapp.com/zh/guides/transaction-reviews)）—
  如果您的组织为交易防火墙配置了审核期限，在该期限内（自最后一次状态
  变更起算——上传证据会重置计时）无人决定的审核将由每小时一次的扫描
  **自动拒绝**：操作被取消，被扣留的资金退回您的余额，您会收到与人工
  拒绝相同的邮件和 `txn_review_status_changed` webhook
  （`status: "rejected"`）。审核详情的 `decision_note` 携带标准的期限
  提示。

### v2.37

**新增**

- **新增 payin 走廊：美国（USD）预报银行转账（ACH / wire）**。账户通过
  `POST /v1/payins` 预报存款，请求体为 `{method: "bank_transfer", country:
  "US", currency: "USD", amount, idempotency_key, payer_name?}`，响应返回唯一
  参考号 `CB…`、`status: "pending"` 以及完整的 `deposit_instructions` 区块
  ——该区块现在支持美国银行字段 `routing_number`（ABA）、`swift`（BIC）、
  `bank_address`、`intermediary_bank_name` 和 `intermediary_bank_swift`。
  客户从其银行转账时在附言/memo 中填写 `CB…` 参考号；款项到达归集账户后按
  参考号匹配并以 USDT 入账（`status: "credited"`，含 `usdt_credited` 和
  `fx_rate`）。没有预报或参考号的银行入账将保持 `unassigned`——失败关闭，
  绝不会自动入账。无需预报即可预览收款账户：
  `GET /v1/payins/deposit-instructions?country=US&currency=USD&method=
  bank_transfer`。美国加入了强制要求组织配置存款指令的走廊名单：未配置即预报
  会返回 `422 deposit_instructions_unavailable`。美国标签页（含完整
  请求/响应示例、状态表、错误和 FAQ）见 [Payins 指南](https://docs.cbpayapp.com/zh/guides/payins)；
  `deposit_instructions` 区块和预览端点已在 API 参考中更新。

## v2.36 · 3 个版本 - 2026年8月6日

### v2.36

**新增**

- **交易防火墙**：当您的组织启用交易防火墙时，资金操作（法币 payout、加密
  提现、payin 和银行转账）可能会被扣留为 `in_review` 状态，等待人工决定 —
  API 返回 `202 Accepted` 和 `review_id`。新增账户端点
  `GET /v1/me/txn-reviews`（列表和详情）、
  `POST /v1/me/txn-reviews/{reviewID}/files`（上传所需文件）和
  `GET .../files/{fileID}/download`（下载您自己的文件），以及新的
  `txn_review_status_changed` webhook（中性 payload — 内部原因从不外传）。
  新指南：[交易审核](https://docs.cbpayapp.com/zh/guides/transaction-reviews)。

### v2.35

**新增**

- **新增出金通道：美国（USD）**，提供三种方式 —— `ach`（次日 ACH
  至支票或储蓄账户）、`wire`（境内电汇）和 `swift`（经 SWIFT 的
  国际美元电汇）。通道要求**每笔转账附带收款人完整的身份与邮政
  地址**（`name`、`email`、`account_number`、`country_code`、
  `address`、`city`、`postal_code`、`bank_name` 和 `bank_code` ——
  `ach`/`wire` 用 ABA routing number，`swift` 用 SWIFT BIC；
  `ach` 还需 `account_type` `CHECKING`/`SAVING`），收款银行的
  地址块与 `bank_phone` 为建议选填项。`wire` 和 `swift` 最低
  **USD 25.00**。向全新收款人发起的第一笔 payout 可能保持
  `processing` 且 `status_code: "pending_aml"`，待通道审核收款人后
  自动执行；若通道拒绝，payout 以 `failed`、
  `status_code: "counterparty_rejected"` 结束并自动退款。可按笔在
  `options` 中覆盖通道的付款用途声明（`purpose`、
  `crypto_activity`、`payment_gateway`）。通道表、按方式的字段表、
  真实示例与 FAQ 见 [出金](https://docs.cbpayapp.com/zh/guides/payouts)；API 参考中新增
  命名请求示例 `us_ach`、`us_wire` 和 `us_swift`。

### v2.34

**新增**

- [MCP 服务器](https://docs.cbpayapp.com/zh/mcp)页面现在提及面向**组织管理**文档的专用 MCP
  服务器（`mcp-admin.cbpayapp.com`，部署中），以便组织管理员了解
  org-admin API 也有对应的助手内容源——本公开服务器继续覆盖账户级 API。

## v2.33 · 2 个版本 - 2026年8月5日

### v2.33

**新增**

- **文档验证更透明**:submission 的文档列表
  (`GET /v1/{kyc,kyb}/submissions/{id}/documents`)现在为每项验证暴露其
  `id`、`effective_outcome`(当前生效的判定,可能来自运营方的人工复核)
  以及 `manual_review` 块(当验证经过人工复核时包含 `outcome` 和
  `reviewed_at`)。submission 详情还新增 `documents_gate`,汇总验证状态
  (`ok`、`matched`、`total` 以及仍未解决的类别)。流程不变:均为新增的
  只读字段。

### v2.32

**新增**

- **KYC/KYB 自动决策**:验证 submission 现在先由自动引擎决定,再进入人工审核。**100% 干净**
  的档案(文件已验证、活体检测通过、无制裁或 PEP 命中、低风险地区)会在**几分钟内获批**,
  无需人工排队。灰色地带(同名的 AML 匹配、PEP 信号、文件部分读取、中等风险、高风险国家)
  一律交给**人工审核员**,而明显无效的档案(已确认的严重制裁、伪造或过期文件)会被**自动
  拒绝**。最终决定现在在 `kyc_verification_status_changed` 和 `kyb_verification_status_changed`
  webhook 中携带 `decision_source`(`auto` 或 `admin`),让你知道每份档案是如何决定的。
  详见 [KYC 和 KYB](https://docs.cbpayapp.com/zh/guides/kyc)。
- **测试环境新增 `HOLDREVIEW` 魔法值**:主体姓名包含 `HOLDREVIEW` 的 KYC/KYB submission 会保留
  在人工审核中,而不会被自动决定,方便你端到端地演练人工队列。配套的
  `MANUALREVIEW` 魔法值让所有信号保持干净,但绝不会自行了结 submission,
  从而确定性地测试判定引擎的自动通过/拒绝路径。参见
  [测试环境](https://docs.cbpayapp.com/zh/environment-testing)。

## v2.31 · 4 个版本 - 2026年8月4日

### v2.31

**新增**

- **银行操作增强字段**：`GET /v1/banking/operations` 和
  `GET /v1/banking/operations/{id}` 现在在银行报告这些字段时暴露可选的
  `direction`（`in` / `out`）、净额 `amount`、`currency`、`counterparty`
  和 `reference`——包括在操作列表中自动发现的入账存款和银行费用。
  `banking_operation_status_changed` Webhook 按设计保持不变
  （轻量 + 查询详情）。详见[银行业务](https://docs.cbpayapp.com/zh/guides/banking)。

### v2.30

**变更**

- **全 API 错误消息已脱敏。** 错误的 `message` 绝不会暴露提供商名称、基础设施细节、URL、上游原始响应体（JSON/HTML）或内部配置——无论是 API 响应、webhook 还是持久化的状态字段都不会。处理方的业务性拒绝会保留可操作的失败原因（例如某份文件或账户为何被拒绝）；基础设施故障会被替换为固定的通用消息 `"the payment provider could not process the request"` —— 请使用相同的 `idempotency_key` 重试这些操作。无结构变化：仅消息内容发生变化。

### v2.29

**新增**

- **按笔消费手续费**：卡交易现在可以携带按账户配置的交易手续费（百分比 + 固定），通过两个新服务实现 —— `card_purchase_virtual` 和 `card_purchase_physical`。手续费在**授权时预估**（计入余额冻结），在**结算时按当时生效的配置重新计算**，并在部分或全部撤销/调整时**按比例退还**。卡交易现在暴露 `fee_asset`、`fee_amount` 和 `fee_refunded_amount`（未配置手续费时省略 —— 未配置的账户不受影响），购买凭证显示手续费行，账本以 `card_fee` / `card_fee_refund` 记录相关流水。详见[卡片](https://docs.cbpayapp.com/zh/guides/cards#按笔消费手续费（生命周期）)。

### v2.28

**新增**

- **支付页面上经付款人验证的已保存卡片**：每个银行卡支付页面（`card`
  payin 的 `payment_url` 以及通用 checkout 的银行卡选项）现在把**付款人
  邮箱作为第一个字段**；如果该邮箱在您这里保存过卡片，会先向其发送
  **验证码**，验证通过后才展示卡片 —— 卡片列表绝不在未验证的情况下
  显示。勾选**"记住此设备"**（默认勾选）后，付款人在该浏览器中 **30
  天**内无需再次输入验证码。选择卡片后通过 3-D Secure 支付，无需重新
  输入卡号。详见
  [已保存卡片](https://docs.cbpayapp.com/zh/guides/stored-cards-subscriptions#付款人在支付页面上发现自己的卡片)。

**变更**

- **通用 checkout 不再询问付款人邮箱**：银行卡选项直接物化并重定向到
  支付页面，已保存卡片的发现流程就在该页面进行。公开端点
  `GET /pay/{token}/saved-cards` 已被**移除**（返回 404）—— 卡片列表
  不再从任何未经验证的接口流出。**契约不变**：`POST /v1/payins`
  （`card` 和 `checkout`）保持不变，server-to-server 的
  `stored_card_id` 无需验证码（您已认识您的客户）。

## v2.27 · 2 个版本 - 2026年8月3日

### v2.27

**新增**

- **停用和重新启用 webhook 订阅**：新增
  `PATCH /v1/webhooks/subscriptions/{subscriptionID}`，请求体为
  `{ "status": "active" | "disabled" }` —— `disabled` 状态的订阅停止接收
  新事件，但不会被删除（已排队的投递仍会发出），您可以随时重新启用。
  幂等：重复当前状态返回 `200` 且无变化。详见
  [webhooks 指南](https://docs.cbpayapp.com/zh/webhooks#停用和重新启用订阅)。

### v2.26

**修复**

- **账户验证状态免受旧尝试的迟到事件影响**：当账户重试身份验证（例如
  在被拒绝后）时，来自先前尝试的迟到状态事件不会再更改账户的验证
  状态或触发决定邮件——只有最近一次尝试才能决定。每次尝试的完整
  历史仍保留在管理面板中。

## v2.25 · 3 个版本 - 2026年8月2日

### v2.25

**变更**

- **补充管理端错误码文档**：在[错误目录](https://docs.cbpayapp.com/zh/errors)中新增了
  `global_treasury_access_disabled` 和 `invalid_value` 错误码。这两个错误码
  来自组织管理界面（CBPay Admin 面板），并非账户级 API —— 详见新增的
  “组织管理面板”一节。

### v2.24

**新增**

- **转账通知类 payin 的入金说明**（[payins 指南](https://docs.cbpayapp.com/zh/guides/payins)）：
  在支持的走廊中，使用 `method: "bank_transfer"` 创建 payin 现在会返回
  `deposit_instructions` 区块，包含确切的收款账户信息——`bank_name`、
  `account_number`、`account_type`、`holder_name`、`holder_tax_id`、
  `holder_email`、`reference_required`，一段可直接复制的多行文本
  `qr_payload`（含账户、收款人和你的备注/金额），以及带品牌的
  `qr_png_base64`。该区块在 payin 的详情与列表接口中同样返回。新增
  `GET /v1/payins/deposit-instructions?country=&currency=&method=`，
  可在创建 payin 之前预览收款账户。银行 QR 为“扫码复制”而非自动填充的
  原因，详见指南中的常见问题。

### v2.23

**新增**

- **KYC/KYB 验证决定自动邮件通知**（自助入驻）：当您的验证结果变为已批准、
  已拒绝或需要补充材料时，您会收到一封带有所属机构品牌样式的邮件通知结果。
  不适用于第三方验证（例如您的企业在验证某个客户或供应商）——该场景下依旧
  使用您已接入的 `kyc_status_changed`/`kyb_status_changed` webhook。出于
  安全和隐私考虑，邮件不包含拒绝的具体合规原因。

## v2.22 · 1 个版本 - 2026年8月1日

### v2.22

**变更**

- **活体检测现支持同一主体多个会话**
  ([身份验证](https://docs.cbpayapp.com/zh/guides/kyc))：验证报告的 `liveness[]` 数组可为同一人携带多条
  记录——开通门槛检测 `gate` 加上一次或多次后续证据补录
  `media_recapture`。每个会话现在都带有各自的 `session_id` 与 `purpose`
  （`gate` 或 `media_recapture`）。在 KYB 中，`parties[].liveness`（单数）
  出于兼容性保留，始终指向该关联方的 `gate` 会话，而新增的
  `parties[].liveness_sessions[]` 携带该关联方的全部会话。媒体元数据依旧不含
  URL（`has_selfie`、`has_video`、`frame_gestures`、哈希）——该部分契约不变。

## v2.21 · 1 个版本 - 2026年7月30日

### v2.21

**变更**

- **验证报告封面可导航**
  ([身份验证](https://docs.cbpayapp.com/zh/guides/kyc))：PDF 首页为**可点击**的索引卡片（图标、标题与
  页码），点击即可跳转到对应章节。每个章节都带有图标与强调条，与 AML 报告保持
  一致的视觉语言。
- **可点击链接**：AML 附录中的负面媒体条目带有“查看来源”标签，结尾处的公开
  验证链接也可点击。出于安全考虑，**仅嵌入 `http` 与 `https` 链接**，其他协议
  一律丢弃，文本保持不可点击。
- **照片保持真实比例**：证件照片与活体检测照片不再被拉伸，说明文字位于下方。
- **无空白页、无孤立标题**：每个章节标题都会预留其首个内容块的高度，因此绝不会
  单独出现在页面底部。
- 负面媒体的汇总状态现显示为 **“Review”**（原为 “In review”）。

## v2.20 · 2 个版本 - 2026年7月28日

### v2.20

**新增**

- **验证报告中的视觉证据**（[身份验证](https://docs.cbpayapp.com/zh/guides/kyc)）：当提供商发布活体
  媒体（自拍 / 手势帧）或身份证件照片时，**PDF 会尽力嵌入照片**。若无媒体
  或链接已过期，则省略照片区块。报告 JSON 仅声明元数据（`has_selfie`、
  手势、`has_video`、哈希）— **绝不包含已签名 URL**。
- **PDF 结尾的完整 AML 附录**：存在筛查时，报告复用独立 AML 报告的同一
  结尾（归属声明、覆盖统计、数据源区块与法律声明）。无筛查时保留通用
  免责声明。

### v2.19

**新增**

- **完整的验证报告，不丢弃任何数据**（[身份验证](https://docs.cbpayapp.com/zh/guides/kyc)）：KYC/KYB
  报告由摘要升级为完整档案。在原有内容之外，JSON 与 PDF 现在还包含
  **申报的经济画像**（资金来源、关系目的、预期交易量与收入、预期链），
  **风险声明**（货币服务、第三方资金、高风险活动、禁止国家），
  **在源头即已脱敏的银行账户**（完整账号绝不进入报告），扩展的企业身份
  （成立信息、司法管辖区、ISIC 行业、网站、经营国家、注册地址），以及
  **档案的其余部分**：任何无法归入结构化章节的已验证字段仍会出现在字段块中。
- **关联方及其自有 AML 筛查（KYB）**：档案中的每一位 UBO、控制人和签署人
  都会作为 `parties[]` 条目输出，包含其身份、持股比例、归属于它的文件与
  活体证明，以及**其自有的 AML 筛查并已启用持续监控**。不收费：这属于尽职
  调查，而非计费产品。`(source, index)` 组合是该关联方的稳定标识，因此无论
  你下载多少次报告，其筛查始终一致。若下载时某一关联方尚无筛查结果，报告会
  返回 `"partial": ["party_aml_unavailable"]`，缺失的筛查将在后台执行。
- **逐条匹配明细的 AML 筛查**：完整报告（第三方与管理端读取）的 AML 章节
  现在包含指标、别名、带来源与有效期的制裁名单、PEP 职位、RCA 关联及负面
  媒体 —— 与 AML 报告同等的明细程度。在你自身入驻的报告中，该章节仍为
  **聚合形式**（`clear` / `under_review`，不含匹配明细），你的关联方筛查
  同样如此。
- **文件明细中的文件校验信息**：报告中的每个文件都会输出 `validated_at`，
  在适用时还包含拒绝原因，与类别、文件名、状态、结论和分值一并呈现。

## v2.18 · 3 个版本 - 2026年7月27日

### v2.18

**修复**

- **金额始终为普通十进制**（[收款](https://docs.cbpayapp.com/zh/guides/payins)）：收款的
  `local_amount` 字段（以及收款事件中的 `amount`）始终以十进制文本返回 ——
  例如 `"5000000"` —— 绝不会使用科学计数法。在无小数位货币（CLP、PYG、COP）
  的大额入款中，一笔入款可能被记录为 `"5e+06"`：金额对你的集成不可读，且该
  入款无法与其预告的转账完成匹配，因而始终未入账。本次修复同样覆盖历史记录：
  通过 API 读取时会返回规范化后的金额，且不改动任何账务数据。

### v2.17

**新增**

- **可下载的 KYC/KYB 验证报告**（[身份验证](https://docs.cbpayapp.com/zh/guides/kyc)）：每个 KYC/KYB
  提交现在都有由平台生成的验证报告，支持 `?format=pdf|json` 与
  `?lang=en|es|zh`。第三方：`GET
  /v1/kyc/submissions/{submissionID}/verification-report` 与 `GET
  /v1/kyb/submissions/{submissionID}/verification-report`（企业账户，
  完整报告：已验证身份、生命周期、文件 + OCR、活体检测及含匹配明细的
  AML 筛查）。自身入驻：`GET /v1/me/verification/report`（结构相同，
  AML 部分为汇总视图）。免费 — 读取的是已付费的验证结果。
- **报告公开验证码**：PDF 打印 HMAC 验证码 + 二维码，任何人都可在
  `GET /verify/reports/{code}` 验证文件真伪（JSON 或 HTML 页面，不含
  个人数据：仅类型、当前决定状态、签发日期与签发组织）。
- **新错误码**：`invalid_format`（400，`format` 非 `pdf`/`json`）与
  `verification_not_found`（404，账户尚未提交任何验证）；
  `invalid_language` 同样适用于该报告。

### v2.16

**修复**

- **QR 收款现在始终自动入账**（[payins](https://docs.cbpayapp.com/zh/guides/payins)）：已支付的 QR
  可能停留在 `pending`，而资金以未指派存款的形式到账——因为银行转账不携带
  收款的参考号，且按金额对账仅保留给预告转账。现在，结清收款（QR、checkout
  链接或银行卡）的存款会携带与已支付收款单的关联，并一对一路由到其
  payin——不使用启发式匹配。入账的 payin 以 `match_method: charge_link`
  声明该关联，这是所有对账信号中最强的一种。
- **`match_method` 枚举文档化**：参考文档曾列出 `single_candidate` 与
  `dedicated_instrument`，但 API 中并不存在。真实值为
  `amount_single_candidate` 与 `dedicated_clabe`；spec 中新增了
  `charge_link` 与 `manual_assign`（管理员手工路由存款）。
## v2.15 · 1 个版本 - 2026年7月26日

### v2.15

**修复**

- **预告转账现已遵循幂等性**（[payins](https://docs.cbpayapp.com/zh/guides/payins)）：
  `POST /v1/payins` 在 `method: "bank_transfer"` 下接受 `idempotency_key`
  却将其忽略，因此重试（超时、重复点击）会创建第二个预告。两个金额相同的
  活跃预告正是匹配逻辑拒绝解析的情况，因此真实到账会变为
  `unassigned`。现在，使用相同密钥（请求体字段或 `Idempotency-Key`
  请求头）重试会返回原始预告（相同 `reference`，HTTP `200` 且包含
  `idempotency_hit: true`）。不带密钥的 POST 会复用完全相同的活跃预告
  （同一账户、币种、金额和付款人），而不是重复创建。若要向同一付款人
  收取两笔金额相同的真实款项，请为每个预告发送不同的密钥。
  复用已用于**其他**收款方式（QR、checkout、卡支付）的密钥，
  现在会返回 `409 idempotency_conflict`，而不是返回与请求不符的对象。
## v2.14 · 6 个版本 - 2026年7月25日

### v2.14

**新增**

- **预告转账的付款人识别**（[充值](https://docs.cbpayapp.com/zh/guides/payins)）：
  `POST /v1/payins` 使用 `method: "bank_transfer"` 时可选传入
  `payer_name`、`payer_document` 与 `payer_account`。如果你不传
  `payer_document` 且该账户是已验证的个人，系统默认使用持有人的证件号，
  这样即使转账没有附言参考号，也能通过银行报告的付款人完成匹配。
  响应中的 `payer_source`（`declared`、`account_identity` 或 `none`）
  会说明最终使用的是哪种身份。
- **充值上的匹配审计**：`GET /v1/payins/{id}` 会返回 `match_method`
  （`reference`、`payer_document`、`payer_account`、`payer_name`、
  `single_candidate` 等）以及通道报告的 `payer` 区块，让你清楚看到这笔
  充值为什么进入了该账户。

**变更**

- **预告转账不再按金额匹配"最早的一笔"**：如果两条或以上待处理预告的
  金额与币种相同，且没有任何信息可识别付款人，该充值会保持
  `unassigned`，而不是错误入账到其他账户（fail-closed）。仅当只有
  **一个**候选时，纯金额匹配才继续生效。详见新增章节
  [预告转账的匹配规则](https://docs.cbpayapp.com/zh/guides/payins)。

### v2.13

**新增**

- **事件流握手配额**（[错误](https://docs.cbpayapp.com/zh/errors)）：连续过于频繁地打开
  `GET /v1/events` 现在会返回 `429 rate_limited`。它与 `too_many_streams`
  是两个不同的限制：`rate_limited` 按 IP 统计连接*尝试*次数（每小时 600 次，
  足够用于重连），而 `too_many_streams` 限制同时*保持打开*的流数量
  （每个账户 5 个）。两者的重试方式相同：等待后带上 `Last-Event-ID` 重连，
  不会丢失任何事件。

### v2.12

**新增**

- **实时事件流**（[指南](https://docs.cbpayapp.com/zh/realtime-events)）：
  `GET /v1/events` 打开 Server-Sent Events 连接，推送你账户中发生的一切 ——
  与 webhook 相同的事件，无需轮询即可送达浏览器。使用 `Last-Event-ID` 请求头
  重连，服务端会重放你错过的事件；用 `?types=` 过滤；用 `?snapshot=true`
  获取当前绝对状态。
- **可查询的事件历史**：`GET /v1/events/history`（支持 `from`/`to`、分页与
  类型过滤）与 `GET /v1/events/{eventID}` 读取与事件流同源的日志，保留 90 天。
- **三个新事件**（[webhooks](https://docs.cbpayapp.com/zh/webhooks)）：`balance_adjusted`（管理员为你
  的余额入账或出账）、`account_status_changed`（账户被暂停或恢复）与
  `member_security_event`（登录、密码或 2FA 变更、会话撤销）。它们同时通过
  webhook 和事件流送达。
- **新增错误码**（[错误](https://docs.cbpayapp.com/zh/errors)）：`too_many_streams`、
  `stream_unavailable` 与 `streaming_unsupported`。

### v2.11

**新增**

- **卡收款退款**（[指南](https://docs.cbpayapp.com/zh/guides/refunds)）：`POST /v1/payins/{payinID}/refunds`
  可对卡收款进行全额或部分退款，并立即从你的余额中扣除相应金额。退款必须携带幂等键
  （使用相同幂等键重试永远不会重复退款），使用会话发起时还需要 OTP 验证码。
  `GET /v1/payin-refunds` 按账户、状态、类型和日期范围列出退款，
  `GET /v1/payin-refunds/{id}` 返回详情，
  `GET /v1/payin-refunds/{id}/receipt` 生成带可校验编码的 PDF 凭证。
- **收款上的退款状态**：已退款的 payin 会返回 `refund_status`（`partial` 或
  `full`）、`refunded_amount`（累计扣除的 USDT）与 `refunded_local`
  （累计退还给持卡人的金额）。
- **`payin_refunded` webhook**（[webhooks](https://docs.cbpayapp.com/zh/webhooks)）：每一笔退款、撤销
  和拒付都会通知其类型、状态、金额以及结果余额。

**变更**

- **手续费与汇率价差不予退还**：退款时按已入账的毛额扣除，我们为处理该笔支付所收取
  的费用保持不变。发卡行通知的拒付会自动执行，并可能使你的余额变为负数，直到你完成
  充值。
- **新增错误码**（[错误](https://docs.cbpayapp.com/zh/errors)）：`payin_not_refundable`、
  `refund_not_supported`、`refund_exceeds_payin` 与 `invalid_amount`。

### v2.10

**变更**

- **公开服务状态页面重新设计**（[指南](https://docs.cbpayapp.com/zh/service-status)）：
  `status_page_url` 返回的页面现在会显示国家国旗、支付方式图标、
  最近 90 天逐日可用性条、包含总体状态与平均可用率的概览卡片，
  以及使用通俗语言描述原因的事件时间线。页面会自动使用你组织的
  logo、颜色和网站，仍然不包含 JavaScript 与外部资源（可以嵌入或分享
  给客户），`/v1/status/{token}` 的 JSON 保持不变。

### v2.09

**新增**

- **以美元结算的国际银行卡**（[指南](https://docs.cbpayapp.com/zh/guides/payins)）：`POST /v1/payins`
  传入 `country: "US"`、`currency: "USD"` 与 `method: "card"`，会返回一个带
  3-D Secure、使用您机构品牌的托管 checkout `payment_url`，可收取任意国家
  发行的 Visa、Mastercard、American Express、Discover 与 Diners 卡。契约与
  玻利维亚的银行卡页面完全相同（`customer` 可选、`success_url`/`failure_url`、
  `expires_at`、尝试次数受限，幂等重试返回同一个 URL），保存卡片也一样：
  `save_card` 配合 `payer_reference` 会在获得付款人同意后保存卡片，用于
  [后续收款与订阅](https://docs.cbpayapp.com/zh/guides/stored-cards-subscriptions)。3-D Secure 在页面
  内完成（若发卡行要求挑战验证，付款人可直接在页面内完成），卡片数据在处理方
  的安全字段中录入：绝不经过您的集成。该通道按账户开通 ——
  `GET /v1/payins/methods` 是您当前可收款方式的唯一可信来源。

## v2.08 · 6 个版本 - 2026年7月24日

### v2.08

**新增**

- **实时服务状态**（[指南](https://docs.cbpayapp.com/zh/service-status)）：`GET /v1/payouts/methods`
  与 `GET /v1/payins/methods` 的每个方式现在都带有新增字段
  `availability`（`operational` / `degraded` / `down`）；新的广播 Webhook
  `corridor_status_changed` 会通知每一次可用性变化；每个组织都拥有一个
  带自有品牌的公开状态页（HTML + JSON，位于 `/status/{orgToken}` 与
  `/v1/status/{orgToken}`），含 90 天正常运行率与事件历史。状态页 URL 通过
  `GET /v1/branding` 的 `status_page_url` 字段暴露。

### v2.07

**新增**

- **面向 AI/MCP 的文档知识包（Docs Knowledge Pack）**：本文档现在还以结构化、
  带版本号的包形式发布于
  [`/mcp-pack/manifest.json`](https://docs.cbpayapp.com/mcp-pack/manifest.json)
  （3 种语言的 OpenAPI 规范、逐页纯 Markdown 指南、错误与 Webhook 目录、
  含模拟器魔法值的测试指南、端到端配方以及可直接用于 RAG 的分块）。它是
  为文档 [MCP 服务器](https://docs.cbpayapp.com/zh/mcp)提供数据的官方来源。

**移除**

- **停用编译后的 Markdown `CBPAY_DOCUMENTACION.md`**：这份仅西班牙语的单一
  文档已过时——其替代品是文档知识包（三语、含完整规范）和 MCP 服务器。

### v2.06

**新增**

- **所有产品指南新增常见问题（FAQ）**：付款、收款、Checkout、转账、加密货币、
  银行服务、卡片、对账单、QR 付款以及已保存卡片 + 订阅指南现在都以常见问题
  收尾，并直接链接到[错误目录](https://docs.cbpayapp.com/zh/errors)。
- **错误与 Webhook 目录补全**：API 中已存在但参考页面缺失的错误码和 Webhook
  事件类型现已完整记录。接口契约无变化。

### v2.05

**变更**

- **文档大修，第 5 阶段（仅 API 参考，无代码变更）**：API 参考现将操作
  归入三个新标签——**Checkout**（公开的 `/pay/{token}` 页面与报价）、
  **已保存的卡**（`/v1/stored-cards` 及已保存卡查询）和**订阅**
  （`/v1/subscriptions`）。这些操作此前堆叠在通用的 **Payins** 标签下；
  所有路径与契约均未改变。

### v2.04

**新增**

- **独立的产品指南**（从 payins/payouts 长文中拆分）：
  [Checkout 收款链接](https://docs.cbpayapp.com/zh/guides/checkout)、
  [已保存卡片与订阅](https://docs.cbpayapp.com/zh/guides/stored-cards-subscriptions) 和
  [QR 出金](https://docs.cbpayapp.com/zh/guides/qr-payout)。原有章节保留标题并链接到新指南，
  历史锚点仍然有效。
- [集成流程](https://docs.cbpayapp.com/zh/flows) 新增**端到端流程**：checkout、已保存卡片与订阅、
  QR POS 收款和余额兑换，均附时序图。

**变更**

- **产品导航按产品族重组**：收款（Money in）、付款（Money out）、
  余额与账户、身份与合规、体验 — 取代原先 17 页的扁平列表。
- [个人资料与安全](https://docs.cbpayapp.com/zh/guides/profile) 与
  [安全与双因素认证（OTP）](https://docs.cbpayapp.com/zh/security-2fa) 现已互相链接并明确分工：
  个人资料指南负责用户的 2FA 因子；OTP 页面负责按操作的验证流程。

### v2.03

**新增**

- **测试环境贯穿全站**：每个产品指南现在都在开头展示测试与正式环境的基础
  URL（共享组件），[常见问题](https://docs.cbpayapp.com/zh/faq)、[快速开始](https://docs.cbpayapp.com/zh/quickstart)和
  [介绍](https://docs.cbpayapp.com/zh/introduction)也正确描述了测试环境
  （`https://cryptobank.qbank.cl/platform`、`pk_test_` 密钥）——此前的
  文案错误地声称不存在沙箱。完整说明见
  [环境与测试](https://docs.cbpayapp.com/zh/environment-testing)。

**变更**

- **介绍页的产品目录已补全**：checkout、卡片与订阅、QR POS、兑换
  （swaps）、独立钱包、比特币和分析报表现已连同各自指南一并列出。

**修复**

- 早于多币种余额的规格描述：标签描述已重新对齐（Swaps、AML
  screening、Cards），"入账到 USDT 余额"等旧文案已更正为结算资产语义
  （`default_payin_asset`、`settlement_asset`）。

## v2.02 · 6 个版本 - 2026年7月23日

### v2.02

**变更**

- **自动兑换为 `default_payin_asset` 现按真实价格执行，不收取兑换点差**
  （[资金模型](https://docs.cbpayapp.com/zh/concepts/money-model)）：收款入账时已支付其手续费与
  汇率，自动兑换为所配置余额不再产生额外成本 — 不存在双重兑换。波动性
  资产（BTC/GOLD）的单笔/24 小时限额仍然适用。手动兑换
  （`POST /v1/swaps`）保留其常规点差。

### v2.01

**新增**

- **新错误码 `reserved_idempotency_key`（400）**：`POST /v1/swaps`
  （[错误](https://docs.cbpayapp.com/zh/errors)）中，前缀为 `payin-convert:` 或 `checkout-swap:`
  的幂等键保留给系统自动转换（收款默认余额与 checkout）使用，会被拒绝。
  请为你的兑换使用其他键。

### v2.00

**新增**

- **收款默认余额（`default_payin_asset`）**
  （[资金模型](https://docs.cbpayapp.com/zh/concepts/money-model)）：选择收款最终入账到哪个
  余额。`PUT /v1/settlement` 现接受 `default_payin_asset`（USDT、
  USDC、BTC 或 GOLD），`GET /v1/settlement` 会返回该字段。收款仍先以
  USDT 入账（定价与手续费不变），净额随后通过兑换引擎自动兑换为您
  选择的资产（与普通兑换相同的点差和限额）。兑换失败时保持
  `conversion_status: pending_retry` 并自动重试。发生兑换时，
  `GET /v1/payins`、详情接口与 `payin_credited` webhook 会包含
  `settlement_asset` 和 `conversion_status`。

**变更**

- **未**指定 `settlement_asset` 创建的 checkout 链接现使用账户的
  `default_payin_asset`（此前始终为 USDT）。

### v1.99

**新增**

- **银行卡收款专属佣金（`payin_card`）**
  ([佣金](https://docs.cbpayapp.com/zh/concepts/fees))：通过银行卡入账的收款（`method: card` 的
  直接 payin、用卡支付的收款链接、以及绑定卡的周期扣款）可以配置独立的
  百分比佣金，并支持**按币种**区分（例如 BOB 与 USD 各自的费率）。若账户
  未配置 `payin_card`，则继续按通用 `payin` 佣金计费 — 未显式配置时行为
  不变。可通过 `GET /v1/fees` 查询生效佣金（行中新增 `currency` 字段）。

### v1.98

**新增**

- **`GET /v1/banking/accounts/{bankAccountID}`**（[银行服务指南](https://docs.cbpayapp.com/zh/guides/banking)）：
  获取您某个银行账户的实时详情 — 名称、币种、状态以及接收资金所需的
  要件（电汇与本地轨道），位于 `data` 字段下。用于展示特定账户的入金
  指引，无需遍历列表。

**变更**

- **银行账户列表**：API 现在只返回根据通道配置为您的业务启用的账户。
  未启用的账户不再出现在 `GET /v1/banking/accounts` 中，按 id 查询时
  返回 `404`。

### v1.97

**修复**

- **收款页 — 默认使用已保存的卡**：当输入的邮箱有已保存的卡时，主按钮
  现在默认用该卡支付（按钮文案变为「用 VISA ···· 1234 支付」），而不再
  发起新卡支付。使用其他卡改为显式操作（「使用其他卡」）。此前，已保存
  的卡显示在列表中时按主按钮仍会跳到要求重新填写全部卡信息的页面。

## v1.96 · 3 个版本 - 2026年7月22日

### v1.96

**新增**

- **新通道：阿根廷** 🇦🇷（[出金指南](https://docs.cbpayapp.com/zh/guides/payouts) · [入金指南](https://docs.cbpayapp.com/zh/guides/payins)）：
  - **出金**支持 **ARS** 和 **USD**，通过 `bank_transfer` 转账到任何 22 位的 **CBU 或 CVU**（银行账户和虚拟钱包；USD 仅支持 CBU 到 CBU）。收款人只需 `name`、`tax_id`（CUIT/CUIL）和 `account_number` —— 无需 `bank_code`。
  - **入金**支持 **ARS**，每个账户可创建**专属 CVU 账户**（`POST /v1/payins/deposit-accounts`，`country: "AR"`）：每笔到账转账自动入账，无需参考号。CVU 为只收不付：直接扣款尝试会被自动拒绝。
  - 现已在**测试环境**（staging）通过模拟器提供；生产环境的启用将在银行认证完成后公布 —— 目录（`GET /v1/payouts/methods` 和 `GET /v1/payins/methods`）始终是唯一可信来源。

### v1.95

**新增**

- **随已保存卡片存档的账单信息**（[payins 指南](https://docs.cbpayapp.com/zh/guides/stored-cards-subscriptions)）：付款人保存卡片时填写的账单信息（姓名、地址、城市、邮箱、电话）会与凭证一并保存。再次使用该卡支付时，安全页面自动应用这些信息 — 付款人无需重新输入 — 且只显示**脱敏摘要**（姓名、部分邮箱和城市），并提供"使用其他信息"链接以便修改。完整信息绝不下发到浏览器：由服务器在授权时应用。

**变更**

- **使用已保存卡片须提供持卡人邮箱**：在公开的 checkout 页面上，使用已保存的卡现在要求提供保存时的同一持卡人邮箱 — 不匹配则返回 `404`（个人数据防枚举保护）。

### v1.94

**修复**

- **结账页 — 银行卡一键支付**（[收款指南](https://docs.cbpayapp.com/zh/guides/checkout)）：在公开页面选择银行卡继续时，现在直接跳转到安全支付页 — 移除了需要二次点击的中间按钮。点击已保存的卡即刻发起支付。
- **结账页的已保存卡**：选择已保存的卡后，安全支付页现在始终带上该凭据（显示卡组织与末 4 位，不再要求重新输入卡号）。此前邮箱重新校验可能悄悄丢弃所选卡，页面会再次要求填写全部信息。此外，在同一链接上切换选择（已保存 ↔ 新卡）会重新生成正确的支付会话，而不是复用旧会话。

## v1.93 · 3 个版本 - 2026年7月21日

### v1.93

**修复**

- **第三方的银行 webhook**（[webhooks](https://docs.cbpayapp.com/zh/webhooks)、[银行指南](https://docs.cbpayapp.com/zh/guides/banking)）：当你账户注册的**第三方**验证状态变化时，`banking_customer_status_changed` webhook 现在也会触发（此前只有自己档案的事件送达）。payload 新增 `customer_kind`（`self` | `third_party`），第三方还附 `third_party_id`（与 `GET /v1/banking/third-parties/{id}` 的 id 相同）。

### v1.92

**修复**

- **payin 历史中的 checkout 收款金额**（[payins 指南](https://docs.cbpayapp.com/zh/guides/checkout)）：`GET /v1/payins` 和 `GET /v1/payins/{payin_id}` 现在在所有状态（包括待支付和已过期）都返回 checkout 和 QR POS 收款的计价 — `settlement_asset` + `asset_amount`（适用时还有 `conversion_status`）。此前金额只在入账后出现，待支付的行没有金额。此外，以加密货币或 CBPay 应用结算的收款即使没有 `fx_rate` 也会返回 `usdt_credited`。CSV/XLSX 导出新增 `settlement_asset` 和 `asset_amount` 列。

### v1.91

**新增**

- **订阅（计划性循环扣款）**（[payins 指南](https://docs.cbpayapp.com/zh/guides/stored-cards-subscriptions)）：平台为已存卡的扣款执行排期。`POST /v1/subscriptions`（`interval` daily/weekly/monthly/yearly、可选 `start_at` 用于试用、必填 `idempotency_key`）在创建时扣款首个周期并自动触发其余周期。完整资源 `GET /v1/subscriptions`（+`/{id}`，过滤 status/stored_card_id/payer_reference）及生命周期 `POST .../pause` · `/resume` · `/cancel`。被拒时催收（每天重试 ×3 ⇒ `past_due`），恢复时不补扣，撤销卡片时自动取消。每次成功扣款像普通卡 payin 一样入账（`payin_credited` 带 `subscription_id`）。新增 webhook `subscription_status_changed`。

## v1.90 - 2026年7月20日

**新增**

- **已保存卡片与循环扣款**（[payins 指南](https://docs.cbpayapp.com/zh/guides/stored-cards-subscriptions)）：`card` 方式现支持存储凭证（卡组织 COF 规范）。`POST /v1/payins` 接受 `save_card`（托管页面上的同意复选框）、`payer_reference`（你的客户 ID）和 `stored_card_id`（使用已保存的卡支付，免输卡号；3-D Secure 照常运行）。新资源 `GET /v1/stored-cards`（+`/{id}`、`DELETE` 撤销）以及付款人不在场的**商户发起扣款**：`POST /v1/stored-cards/{id}/charges`（`recurring` 用于订阅；必须提供 `idempotency_key` — 重试绝不重复扣款）。卡号从不存在于平台：仅展示数据（卡组织、末四位、有效期）。新增 webhook `card_stored` 和 `stored_card_revoked`；新增错误 `422 stored_card_revoked`（[错误](https://docs.cbpayapp.com/zh/errors)）。

## v1.89 · 2 个版本 - 2026年7月18日

### v1.89

**新增**

- **对外支付的合规控制**（[出金指南](https://docs.cbpayapp.com/zh/guides/payouts)、[错误](https://docs.cbpayapp.com/zh/errors)）：出金、带受益人姓名的加密货币提现以及 collect 收款现在会在**资金移动之前**经过额外的合规控制。已记录的错误：`403 compliance_hold`（操作被拦截且未被创建 —— 未扣款；按政策不披露具体原因，请携带时间戳联系支持）与 `503 compliance_check_unavailable`（合规校验暂时无法完成；操作未被创建 —— 请使用**相同的** `idempotency_key` 重试）。

### v1.88

**修复**

- **AML 筛查的个人字段格式**（[指南](https://docs.cbpayapp.com/zh/guides/aml)）：筛查引擎要求
  `date_of_birth` 为 `{year, month, day}` 对象（纯字符串 `"YYYY-MM-DD"`
  返回 `422`）、`nationality` 为 ISO-3166 代码的**数组**、
  `personal_identification[]` 为 `{ "issuing_country", "number" }` 且不带
  `type` 字段。指南与 spec 示例已按实测验证的格式更新。

## v1.87 · 4 个版本 - 2026年7月17日

### v1.87

**新增**

- **QR Crypto POS — 面向处理商的定额加密货币二维码收款**（[指南](https://docs.cbpayapp.com/zh/guides/qr-pos)）：
  运营实体 POS 终端的企业账户可将其商户注册为已验证商户（已批准的第三方
  KYB/KYC），并按笔生成带专属地址和二维码的加密货币收款（USDT、USDC、
  BTC）。面向 POS 的支付早期检测（数秒内 `confirming`）、入账并自动兑换
  为结算资产、收款/webhook 按商户归属、对账汇总（`GET /v1/pos/summary`，
  含按商户的信息性佣金与应分配净额），以及经加密货币提现通道的退款并带
  硬上限（绝不超过已收金额）。新路由位于 `/v1/pos/*`（API 参考中的
  QR Crypto POS 标签）；部分支付会累计，过期收款收到的迟到支付同样入账。

### v1.86

**修复**

- **比特币加密货币二维码**：结账页二维码现在使用裸 bech32 地址（与
  TRON/ETH 相同）。Binance 等交易所应用会将 BIP-21 URI
  （`bitcoin:…?amount=…`）判为「无效二维码」；精确金额仍显示在旁边
  并可复制。
- **收款页**：白标 favicon（组织符号），面板文案不再在词中间断行
  （「momento」被拆成「moment」/「o」）— 激进的 `word-break` 仅保留
  在等宽地址上。

### v1.85

**新增**

- **每个收款链接的专属 CLABE（墨西哥）**：在通用收款链接上生成墨西哥
  `bank_transfer` 支付选项时，现在会签发（或从可回收池中取出）一个
  **该链接专属**的 CLABE。付款人只需转账精确金额，**无需填写参考码**：
  入账会按收款账户自动检测并路由到该链接。支付选项的 payload 中
  `destination` 带有 `dedicated: true`；若无法签发专属账户，则降级为
  传统方式（商户账户 + 转账附言中必填 `reference`）。链接结清后
  （已支付或已过期），CLABE 经过冷却期后回收再用。

### v1.84

**新增**

- **通用收款链接支持拉取式收款（委内瑞拉）**：结账页面现在提供直接从付款人
  账户扣款的方式（委内瑞拉的 `c2p` 和 `debito_inmediato`）。付款人在同一
  页面填写银行、证件号、电话或账户以及 OTP；金额始终是报价时冻结的金额。
  新增公开端点：`POST /pay/{token}/collect/otp`（通道按需发送密码时请求
  OTP）和 `POST /pay/{token}/collect`（执行扣款；若通道同步确认，链接在
  同一次调用中完成结算）。这些方式在 `GET /pay/{token}/quote` 目录中带
  `collect: true`。
- **按国家的多币种法币**：报价中的每个国家在 `options[]` 中列出其通道 —
  每个方式+币种一行（例如玻利维亚同时提供 BOB **和** USD 的二维码），并在
  `country_quote` 中带各自的 `local_amount`。生成以多种币种提供的方式时
  必须传 `&currency=YYY`（`400 currency_required` 错误现在适用于任何
  方式，不再只限银行卡）。
- **银行转账的目标账户**：当通道使用专属收款账户时（墨西哥的 CLABE），
  `bank_transfer` 的生成结果除参考码外还包含 `destination`（类型、账号和
  收款人）— 付款人无需离开页面即可知道转账目标。

**变更**

- **支付页面改用 SVG 旗帜**：国家和币种旗帜现在是 SVG 图片（在 Windows、
  macOS 和移动端显示一致；此前部分系统会把国家代码显示为纯文本）。银行卡
  页签的旗帜按**扣款币种**推导（USD → 美国国旗，即使收单机构位于其他
  国家）。

**修复**

- 结账页面不再因为只是打开着就返回 `429 too_many_attempts`：读取、生成、
  OTP 和扣款的流量限制现在彼此独立。

## v1.83 · 10 个版本 - 2026年7月16日

### v1.83

**新增**

- **通用收款链接新增"银行卡"标签页**：银行卡支付从 Fiat 标签页移到
  独立的标签页，按**扣款币种**列出（目前为 BOB 和 USD；未来收单机构
  的币种会自动出现）。`GET /pay/{token}/quote` 返回新的 `cards[]`
  目录（每个选项含国家、币种和 `local_amount`），`countries[]` 的
  方式列表不再包含 `card`。物化银行卡须指定币种：
  `POST /pay/{token}/methods/card?country=XX&currency=YYY` —— 缺失时
  返回新错误 `400 currency_required`。每种币种是独立的物化，各自有
  托管支付页面。

**变更**

- **支付页面视觉升级**：金额旁及加密货币分组显示资产 Logo（USDT、
  USDC、BTC、GOLD），Fiat 选择器和银行卡行显示国旗，各方式带图标，
  并新增**醒目的到期计时器**（带时钟的胶囊；1 小时内显示倒计时，
  10 分钟内变红）。

**修复**

- 结账页面不再每隔几秒自动滚动到当前面板：自动刷新仅在数据变化时
  重新渲染且不移动滚动条（只有手动选择支付方式才会将详情滚入视图）。

### v1.82

**变更**

- **通用收款链接支付页面全新改版**：支付选项现组织为三个标签页 ——
  **CBPay**（商户二维码 + 别名，附复制按钮）、**Crypto**（币种按网络
  分组；新网络启用后自动出现）和 **Fiat**（国家选择器 + 各国支付方式
  及即时报出的当地金额）。别名、地址、金额和参考号均带复制按钮。API
  无任何变化：URL、创建契约和公开端点（`/state`、`/quote`、
  `/methods/{method}`）保持不变。

### v1.81

**修复**

- **QR 出金——在创建 payout 之前进行校验**：`POST /v1/payouts/qr/scan`
  遇到不可读或动态二维码时，现在返回 `400 invalid_qr_payload` 及具体原因
  （之前返回泛化的 `502`）。在巴西的 confirm 中，金额与固定金额 PIX
  二维码不一致时返回 `422`，出金为 `failed` 且**退款已自动完成**——
  二维码保持有效，可用正确金额和新的键重试。
- **静态 PIX 二维码可复用**："一个 QR = 一笔支付" 的守卫不再适用于巴西的
  静态 PIX 二维码（它们天生会被支付多次）；每笔支付的保护是您的
  `idempotency_key`，在巴西的每次 confirm 中均为必填。

### v1.80

**新增**

- **巴西 PIX 二维码出金（BR/BRL）**：两步流程
  `POST /v1/payouts/qr/scan` → `POST /v1/payouts/qr/confirm` 现已接受巴西的
  **静态** PIX 二维码（含 "copia e cola" 代码）——传 `country: "BR"` 与
  `currency: "BRL"`。扫码在本地解码 BR Code（免费），返回商户名称、PIX
  密钥与金额；确认步骤通过 PIX 付款，计费与常规 payout 完全相同。`amount`
  始终必填：固定金额二维码要求金额完全一致（不一致时返回 `422`，出金为
  `failed` 且自动退款——该二维码**不会**作废）。静态 PIX 二维码**可复用**：
  每笔支付携带自己的 `idempotency_key`。动态或损坏的二维码返回
  `400 invalid_qr_payload`——请改用 `pix` 方式并提供收款人的密钥。
  测试环境已提供示例二维码与魔法值（`.99` 金额失败）——
  见[测试环境](https://docs.cbpayapp.com/zh/environment-testing#pix-二维码示例巴西-qr-出金)。详见
  [payouts 指南](https://docs.cbpayapp.com/zh/guides/qr-payout)。

### v1.79

**变更**

- **通用收款链接 v2 —— 多国家 + 结算到您选择的余额**（相对昨天 v1 形态为
  **Breaking**）：收款现在通过 `settlement_asset` 以您 4 个虚拟余额中的任意
  一个计价（默认 `USDT`，可选 `USDC`、`BTC`、`GOLD`），`amount` 以该资产
  计（"50" USDT、"0.001" BTC、"2" 克黄金）；传 `currency` 将返回 `400`
  （已存在的 v1 链接继续有效）。付款人可以看到**所有有可用收款通道的国家**
  （选择国家 → 显示该国方式及物化时冻结的本地金额报价）、4 个加密货币选项
  及**可扫描的二维码**（`qr_payload` + `qr_png_base64`；BTC 用 BIP-21，
  TRON/ETH 代币用原始地址 —— Trust Wallet、MetaMask、Binance 等外部钱包
  可直接识别），以及商户的 **CBPay 二维码 + 别名**，用 App 扫码即刻付款
  （深链 `cbpay:pay?to=…&checkout=…`；`POST /v1/transfers` 接受
  `checkout_token` 并在服务端校验应付额）。每笔付款入账时**自动兑换**为
  `settlement_asset`（相同资产则不兑换）；`/state` 可见
  `conversion_status`。新增公开端点 `GET {checkout_url}/quote`，返回国家
  目录、加密货币应付额与 CBPay 应付额。新增错误 `country_required`、
  `country_unavailable`、`settlement_asset_disabled` 与
  `checkout_amount_mismatch`。详见
  [收款指南](https://docs.cbpayapp.com/zh/guides/checkout)。

### v1.78

**新增**

- **主动收款失败的拒绝详情**：当主动收款（`collect`，C2P 或即时扣款）
  变为 `failed` 时，payin 现在包含 `failure` 对象，说明拒绝来源
  （`provider` = 付款人的银行，`core` = 扣款前校验）以及具体的代码和
  消息——在 `POST` 的同步响应、`GET /v1/payins/{id}` 和 webhook 中均可
  见。此前仅暴露通用的 `failed` 状态。详见
  [payins 指南](https://docs.cbpayapp.com/zh/guides/payins)。

### v1.77

**新增**

- **通用收款链接（`checkout`）**：`POST /v1/payins` 接受
  `method: "checkout"` 并返回 `checkout_url` —— 一个带品牌的公开页面，
  付款人自行选择支付方式：QR、银行卡、银行转账或**加密货币**（TRON 上的
  USDT、以太坊上的 USDT/USDC 以及 BTC），并为该笔收款生成专属充值地址，
  支持部分支付累加。一个链接 = 一笔收款：最先完成支付的方式生效。状态可
  通过 `GET {checkout_url}/state` 免认证查询；加密支付的 `payin_credited`
  事件附带 `settled_via` 和 `crypto_amount`。支持 `success_url`、
  `failure_url`、`expires_in`（10 分钟到 7 天）与幂等（重试返回同一链接）。
  新增错误 `already_paid`、`checkout_expired` 与 `method_unavailable`。
  详见[收款指南](https://docs.cbpayapp.com/zh/guides/checkout)。

### v1.76

**变更**

- **卡支付捕获前认证过滤器**：只有当 3-D Secure 验证以认证成功或已尝试
  结束、且认证数据完整时，卡扣款才会发送给处理方；未经真实认证的尝试会在
  资金移动前被拒绝，付款人可以重试。支付页面还延长了设备数据收集时间
  （约 11 秒）以提高发卡行的批准率。在测试环境中，金额以 `.44` 结尾可
  模拟被该过滤器拒绝的尝试（完整表格见
  [测试环境](https://docs.cbpayapp.com/zh/environment-testing)）。

### v1.75

**新增**

- **payin 银行卡支付（`card`）**：`POST /v1/payins` 接受
  `method: "card"`（玻利维亚，BOB 或 USD）并返回 `payment_url` —
  一个带有你组织品牌的托管支付页面，付款人在安全字段中输入银行卡并完成其
  银行的 3-D Secure 验证。可选字段 `customer`、`success_url`、
  `failure_url` 与 `expires_at`。支付确认通过 `payin_received` webhook
  送达并像任何 payin 一样入账；若无人支付，`payin_expired` 会关闭该收款。
  详见[payin 指南](https://docs.cbpayapp.com/zh/guides/payins)。

### v1.74

**新增**

- **swaps 与地址筛查响应中的 `account_id`**：`POST/GET /v1/swaps` 与
  `POST/GET /v1/screenings/addresses` 的响应现在包含 `account_id`
  （操作所属的账户）。对单账户集成仅作参考；管理视图用它来归属每条记录。

## v1.73 · 5 个版本 - 2026年7月15日

### v1.73

**新增**

- **比特币链上通道（`btc`/`btc`）**：crypto 产品支持的第四条网络。
  每个账户现在出生即拥有**四个充值钱包**（新增比特币，bech32 地址
  `bc1q…`）；BTC 充值入账到 BTC 余额（约 30 分钟确认，3 个区块），
  链上提现接受 `chain: "btc"`（支持 bech32、taproot 与 legacy 目标
  地址；网络费由操作承担——收款方收到精确金额）。
  [隔离钱包](https://docs.cbpayapp.com/zh/guides/segregated-wallets)同样支持 `btc`/`btc`
  组合（没有 gas：费用从钱包余额中扣除）。Travel Rule 与其他网络
  一致，按 USD 估值。详见 [crypto 指南](https://docs.cbpayapp.com/zh/guides/crypto)。

### v1.72

**变更**

- **两步登录同样遵循手机号绑定冷却期**：登录 2FA 为 SMS/WhatsApp 且
  号码为最近绑定且未验证时，登录验证码会通过更强的因素发出（身份
  验证器应用，其次登录邮箱），而不是发送到该手机号——登录响应中会
  返回实际使用的 `channel`。没有替代因素时，登录返回
  `403 phone_binding_cooldown`，直到冷却期结束。验证码绝不会发送到
  从当前会话绑定的号码。详见[安全与 2FA 指南](https://docs.cbpayapp.com/zh/security-2fa)。

### v1.71

**变更**

- **手机号处于冷却期时，OTP 质询自动改用更强的因素**：手机号为最近
  绑定（24 小时冷却期）时，`POST /v1/otp/challenges` 在您已注册身份
  验证器应用或已验证邮箱的情况下不再阻止 — 质询会自动通过该渠道发出
  （层级 totp > email），响应中会返回实际使用的渠道。
  `403 phone_binding_cooldown` 仅在没有任何替代因素时返回。此前，
  即使拥有更强的因素，冷却期也会阻止所有 2FA 放宽操作（甚至包括停用
  email 渠道）。详见[安全与 2FA 指南](https://docs.cbpayapp.com/zh/security-2fa)。

### v1.70

**新增**

- **已验证身份成为档案数据的最终来源**：KYC/KYB 入驻获批后，
  `display_name`（个人 = 名 + 姓；企业 = 法定名称）、`tax_id` 和
  `country` 会自动由已验证的身份回填。详见 [KYC 指南](https://docs.cbpayapp.com/zh/guides/kyc)
  与[档案指南](https://docs.cbpayapp.com/zh/guides/profile)。

**变更**

- **`PATCH /v1/me` 在验证获批后锁定身份字段**：当
  `kyc_status: approved` 时，修改 `display_name`、`tax_id` 或 `country`
  将返回 `409 identity_locked`（[错误页](https://docs.cbpayapp.com/zh/errors)新增该代码）。
  `phone` 仍可通过其专属验证流程修改。

### v1.69

**新增**

- **AML 筛查 PDF 报告**：
  `GET /v1/aml/screenings/{screeningID}/report` 可将历史记录中的任一筛查
  下载为带你品牌的高管级 PDF 报告 —— 封面呈现决策及其风险信号灯、风险
  指标（制裁、观察名单、PEP、负面媒体等）、合并匹配、别名、术语表，以及
  列明所查国际数据源的最终背书章节。通过 `lang=en|es|zh` 支持三语
  （默认英文）。纯读取，无费用。详见 [AML 指南](https://docs.cbpayapp.com/zh/guides/aml#筛查-pdf-报告)
  的新章节。
- **新错误码 `invalid_language`**（HTTP 400）：PDF 报告的 `lang` 不是
  `en`、`es` 或 `zh`。详见[错误页面](https://docs.cbpayapp.com/zh/errors)。

**修复**

- **AML 筛查的企业字段**：示例与 spec 曾将
  `tax_id`/`registration_number`/`country_of_incorporation` 记为
  `customer.company` 的扁平字段，但筛查引擎会以 `422` 拒绝。标识符应放在
  `registration_authority_identification`，国家放在
  `place_of_registration`，`incorporation_date` 为 `{year, month, day}`
  对象。指南与 spec 已修正（已在生产环境验证）。

## v1.68 · 7 个版本 - 2026年7月14日

### v1.68

**新增**

- **新走廊：厄瓜多尔（USD）**，支持四种出金方式 —— `bank_transfer`
  （银行转账）、`deuna`（DeUna 钱包）、`cash_pickup`（柜台取现，无需
  账户）和 `cnb`（非银行代理点）。收款人支持结构化姓名
  （`given_name`/`first_surname`/...）或从 `name` 自动拆分，并可附带
  可选的汇款人信息块（`sender_name` 或其结构化字段）。各方式示例见
  [出金指南](https://docs.cbpayapp.com/zh/guides/payouts)与 API 规范。
- **新错误码 `channel_unavailable`**（HTTP 503）：该走廊的支付通道
  暂时不可用。请稍后使用相同的 `idempotency_key` 重试。详见
  [错误页面](https://docs.cbpayapp.com/zh/errors)。

### v1.67

**新增**

- **测试账户生而带有数据**:测试环境的每个新账户都自带约 6 个月的
  真实感演示历史,覆盖所有产品(payouts、payins、转账、加密、兑换、
  卡片、banking、联系人……),余额、对账单和分析报表开箱即用。适用于
  所有创建路径(注册、社交登录、管理员创建及控制台的 test/live 开关)。

**变更**

- **环境完全独立**:测试数据不再从生产快照刷新 —— 两个环境之间不复制
  任何内容。已更新[环境与测试](https://docs.cbpayapp.com/zh/environment-testing)指南。

### v1.66

**新增**

- **官方 MCP 服务器**上线 `https://mcp.cbpayapp.com`:将你的 AI 编辑器或
  助手(Cursor、VS Code、Claude、ChatGPT 及任何 MCP 客户端)连接到本文档
  —— 搜索、带真实示例的端点与错误目录,无需离开编辑器。只读、无需身份
  验证。新增 [MCP 服务器](https://docs.cbpayapp.com/zh/mcp)页面,支持一键安装与按客户端配置。

### v1.65

**变更**

- **测试环境**:新账户现在生而带有 `kyc_status: approved` —— 您可以
  立即演练所有产品,没有入驻闸门。适用于所有创建路径(注册、社交
  登录、管理员创建以及控制台的 test/live 切换);现有测试账户已追溯
  批准。**live** 环境不变:账户生而未验证,资金转出前 KYC/KYB 仍为
  强制要求。要在测试模式演练验证流程,请使用第三方 KYC/KYB 验证。

### v1.64

**变更**

- `PUT /v1/otp/preferences`:通过电话渠道(`sms`/`whatsapp`)为 `login`
  操作启用 2FA 时,现在要求账户电话号码已**验证**(先完成任意
  SMS/WhatsApp OTP 挑战)。号码未验证时 API 返回
  `409 phone_verification_required`。该保障可防止输错的号码在启用登录
  2FA 时把你锁在账户外。

### v1.63

**修复**

- `POST /v1/me/passkeys/register/begin` 与
  `DELETE /v1/me/passkeys/{passkeyID}` 现在接受不带请求体的请求,与规范
  文档一致(请求体可选)。此前会返回 `400 invalid_json`。有密码的账户仍
  必须提供当前密码(缺失或错误时返回 `403 invalid_password`);仅使用
  社交登录的账户凭其会话即可通过。

### v1.62

**修复**

- `POST /v1/me/totp/enroll` 现在接受不带请求体的请求,与规范文档一致
  (请求体可选)。此前会返回 `400 invalid_json`。有密码的账户仍必须提供
  当前密码(缺失或错误时返回 `403 invalid_password`);仅使用社交登录的
  账户凭其会话即可通过。
- `PUT /v1/otp/preferences` 选择 `email` 或 `totp` 渠道时返回 500 错误;
  已修复 — 四个渠道(`sms`、`whatsapp`、`email`、`totp`)均可正常保存。

**变更**

- PDF 对账单:操作状态现在以颜色区分(绿色已完成、琥珀色待处理、红色
  失败),便于快速浏览。

## v1.61 · 6 个版本 - 2026年7月13日

### v1.61

**新增 — 列表支持 CSV / Excel 导出**

- `movements`、`payouts`、`payins` 与 `transfers` 列表现在接受
  `format=csv` 或 `format=xlsx` 参数，将行数据下载为可直接用于会计的
  文件（每次下载最多 10,000 行；`from`/`to`、`status` 等过滤器同样
  生效）。

```bash
curl -o movements.xlsx "https://api.qbank.cl/platform/v1/movements?from=2026-07-01&to=2026-07-13&format=xlsx" \
  -H "Authorization: Bearer pk_…"
```

- 不带 `format` 时响应仍是常规的分页 JSON —— 无兼容性变更。

### v1.60

**Breaking — 隔离钱包迁移至 `/v1/segregated-wallets`**

- 所有隔离钱包路由从 `/v1/wallets*` 重命名为 `/v1/segregated-wallets*`。
  方法、参数、响应结构、费用和 webhook 均不变——只有路径前缀改变。
  **没有兼容别名**：旧的 `/v1/wallets*` 路由现在返回 `404`。
- 映射（15 条路由遵循同一模式）：

| 之前 | 现在 |
|---|---|
| `POST/GET /v1/wallets` | `POST/GET /v1/segregated-wallets` |
| `POST /v1/wallets/import` | `POST /v1/segregated-wallets/import` |
| `GET /v1/wallets/{id}`（+ `/balance`、`/deposits`、`/transactions`） | `GET /v1/segregated-wallets/{id}`（+ 相同子路由） |
| `POST/GET /v1/wallets/{id}/sends`（+ `/{sendID}`、`/receipt`） | `POST/GET /v1/segregated-wallets/{id}/sends`（+ 相同子路由） |
| `GET /v1/wallets/{id}/deposits/{depositID}/receipt` | `GET /v1/segregated-wallets/{id}/deposits/{depositID}/receipt` |
| `POST /v1/wallets/{id}/export` · `GET/POST .../auto-forward` | `POST /v1/segregated-wallets/{id}/export` · `GET/POST .../auto-forward` |

- 钱包发送/入金的响应、webhook 和回执邮件中的 `receipt_url` 现在指向
  新路径。
- 原因：通用前缀 `/v1/wallets` 经常与 [crypto](https://docs.cbpayapp.com/zh/guides/crypto) 产品的
  **充值钱包**混淆。充值钱包不受影响，仍位于 `/v1/crypto/wallets`。

**新增 — 每个钱包响应带有 `type` 鉴别字段**

- 充值钱包（`/v1/crypto/wallets`）现在包含 `type: "deposit"` 和
  `receive_only: true`。
- 隔离钱包包含 `type: "segregated"`。
- 请用它防御性地区分两个产品——不要只依赖路由。

### v1.59

**新增 — `payin_expired` webhook：未支付代收的自动关闭**

- 当一笔待支付的代收（二维码或托管 checkout）在未收到付款的情况下过期或
  失败时，payin 现在会自动从 `pending` 变为 `expired`（或 `failed`）——
  此前可能会无限期停留在 pending。
- 新增 **`payin_expired`** webhook 事件，携带 `payin_id`、最终状态、
  通道和参考号，让您无需轮询即可在自己的系统中关闭该笔代收。可通过
  `POST /v1/webhooks/subscriptions` 订阅。
- 任何情况下都不产生资金变动：如需重新收款，请创建新的 payin。

### v1.58

**变更 — 凭证、对账单与邮件全新设计**

- 所有 PDF 凭证（`GET .../receipt`）升级为银行级设计：带 logo 与凭证编号的页眉、
  产品图标、突出显示的金额、双栏明细、带二维码的"可验证文档"区块，以及机构化页脚。
  品牌符号以水印形式淡淡呈现；未完成的操作仍保留状态水印。
- 对账单 PDF（`GET /v1/reports/statement?format=pdf`）新增带图标的汇总卡片、
  对账已验证徽章及各分区图标；Excel 导出结构不变。
- 邮件（凭证、验证码与安全通知）现共用带有贵组织机构化页眉与页脚的品牌模板。
- 法币转出凭证中的收款银行始终按名称显示：若操作以目录中的 `bank_code` 创建，
  会自动解析为银行名称。
- API 无变化：路由与响应结构不变，仅文档与邮件的外观更新。

### v1.57

**新增 — 用户会话的刷新令牌（refresh tokens）**

- 每次登录（密码、OTP、社交登录、通行密钥、handoff 和注册）现在会在
  24 小时 `access_token` 之外一并返回一次性 **`refresh_token`**（`rt_…`），
  用于免重新登录续期会话：`POST /v1/auth/refresh` 签发新的令牌对并轮换
  刷新令牌（每次轮换有效 30 天，自最初登录起绝对上限 90 天）。详情与
  安全规则见[身份认证 → 会话续期](https://docs.cbpayapp.com/zh/authentication#session-renewal-refresh-tokens)。
- **严格轮换与防盗检测**：交换时会吊销该设备之前的 access token；提交
  已被交换过的刷新令牌会吊销整条令牌链，并在
  `GET /v1/me/security/events` 中记录 `refresh_token_reuse` 事件。退出
  登录、吊销会话或修改密码也会使刷新令牌失效。
- 新错误码：`401 invalid_refresh_token`。API key（`pk_`）不受影响：
  永不过期，也不使用刷新机制。

### v1.56

**新增 — 使用模拟资金的测试环境（沙盒）**

- 新的 **test** 环境：`https://cryptobank.qbank.cl/platform`。API 完全
  相同，所有通道由确定性的内部模拟器提供服务 —— 始终可用，不依赖任何
  第三方。操作在几秒内自动完成，**魔法值**（`.99`/`.77` 金额、
  `REJECT` 收款人、OTP `000000` 等）可强制触发其他所有结果。完整指南见
  [环境与测试](https://docs.cbpayapp.com/zh/environment-testing)。
- **按环境区分的 API 密钥**：test 只签发和接受 `pk_test_` 密钥；live
  只接受 `pk_`。另一环境的密钥返回 `401` —— 不可能误用错环境。
- 每个响应都带有 **`CBPay-Environment`** 头（`test` | `live`），
  `GET /healthz` 返回 `livemode`。
- **一键 test/live 切换**：`POST /v1/auth/environment-handoff`（live）
  签发一次性 60 秒令牌，在 `POST /v1/auth/handoff`（test）兑换为测试
  环境会话，并自动创建镜像账户。

## v1.55 · 9 个版本 - 2026年7月12日

### v1.55

**新增 — AML 筛查审计历史**

- `GET /v1/aml/screenings` 与 `GET /v1/aml/screenings/{screeningID}` 列出并查询
  本地保存的每条 AML 筛查（个人、企业及重新筛查）——主体、风险、费用与完整结果。
- `POST /v1/aml/screenings` 与 `POST /v1/aml/rescreen` 现须 `idempotency_key`
  （操作收费）。相同键重放返回原记录且 `idempotency_hit: true`，不会重复扣费。
- `PATCH /v1/aml/monitoring` 将每次启用/停用写入同一历史（`kind: monitoring`）；
  状态实际变更时须提供 `idempotency_key`（启用会收费）。

### v1.54

**新增 — 链上提现的 Travel Rule（FATF R.16）**

- 超过配置阈值（默认 1,000 USD）的加密货币提现，现在必须在资金移动前
  申报受益人：自有钱包用 `wallet_type: "self_hosted"` +
  `beneficiary_name`；目的地在其他机构时用 `travel_address` +
  `beneficiary_name`（数据交换内联完成，付款地址由收款机构提供）。
  低于阈值一切不变。
- 提现响应新增 `travel_rule_status`
  （`not_required` / `self_hosted_attested` / `approved`）。
- 新增错误码：`travel_rule_required`、
  `travel_rule_beneficiary_required`、`travel_rule_address_mismatch`、
  `travel_rule_rejected`、`travel_rule_pending`、
  `travel_rule_incomplete_approval`、`travel_rule_unavailable`。详见
  [加密货币指南](https://docs.cbpayapp.com/zh/guides/crypto)与[错误页](https://docs.cbpayapp.com/zh/errors)。

### v1.53

**新增 — 余额历史中的银行序列**

- `GET /v1/balances/history` 的 `assets` 现在包含银行账户
  （`BANK_USD`、`BANK_EUR`）的每日序列，各以自身货币（2 位小数）呈现，
  可作为 USDT/USDC/BTC/GOLD 旁的又一筛选项直接绘图。它们仍不计入
  `total_usd` 聚合——该聚合仅覆盖运营余额。
  [分析](https://docs.cbpayapp.com/zh/guides/analytics)指南已更新。

### v1.52

**新增 — 付款与收款列表的国家筛选**

- `GET /v1/payouts` 和 `GET /v1/payins` 支持 `country` 筛选
  （ISO 3166-1 alpha-2，例如 `?country=MX`），可与 `status`、
  `from`/`to` 及分页组合使用。[付款](https://docs.cbpayapp.com/zh/guides/payouts)与
  [收款](https://docs.cbpayapp.com/zh/guides/payins)指南已更新。
- `GET /v1/rates` 的 `fees` 块现在返回**有效**费用配置（组织默认值已与账户覆盖项解析合并）。
  此前无覆盖项的账户会看到 `fees: []`；请用此块在创建操作前报价确切费用。

### v1.51

**变更 — 按账户类型的钱包限额**

- **充值钱包**：每个账户——个人和企业——每个受支持组合（`tron`/`usdt`、
  `eth`/`usdt`、`eth`/`usdc`）都恰好持有**一个充值钱包**，注册时自动免费
  开通。`POST /v1/crypto/wallets` 现在仅用于补齐缺失的组合；组合已存在时
  对所有账户类型都返回 `422 wallet_limit_reached`（此前企业可创建更多）。
- **隔离钱包**：现在个人账户也可使用，每个网络+资产组合限 **1 个**
  （第二次尝试返回 `422 wallet_limit_reached`）。企业账户仍不限数量。
  `403 company_required` 错误不再适用于隔离钱包。
- [加密货币](https://docs.cbpayapp.com/zh/guides/crypto)与[隔离钱包](https://docs.cbpayapp.com/zh/guides/segregated-wallets)
  指南、[个人与企业](https://docs.cbpayapp.com/zh/concepts/persons-companies)页面及
  [错误](https://docs.cbpayapp.com/zh/errors)页面已更新。

### v1.50

**新增 — 持续交易监控（合规控制）**

- 平台现已通过银行级合规控制实时监控每一笔操作。对绝大多数客户而言这是
  无感的：不改变任何流程，也不会增加可感知的延迟。
- 新增错误码已记录在[错误](https://docs.cbpayapp.com/zh/errors)页面：`403 compliance_hold`
  （操作被合规拦截）、`403 geo_restricted`（不支持的司法辖区）和
  `503 compliance_check_unavailable`（合规检查暂时不可用 — 操作未发出；
  请使用相同的幂等键重试）。

### v1.49

**新增 — 文档支持 3 种语言（默认英语）**

- 本文档现已完整提供**英语**（默认语言）、**西班牙语**和**简体中文**
  三个版本。可通过站点顶部的语言选择器切换语言。
- API Reference 同样提供三种语言版本（端点与示例完全一致，仅描述文字
  不同）。
- Postman 集合与编译版 Markdown 指南在任意语言版本下都保持最新。

### v1.48

**新增 — 钱包筛查（区块链地址的 AML 风险）**

- 新产品：`POST /v1/screenings/addresses` 依据全球链上情报（制裁名单、
  非法资金暴露等）评估任意区块链地址，并返回
  `Low`/`Medium`/`High`/`Severe` 风险等级及完整证据。每次扫描收取固定
  费用（`address_screening`，失败时自动退款），且必须携带幂等键。历史
  记录可通过 `GET /v1/screenings/addresses`（+`/{id}`）查询。
- **免费的自动保护**：链上提现在签名前会先评估目标地址（严重风险 ⇒
  拒绝并全额退款）；入账存款在入账前会先评估发送方（严重 ⇒ 暂扣待
  合规审核；高风险 ⇒ 入账并附带警报）。
- 新增 webhook：`crypto_deposit_held` 和 `crypto_deposit_alert`。
- 新增指南：[钱包筛查](https://docs.cbpayapp.com/zh/guides/screenings)。

### v1.47

**新增 — 通过 CDN 提供的公开资源（头像、品牌素材、收款二维码）**

- **CDN 头像**：`avatar_url`（出现在 `PUT /v1/me/avatar`、
  `GET /v1/resolve` 和联系人接口中）现在是一个**绝对公开 URL**，图片
  发布到 CDN 后无需认证即可加载；`GET /v1/avatars/{accountID}` 以
  `302` 重定向到该 URL（旧版头像仍然直接返回）。
- **品牌素材 URL**：`GET /v1/branding` 新增 `logo_url` 和 `symbol_url`
  —— 指向 Logo 的公开 CDN URL，前端无需解码 base64 即可套用主题
  （`*_png_base64` 字段依然保留）。
- **收款二维码（Payin QR）**：QR 收款（`POST /v1/payins`，method 为
  `qr`）新增 `qr_image_url`，即发布到 CDN 的二维码 PNG，与原有的
  base64 `qr_image` 并存。直接放进 `` 标签即可。

不会破坏任何现有集成：所有既有字段均保留；这些 URL 都是新增的。
指南：[个人资料](https://docs.cbpayapp.com/zh/guides/profile) 与 [收款](https://docs.cbpayapp.com/zh/guides/payins)。

## v1.46 · 7 个版本 - 2026年7月11日

### v1.46

**新增 — 合规目录**

- 新增 `GET /v1/aml/catalogs`：构建合规与验证表单所需的全部目录
  （性别、各国法律实体形式、收入/财富来源、行业标准、ISO-3166 国家
  与行政区划）。这些数据此前无法通过 API 获取。

**变更**

- `GET /v1/rates` 与 `GET /v1/rates/history` 的 `asset_prices` 区块
  不再包含内部字段 `source`；请使用 `settlement_grade` 和 `updated_at`
  来判断价格是否可执行以及其新鲜程度。

指南：[AML 筛查](https://docs.cbpayapp.com/zh/guides/aml)。

### v1.45

**新增 — 每个账户自创建起即拥有其充值钱包**

- 账户创建时（个人或企业），系统会自动且**免费**开通其三个加密充值
  钱包：`tron`/`usdt`、`eth`/`usdt` 和 `eth`/`usdc`。注册完成后，
  `GET /v1/crypto/wallets` 即可返回这三个地址（开通在后台进行；在
  注册的当秒查询可能需要稍等片刻）。
- `POST /v1/crypto/wallets` 现在用于创建**额外**的钱包（企业账户）；
  个人账户自注册起已占用每种组合的名额。此变更之前创建的账户已补齐
  缺失的钱包。

**变更**

- 公开账户注册现在按 IP 限流（`429 too_many_attempts`）。

指南：[加密货币](https://docs.cbpayapp.com/zh/guides/crypto)。

### v1.44

**新增 — 完整可追溯性：对账单中的银行业务、费用明细拆分与钱包托管**

- **更丰富的对账单**：新增 `card_transactions`（卡消费）、`swaps`
  （余额兑换）和 `banking_operations` 区块。如果你使用 Banking，你的
  银行账户会以 `BANK_USD`/`BANK_EUR` 镜像余额的形式在 `assets` 区块
  中对账。
- **费用明细拆分**：payout、payin 和加密提现现在将费用拆分为
  `fee_percent` 和 `fee_fixed`（两者相加恰好等于 `fee`）；独立收费
  项带有 `fee_model: "fixed"`，并在 PDF/Excel 中标注为 **Fixed Com**。
- **新增回执**：`GET /v1/banking/operations/{id}/receipt`、
  `GET /v1/wallets/{walletID}/sends/{sendID}/receipt` 和
  `GET /v1/wallets/{walletID}/deposits/{depositID}/receipt`。
  `banking_operation_status_changed` webhook 现在包含 `receipt_url`。
- **独立钱包托管**：每个钱包新增 `custody` 字段（`cbpay` | `client`）；
  平台会同步完整的链上活动，并发送 `wallet_external_movement` webhook
  （在平台之外签名的转账，`client` 托管下属于预期行为）以及
  `wallet_key_compromise_suspected`（严重警报）。
- **分析（Analytics）**：新增 `sections.banking.volume`（经由你的银行
  账户流转的资金，同时计入 `gross_volume`）、
  `sections.verifications.fees_by_kind`（KYC 与 KYB 支出分开统计）、
  `sections.adjustments` 和 `deposits.wallet_fees_usd`。
- **按钱包保证的账务**（`cbpay` 托管）：对账单中的全生命周期对账，
  以及每笔发送详情中的 `funding_sources`（充值→发送的 FIFO 归因）。
  `BANK_*` 镜像余额也会出现在 `GET /v1/balances` 中，并带有
  `custody: "banking"`。

指南：[对账单](https://docs.cbpayapp.com/zh/guides/statement)、[银行业务](https://docs.cbpayapp.com/zh/guides/banking)、
[独立钱包](https://docs.cbpayapp.com/zh/guides/segregated-wallets)、
[回执](https://docs.cbpayapp.com/zh/guides/receipts) 与 [分析](https://docs.cbpayapp.com/zh/guides/analytics)。

### v1.43

**新增 — 面向仪表盘的历史序列**

- **`GET /v1/rates/history`**：你账户汇率的演变（每个数据点均含
  payout 和 payin 两侧），支持 `day` 或 `hour` 粒度，并为每种货币
  提供带符号的 `change_pct` —— 可直接用于带 "+3.4% / −3.0%" 徽章的
  汇率图表。还包含 BTC 和 GOLD 的美元参考序列。
- **`GET /v1/balances/history`**：你余额的每日演变 —— 每种资产一条
  序列，包含每日收盘余额（无缺口）、按每日历史价格估值的美元汇总
  序列、期间的流入/流出以及当前快照 —— 带图表的余额卡片所需的一切。
- 汇率历史以约 90 天的每日汇率回填起步，此后持续记录。

完整示例见 [分析](https://docs.cbpayapp.com/zh/guides/analytics)。

### v1.42

**新增 — 带真实性验证的 PDF 回执**

- 每个交易类产品都有其**品牌化 PDF 回执**：payout、payin、内部转账、
  加密提现与充值（`GET /v1/crypto/transactions` 中新增 `deposit_id`）、
  swap 及卡消费均支持 `GET .../receipt`。语言参数 `?lang=es|en`。
- 这些产品的每个响应以及最终状态的 webhook 中均包含 **`receipt_url`**：
  前端永远无需手动拼接 URL。
- **公开真实性验证**：每份 PDF 都带有签名代码和二维码，扫码打开
  `GET /verify/receipts/{code}`（无需凭证）—— 对 API 返回 JSON，对
  浏览器返回品牌化网页，始终显示**真实、当前**的状态与金额，绝不
  展示收款人的个人数据。
- **未完成**操作的回执带有对角线水印（"PROCESSING" / "FAILED"）：
  处理中的 PDF 永远不可能被冒充为付款凭证。
- 操作到达最终状态时**自动发送邮件**并附上 PDF，可按账户退订
  （`PATCH /v1/me`，设置 `receipt_emails: false`）。

**新增 — 品牌**

- `GET /v1/branding`：平台的生效品牌（Logo、颜色、名称），白标前端
  可直接通过 API 套用主题。

**变更**

- PDF [对账单](https://docs.cbpayapp.com/zh/guides/statement) 现在使用品牌的**真实 Logo** 与
  Inter 字体渲染（此前为文字字标），Excel 也在汇总表中加入了 Logo。

完整指南见 [回执](https://docs.cbpayapp.com/zh/guides/receipts)。

### v1.41

**新增 — 独立钱包（仅限企业账户）**

- 拥有**独立余额**（不在总账内）的链上钱包：创建
  （`POST /v1/wallets`）、列表与详情，**导入**带私钥的外部钱包
  （`POST /v1/wallets/import`），**导出**私钥
  （`POST /v1/wallets/{id}/export`，共享托管），以及直接从钱包
  **发送**加密货币（`POST /v1/wallets/{id}/sends`）。
- 实时链上查询：`GET .../balance`（含 gas）、`.../deposits` 和
  `.../transactions`；可配置的**自动归集（auto-forward）**
  （`GET`/`POST .../auto-forward`）。
- 发送所需的 **gas** 由客户承担：没有 gas 时发送返回
  `422 insufficient_gas`。导入与导出要求已登录的用户会话并开启 2FA。
- 新增费用：`wallet_import`、`wallet_export`、`wallet_send`。
- 新增 webhook：`wallet_deposit_received`、`wallet_send_status_changed`、
  `wallet_key_exported`。新增服务开关：`wallets`。
- [对账单](https://docs.cbpayapp.com/zh/guides/statement) 与 [仪表盘](https://docs.cbpayapp.com/zh/guides/analytics)
  均包含独立钱包区块。

完整指南见 [独立钱包](https://docs.cbpayapp.com/zh/guides/segregated-wallets)。

### v1.40

**新增 — 账户资料、凭证与安全**

- **密码**：自助修改（`POST /v1/me/password`，会吊销其他所有会话）
  以及基于验证码的找回（`POST /v1/auth/password/forgot` →
  `POST /v1/auth/password/reset`），通过邮箱或已验证的手机号。forgot
  始终返回 200（绝不泄露账户是否存在）。
- **登录邮箱**：经验证的变更（`POST /v1/me/email/change` → `confirm`，
  验证码发送到**新**邮箱）以及当前邮箱的验证
  （`POST /v1/me/email/verify`）。
- **永久别名**（`PUT /v1/me/alias`）与**个人资料二维码**
  （`GET /v1/me/qr`）：用于标识你的账户以**接收**转账。转账接受
  `to_alias` 和 `to_qr_token`；`GET /v1/resolve` 可在发送前预览
  收款人。
- **头像**：`PUT`/`DELETE /v1/me/avatar` 与 `GET /v1/avatars/{id}`。
- **自助 2FA**（`GET`/`PUT /v1/otp/preferences`）：按操作启用并选择
  渠道 —— 除 SMS/WhatsApp 之外，现在还支持**邮箱**和**验证器应用
  （TOTP）**。加强安全不受限制；降低安全等级需要验证。
- **验证器应用（TOTP）**：`POST /v1/me/totp/enroll`（二维码）→
  `confirm`（返回 10 个一次性备份码）、`DELETE`，以及
  `POST /v1/me/totp/recovery-codes` 用于重新生成备份码。
- **通行密钥（Passkeys / WebAuthn）**：使用设备生物识别（Face ID、
  Touch ID、Windows Hello、安全密钥）的免密码登录。注册
  （`/v1/me/passkeys/register/begin|finish`）、管理（`GET`、`DELETE`）
  与登录（`/v1/auth/passkey/login/begin|finish`）。
- **会话与活动**：`GET /v1/me/sessions` + 吊销单个或全部会话，以及
  `GET /v1/me/security/events`（账户安全历史）。
- 敏感事件（密码或邮箱变更、验证因子的添加/移除）会发送邮件提醒。

## v1.39 · 7 个版本 - 2026年7月10日

### v1.39

**新增 — 可复用的已验证身份（统一的 KYC/KYB）**

- 客户已通过的 KYC/KYB 验证成为其在 CBPay 内的**唯一身份**：其数据
  与文件可在其他产品中复用，无需重复填写或重复上传。指南：
  [可复用身份](https://docs.cbpayapp.com/zh/guides/kyc#one-verification-for-everything-reusable-identity)。
- **卡片**：你账户的首次发卡会**从你已通过的验证中**自动填充持卡人
  身份与文件 —— 你只需发送 `occupation` 和 `salary_usd`。显式提供的
  字段仍然优先。
- **合规报告（KYB）**：`GET /v1/kyb/submissions/{id}/report` 下载
  该验证的签名合规报告（PDF）。

**变更 — Breaking**

- **`POST /v1/banking/third-parties`** 现在要求第三方**已通过**验证
  的 `verification_id`。`type` 由验证类型推导（KYC ⇒ INDIVIDUAL，
  KYB ⇒ COMPANY），身份自动填充，已验证的文件会重新交付给银行服务
  （`documents_synced`）。现有第三方继续正常运作。
- 面向指定人员（企业账户）的 **`POST /v1/cards`** 现在要求该人员
  **已通过** KYC 的 `cardholder.verification_id`；其身份与文件来自
  该验证。
- 新增错误：`422 verification_required`、
  `422 verification_not_approved`、`422 verification_kind_mismatch`、
  `422 verification_invalid`。

### v1.38

**新增 — 账户汇总（分析）+ 第三方银行用户**

- **`GET /v1/analytics/summary`**：一次调用即可获取构建仪表盘所需
  的账户全部序列与统计 —— 按周期（日/周/月，含与上一周期的对比）的
  总量（流入/流出）、交易数与新用户数，按国家的全局视图，以及
  每个服务（payouts、payins、充值、提现、内部转账、swaps、卡片、
  banking、KYC/KYB、AML、联系人）各自的区块及其维度（国家、货币、
  方式、状态、链、商户）。另有 `spending`（你在各服务上消耗的费用）
  与按美元估值的 `balances`。新增指南：
  [你的账户汇总](https://docs.cbpayapp.com/zh/guides/analytics)。
- **第三方银行用户（仅限企业）**：`POST/GET
  /v1/banking/third-parties`（+文件、提交、账户、余额），可将你的
  终端客户注册为独立的银行用户，拥有自己的身份/KYC 及以其名义开立
  的账户。按账户隔离。
- **新限制**：个人账户最多只能持有 1 个银行账户
  （`409 banking_account_limit`）。

### v1.37

**变更 — 玻利维亚与委内瑞拉汇率**

- `GET /v1/rates` 中的 USD→BOB 与 USD→VES 汇率现在反映我们实际用于
  处理你付款的市场（此前发布的参考汇率与实际应用值不符）。
- 若其中某一汇率暂时不可用，该国家会从 `GET /v1/rates` 中省略，且
  该货币的操作返回 `422 currency_not_supported`，直至恢复 —— 我们
  绝不使用错误的汇率报价。建议在以 `BOB` 或 `VES` 报价前查询
  `GET /v1/rates`（或订阅汇率 webhook）。

### v1.36

**新增 — Swap：在你的余额之间兑换**

- 新产品 `swaps`：在 `USDT`、`USDC`、`BTC` 和 `GOLD` 之间即时兑换，
  资金不离开你的账户 —— 支持任意币对，包括 `BTC` ↔ `GOLD` 直接兑换。
  `POST /v1/swaps`（同步，带 `idempotency_key`）、
  `GET /v1/swaps/quote`（免费指示性报价）以及 `GET /v1/swaps`
  （+`/{id}`）查询历史。
- 报价即你账户的执行汇率：报价 = 到账，无额外费用。BTC/GOLD 采用
  实时价格（价格不够新鲜时 swap 会以 `503 pricing_unavailable`
  被拒绝）。
- 涉及 BTC/GOLD 的兑换与 payout 及卡消费共享单笔与 24 小时交易量
  限额（`GET /v1/settlement`）。新增指南：[Swaps](https://docs.cbpayapp.com/zh/guides/swaps)。

### v1.35

**新增 — 联系人与按手机号发送**

- **联系人簿**（`/v1/contacts`）：完整 CRUD，支持搜索与收藏。每次
  发送（内部转账、payout、加密提现）都会**自动将其目标保存为
  联系人** —— 自动去重；可通过 `"save_contact": false` 关闭。
- **手机通讯录导入**（`POST /v1/contacts/import`，每次最多 1,000
  条）：将手机号规范化为 E.164，并告知哪些联系人**已拥有 CBPay**
  （`has_cbpay`，仅在你的运营方范围内匹配）。
- **按手机号转账**：`POST /v1/transfers` 接受 `to_phone`（仅限手机
  号已通过 **OTP 验证**的账户；存在歧义时返回
  `422 recipient_ambiguous`）以及 `to_contact_id`。
- **快捷发送给联系人**：payout 支持 `beneficiary_contact_id`（使用
  联系人已保存的收款人信息），加密提现支持 `to_contact_id`（使用其
  已保存的地址）。新增指南：[联系人](https://docs.cbpayapp.com/zh/guides/contacts)。

### v1.34

**新增 — KYC/KYB 身份验证（托管向导、OCR 文件与视频活体检测）**

- **强制入驻**：每个新账户在运营前必须通过其身份验证（个人 ⇒ KYC，
  企业 ⇒ KYB）。在此之前只能**入金**（payins、加密充值、入账转账）
  和读取；其余操作均返回 `403 verification_required`。通过
  `POST /v1/me/verification/link` 获取你的链接，并用
  `GET /v1/me/verification` 查询状态 —— 通过后你的 `kyc_status`
  会自动更新。现有账户已被豁免并标记为通过。
- **第三方验证（仅限企业账户）**：生成托管链接
  （`POST /v1/kyc/links`、`POST /v1/kyb/links`）或通过 API 提交数据
  （`POST /v1/{kyc,kyb}/submissions`），使用 presign + OCR 上传文件，
  并通过活体检测链接完成 liveness 校验。新增固定费用
  `kyc_verification` / `kyb_verification`，在创建时计费（必须携带
  `idempotency_key`，失败时自动退款）。
- 7 个新 webhook：`kyc/kyb_verification_status_changed`、
  `kyc/kyb_link_completed`、`kyc/kyb_document_validated`、
  `kyc_liveness_completed`。完整指南见
  [KYC 与 KYB 验证](https://docs.cbpayapp.com/zh/guides/kyc)。

**变更（BREAKING）— 名单筛查更名为 AML**

- `POST /v1/kyc`、`POST /v1/kyc/rescreen` 和 `PATCH /v1/kyc/monitoring`
  已被**移除**：名单筛查现位于 `POST /v1/aml/screenings`、
  `POST /v1/aml/rescreen` 和 `PATCH /v1/aml/monitoring`（语义相同，
  沿用相同的 `compliance_*` 费用）。错误码 `no_kyc` 变为
  `no_screening`，且筛查不再影响你的 `kyc_status`。新增
  `aml_screening_updated` webhook 及新的 `aml` 服务开关（`kyc` 开关
  现在管控身份验证）。指南：[AML 筛查](https://docs.cbpayapp.com/zh/guides/aml)。

### v1.33

**修复 — 多方式国家在不带 `method` 时的银行目录**

- `GET /v1/payouts/banks?country=VE` 曾返回 `400` 要求提供 `method`，
  而 `?country=BO` 返回 `400 payout_corridor_unsupported`。现在
  **不带 `method` 的目录会返回该国家所有 payout 方式的银行并集**
  （按代码去重），与本文档的承诺一致；传入 `method` 则限定为单一
  通道（该参数现已在参考文档中说明）。

## v1.32 · 7 个版本 - 2026年7月9日

### v1.32

**新增 — 使用 BTC 与 GOLD 进行卡消费（即时兑换）**

- `spending_asset` 现在也接受 **BTC 和 GOLD**：消费按**每个事件发生
  时刻的有效价格**兑换（与 `GET /v1/rates` 的 `settlement` 区块中的
  价格一致）。
- **授权**：预留等值金额外加一小块缓冲（并非扣费；结算时返还）。
  如果执行价格不可用，消费会以 `pricing_unavailable` 被拒绝 ——
  你的余额绝不会以不可信的价格被兑换。
- **结算**：最终金额按扣款时刻的价格重新报价，缓冲的多余部分自动
  返还。授权的**冲正**：原额返还，不做兑换。扣款后的**退款/调整**：
  按事件时刻的价格重新兑换（价格波动由你的余额承担）。
- BTC/GOLD 消费与 payout 共享账户的波动性资产限额：单笔
  （`settlement_limit_exceeded`）与 24 小时交易量
  （`settlement_daily_limit_exceeded`）。

### v1.31

**新增 — 选择你的卡从哪个余额消费（USDT 或 USDC）**

- 每张卡现在都有一个**消费资产**（`spending_asset`）：其消费从账户
  的 USDT 或 USDC 余额扣款，与美元 1:1，且无兑换费用。默认 USDT
  （与历史行为完全一致）。
- 可在创建卡时设置（`POST /v1/cards` 中的 `spending_asset`），或
  随时通过 `PATCH /v1/cards/{cardID}` 修改。修改仅对未来的消费生效：
  处理中的授权仍保留（并退回到）其扣款时的资产。
- 卡交易现在暴露 `spend_asset` 和 `spend_amount`（实际扣款的余额与
  金额）；`amount_usd` / `amount_usdt` 仍为美元参考值。单卡限额仍
  以美元计量。
- 新增错误：`400 spending_asset_unavailable`（BTC/GOLD 不可用于卡
  消费），以及当运营方停用该资产时授权被拒的
  `spending_asset_disabled`。

### v1.30

**变更 — 多资产结算加固**

- 使用 BTC/GOLD 的付款在单笔限额之外，新增**按账户滚动 24 小时
  交易量上限**（`422 settlement_daily_limit_exceeded`）。它以
  `volatile_daily_limit_usdt` 显示在 `GET /v1/settlement` 中。
- **卡片**费用（发卡、注销与月费）现在也从你的默认结算余额扣款，
  与其他服务一致。卡**消费**仍以 USDT 结算。

### v1.29

**新增 — 用任意余额支付 payout 与服务费（多资产结算）**

- payout 与服务费（KYC、钱包创建、banking）现在可以从**你的四个
  余额中的任意一个**（USDT、USDC、BTC、GOLD）扣款。定价仍以 USDT
  报价；总额按当时的有效结算价格换算为所选资产。详情见
  [资金模型](https://docs.cbpayapp.com/zh/concepts/money-model#choose-which-balance-pays)。
- 新增 `GET/PUT /v1/settlement`：设置你账户的**默认余额**
  （`default_settlement_asset`）。可在 `POST /v1/payouts` 及 QR
  confirm 中通过 `settlement_asset` 按单笔覆盖。
- payout 响应现在记录 `settlement_asset`、`settlement_amount`
  （实际扣款的准确金额 —— 也是失败时退款的金额，绝不重新报价）
  和 `settlement_rate`。
- `GET /v1/rates` 新增 `settlement` 区块，包含每个已启用资产的有效
  价格；`asset_prices` 现在携带 `source`、`updated_at` 和
  `settlement_grade`（价格是否适合执行）。
- 新增错误：`503 pricing_unavailable`（BTC/GOLD 执行价格不可用）、
  `400 settlement_asset_disabled`、`400 invalid_settlement_asset`
  和 `422 settlement_limit_exceeded`（波动性资产的单笔限额）。

### v1.28

**变更 — 预告银行转账的短参考码**

- `POST /v1/payins` 使用 `method: "bank_transfer"` 时现在返回一个
  **12 位字母数字短 `reference`**（例如 `CBW4N8R2T6P9`），取代原来
  的 UUID：银行的备注字段有硬性长度限制（巴拉圭/SIPAP 限制为 20 个
  字符且不允许特殊字符），UUID 从来放不下。
- 自动匹配接受新参考码，**同时**继续接受旧预告中的 UUID —— 现有的
  `pending` payin 不受影响。金额+货币的兜底匹配保持不变。
- `GET /v1/payins` 与详情接口在 payin 处于 `pending` 期间通过
  `reference` 暴露预告参考码。

### v1.27

**新增 — 巴拉圭收款（预告银行转账）**

- 新收款通道 `PY`/`PYG`/`bank_transfer`：通过 `POST /v1/payins`
  预告存款，你的付款人转账（SIPAP 或收款银行的行内转账）并在备注中
  填写 `reference`，款项按你的 `payin_rate` 自动以 USDT 入账，与
  其他国家一致。指南见 [收款](https://docs.cbpayapp.com/zh/guides/payins)。
- 瓜拉尼不使用小数：请预告**精确的整数金额**（例如 `"596000"`）。
  金额+货币的兜底匹配照常适用。
- 该通道出现在 `GET /v1/payins/methods` 中，且
  `delivery: polling`。

### v1.26

**新增 — 多币种虚拟余额（USDT、USDC、BTC、GOLD）**

- 每个账户现在持有**四个独立的虚拟余额**：`USDT`（运营货币）、
  `USDC`、`BTC`（8 位小数，聪）和 `GOLD`（足金克数，6 位小数，
  托管方背书）。它们永不混合，也绝不自动兑换。详情见
  [资金模型](https://docs.cbpayapp.com/zh/concepts/money-model)。
- **`GET /v1/balances`** 始终返回全部四个余额（未使用该货币时为
  零），`GET /v1/movements` 可用 `?asset=` 按货币筛选。
- **多币种内部转账**：`POST /v1/transfers` 接受 `asset`（默认
  `USDT`，可选 `USDC`、`BTC`、`GOLD`）—— 始终在**同一货币**的余额
  之间进行，无兑换、无费用。
- **链上 USDC**：创建 `eth`/`usdc` 钱包，通过以太坊充值与提现
  USDC。每笔充值入账到其对应资产的余额。指南见
  [加密货币](https://docs.cbpayapp.com/zh/guides/crypto)。
- **参考价格**：`GET /v1/rates` 包含 `asset_prices`，提供各货币的
  美元参考价（BTC 按单位、GOLD 按克）—— 仅用于估值，无兑换、无
  点差。
- **多币种对账单**：新增 `assets` 区块，每个非 USDT 余额独立对账
  （期初/流入/流出/期末及各自的 `balanced` 标志），PDF 与 Excel
  导出中同样包含。
- payout、payin、卡片与服务费仍**仅针对 USDT 余额**运作。

## v1.25 · 8 个版本 - 2026年7月8日

### v1.25

**新增 — 社交登录（Google、Apple、Microsoft、Meta）**

- 通过令牌交换实现 Google、Apple、Microsoft 与 Facebook 的**免密码
  注册与登录**：你的前端使用提供方 SDK 获取凭证，并在
  `POST /v1/auth/oauth` 兑换为 CBPay 会话。完整指南见
  [社交登录](https://docs.cbpayapp.com/zh/guides/social-login)。
- **新增端点**：`POST /v1/auth/oauth`（统一的登录 + 注册）、
  `GET /v1/auth/oauth/providers`（已启用的提供方，公开）、
  `GET/POST /v1/me/identities` 与 `DELETE /v1/me/identities/{provider}`
  （在会话中关联/解绑提供方）。
- **集成 2FA**：如果账户在登录时强制 OTP，社交登录同样返回
  `otp_required` + `pending_token`。
- **多方式**：一个账户可同时拥有密码和多个提供方；仅当提供方返回
  已验证邮箱时才会按邮箱自动关联。
- [目录](https://docs.cbpayapp.com/zh/errors) 中的新错误码：`invalid_provider`、
  `provider_not_configured`、`invalid_credential`、`email_conflict`、
  `identity_taken`、`last_login_method`。

**修复**

- Postman 页面的"集合已更新"标记现在能正确显示距上次更新的时间
  （此前显示为空指示器）。

### v1.24

**新增 — 通过 SMS 与 WhatsApp 的 OTP/2FA**

- **敏感操作的两步验证**：你的运营方可以要求在登录、payout、加密
  提现、内部转账、banking 操作、卡片明文查看、签发 API key、添加
  成员或更换手机号之前输入一次性验证码（通过 SMS 或 WhatsApp）。
  完整指南见 [安全与 2FA](https://docs.cbpayapp.com/zh/security-2fa)。
- **新增端点**：`POST /v1/otp/challenges`（发送验证码）、
  `POST /v1/otp/challenges/{id}/verify`（返回用于 `X-OTP-Token`
  请求头的一次性 `otp_token`）、`GET /v1/otp/challenges`（+ 详情）
  以及 `GET /v1/otp/settings`（你的生效策略）。
- **两步登录**：在 `login` 上启用 OTP 后，`POST /v1/auth/login`
  返回 `otp_required: true` + `pending_token`，会话在
  `POST /v1/auth/login/otp` 签发。
- **仅限用户会话**：`pk_` API key 免除 —— 你的服务器间集成无需
  任何改动。
- [目录](https://docs.cbpayapp.com/zh/errors) 中的新错误码：`otp_required`、`otp_invalid`、
  `phone_required`、`phone_binding_cooldown`、`too_many_attempts`
  等。

### v1.23

**文档 — 个人 vs 企业与统一指南**

- **新增 [个人与企业](https://docs.cbpayapp.com/zh/concepts/persons-companies) 页面**：两种
  账户类型的**所有**差异（钱包、卡片、成员、KYC/KYB）汇总在一张
  表中，并列出每个限制对应的错误。
- **卡片指南按账户类型重组**："个人账户"与"企业账户"标签页，各自
  包含完整流程（首张卡、后续卡，企业还包括公司卡与员工卡的发放）
  —— 不再需要从零散的注释里拼凑流程。
- **国家示例回到各自指南中**：payout 与 payin 按通道的请求/响应
  重新收录在各产品的指南**内部**（每个产品一页，无需跳转到单独的
  参考页）。旧 URL 会自动重定向。
- **Postman 实时新鲜度**：Postman 页面现在会显示集合距上次更新的
  时长（秒/分钟/天），叠加在日期和版本之上。
- 编译版 MD 现在包含完整的端点参考及文档版本号。

### v1.22

**文档 — 站点全面改版**

- **新导航**：快速开始 → 概念 → 集成流程 → 产品 → 集成 → 资源，
  每页配有图标与面包屑导航。
- **新页面**：[环境与测试](https://docs.cbpayapp.com/zh/environment-testing)（本地开发的
  webhook 隧道 + 上线检查清单）、[已启用的服务](https://docs.cbpayapp.com/zh/concepts/services)、
  [状态与生命周期](https://docs.cbpayapp.com/zh/concepts/statuses)（含失败 payout 的
  `status_code` 目录）、
  [流水与对账](https://docs.cbpayapp.com/zh/concepts/movements-reconciliation)，以及带端到端
  图示的 [集成流程](https://docs.cbpayapp.com/zh/flows)。
- **payout 与 payin 拆分**：通用指南 + 国家参考，包含每个通道的
  真实请求与响应。
- **指南扩充**：快速开始以 webhook 收尾闭环；个人资料
  （`PATCH /v1/me`）与带角色的成员管理；完整的幂等端点表；webhook
  重试计划；链上确认时间；EUR 银行账户；banking 错误加入目录；FAQ
  涵盖限额、取消与对账。
- **卡片：何时发送 `cardholder`，已澄清。** 指南与规格现在说明，
  账户的**首次发卡**会创建并验证持卡人（完整数据 + 必需文件），
  而**后续**发卡无需数据即可复用 —— 此前的最简示例曾让人误以为
  永远不需要数据。

### v1.21

**新增**

- **`GET /v1/rates` 中的 `payin_rate`**：每个国家现在携带你的两个
  汇率 —— payout（付款）用 `rate`，payin（法币收款/入金）用
  `payin_rate`。报价 = 入账，始终如此。

**变更**

- **payin 定价现在与 payout 一致**：payin 的汇率定价体现在你的
  `payin_rate` 中（入账严格按该汇率换算），payin 费用改为**每笔
  固定金额** —— 不再有单独的百分比。每笔 payin 的 `fx_rate` 字段
  记录所应用的汇率。参见 [费用](https://docs.cbpayapp.com/zh/concepts/fees) 与
  [收款指南](https://docs.cbpayapp.com/zh/guides/payins)。
- 入账换算向下取整到微 USDT（扣款仍向上取整），差额最多 1 微
  USDT。

**文档**

- **KYC/KYB：完整的身份字段参考。** `customer` 对象一直接受比示例
  更多的可选字段（出生日期、国籍、带签发国的证件、别名、居住地、
  公司注册数据……），提供它们能让筛查更精确。
  [KYC 指南](https://docs.cbpayapp.com/zh/guides/kyc) 现在记录了每个字段，附完整身份示例
  与去重规则。

### v1.20

**新增**

- **卡片目录**：`GET /v1/cards/catalog/occupations` 与
  `GET /v1/cards/catalog/business-activities`（可用 `?q=` 搜索），
  用于填充选择器。指定个人时，`occupation` 必须是目录中的**代码**；
  企业则同样要求 `kind_of_business`。目录之外的值会在到达发卡方
  之前被 `400 invalid_occupation` / `400 invalid_kind_of_business`
  拒绝。参见 [卡片指南](https://docs.cbpayapp.com/zh/guides/cards)。

### v1.19

**新增**

- **`GET /v1/services`**：你账户已启用服务的生效映射（`payouts`、
  `payins`、`transfers`、`crypto`、`banking`、`kyc`、`cards`）——
  可用于决定 UI 中展示的内容。服务按你的商业协议逐账户启用；某项
  服务关闭时，其操作返回新的 `403 service_disabled` 错误（读取与
  在途资金绝不会被阻断）。

### v1.18

**新增**

- **虚拟卡与实体卡**，直接从账户的 USDT 余额消费，无需预充值：
  每笔消费都会针对可用余额与卡片限额进行实时授权。个人：1 张虚拟
  卡 + 1 张实体卡；企业：不限量，可为公司本身或指定人员（如员工）
  发放。新增端点 `POST/GET /v1/cards`、`GET/PATCH /v1/cards/{id}`
  （限额与冻结/解冻）、`POST /v1/cards/{id}/activate|cancel|reveal`
  以及 `GET /v1/cards/{id}/transactions`。参见
  [卡片指南](https://docs.cbpayapp.com/zh/guides/cards)。
- **新增计费服务**（固定、可配置、可为 0）：
  `card_creation_virtual`、`card_creation_physical`、`card_monthly`
  （余额不足时卡片被冻结 —— 不产生欠款）以及 `card_cancellation`。
- **新增 webhook** `card_transaction`（已授权/已撤销/已调整）与
  `card_status_changed`（状态变化，包括自动冻结）。
- **新增总账流水类型**：`card_debit`、`card_refund`、`card_fee`、
  `card_fee_refund`。

## v1.17 · 16 个版本 - 2026年7月7日

### v1.17

**新增**

- **智利：托管支付页（`method: "fintoc"`）**，位于
  `POST /v1/payins`。响应携带一个 `payment_url`，付款人打开后即可
  从**任意智利银行或钱包**（Banco Estado、Santander、Mach、Tenpo、
  Mercado Pago 等）转账；存款会被自动检测、校验并以 USDT 入账，
  并发送常规的 `payin_credited` webhook。支持可选的
  `idempotency_key`：重试会返回同一笔 payin 和同一个 URL，不会
  开启第二个支付会话。参见 [收款指南](https://docs.cbpayapp.com/zh/guides/payins)。

### v1.16

**新增**

- **所有列表端点均支持 `from`/`to` 日期筛选**：`/v1/movements`、
  `/v1/payouts`、`/v1/payins` 与 `/v1/crypto/transactions` 现在在
  常规分页（`page`、`page_size` 上限 200）之外接受 `from`/`to`
  （YYYY-MM-DD，UTC，含端点日期）。无效日期返回
  `400 invalid_range`。
- **查询内部转账**：`GET /v1/transfers`（带分页与日期筛选的列表）
  与 `GET /v1/transfers/{id}` —— 此前只能创建。
- **列出 webhook 订阅**：`GET /v1/webhooks/subscriptions`。
- **主动收款的幂等性**：`POST /v1/payins/collect` 现在要求
  `idempotency_key`（它执行真实扣款；重试绝不会向付款人重复扣款）。
  钱包创建（重试不重复收费）与管理员调整也做了同样加固。
- `members`、`crypto/wallets`、`deposit-accounts` 及（管理端）
  `orgs` 增加了统一分页。

- **账户对账单**（`GET /v1/reports/statement`）：将期间内的所有
  流水 —— payout、payin、加密、内部转账与费用 —— 汇总为一份可审计
  的文档，并进行精确的会计对账
  （`opening + inflows − outflows = closing`，与总账核对）。同一
  端点提供三种格式：面向网页的 **JSON**、带 CBPay 品牌的 **PDF**，
  以及带数值单元格、筛选器和流水表、面向审计师的多工作表 **Excel**
  （`format=json|pdf|xlsx`，`lang=es|en`）。组织管理员可以生成其
  任意账户的对账单。参见 [指南](https://docs.cbpayapp.com/zh/guides/statement)。

### v1.15

**改进**

- **文档全站的可视化流程图**：介绍页的资金地图（进出 USDT 余额的
  一切）、带扣款/冻结/退款的 payout 生命周期、两步 QR 流程、汇入
  入账的四种 payin 模式、加密充值与提现、完整的 banking 生命周期、
  KYC 状态、webhook 投递与重试，以及幂等决策规则（"我该用哪个键
  重试？"）。

### v1.14

**变更**

- **新基础 URL：`https://api.qbank.cl/platform`**（此前为
  `exchange.qbank.cl/platform`）。旧域名作为别名继续可用，因此
  现有集成不会中断 —— 但新集成请一律使用 `api.qbank.cl`。全部
  文档、规格与 Postman 集合均已指向新 URL。

### v1.13

**新增**

- **Banking**：为你的账户开立真实银行账户 —— 通过国际银行网络
  （视货币而定，SEPA、SWIFT、ACH）接收、持有和汇出资金。
  `/v1/banking/*` 下新增 14 个端点：
  - 银行档案：创建、查询、上传文件并提交验证。
  - 账户：按货币开立、列出并查询实时余额。
  - 收款人：登记、列出并关联目标账户。
  - 付款：报价（`prepare`，免费）并以幂等方式执行
    `TRANSFER`/`WITHDRAW`。
- 新增 webhook：`banking_customer_status_changed` 与
  `banking_operation_status_changed`。
- 新增费用（固定、可配置、操作失败时退款）：`banking_customer`、
  `banking_account`、`banking_operation` —— 每个响应中的
  `banking_fee` 字段显示实际收取的金额。
- 完整的 [Banking 指南](https://docs.cbpayapp.com/zh/guides/banking)，含端到端流程及每种
  操作的示例。

### v1.12

**改进**

- **API 参考完全本地化**：以西班牙语浏览文档时，标题、描述、字段
  与侧边栏分组现在均已翻译（此前只有界面框架会切换语言）。
- payout 指南重组：巴西 PIX 现在仅出现在"按国家的示例"下（重复的
  章节已删除）；QR 因为是不同的流程（扫码 + 确认），仍作为唯一
  单独的流程章节保留。
- Webhooks：**5 个事件各自**的示例负载。
- 快速开始：个人**与**企业两种注册示例。
- **Postman 集合扩充到 53 个请求**：具有多种用例的端点现在按用例
  各提供一个请求（每个国家和方式一个 payout、按模式的 payin、
  个人/企业 KYC 等），每个都带有可直接发送的请求体。
- **收款指南按国家重构**，与 payout 对齐：通道矩阵展示各国模式，
  外加智利 / 秘鲁 / 墨西哥 / 委内瑞拉 / 玻利维亚 / 巴西标签页及其
  完整示例。
- **新增 [FAQ 页面](https://docs.cbpayapp.com/zh/faq)**：沙盒、初始入金、payout 前成本
  估算、汇率保证、到账时间、安全重试、无参考码的存款等 —— 上手
  第一天的问题都能在文档内找到答案。
- 快速开始以**关键信息**表开篇（基础 URL、认证请求头、slug、金额
  格式、环境），并附 `GET /v1/rates` 响应示例与成本估算公式。
- payout：方式与银行目录的响应示例，外加一张标注对余额影响的状态
  表。payin：目录响应示例及 `delivery` 的含义。

### v1.11

**改进**

- **文档全站按用例提供完整示例**：
  - payout：每个国家和方式各一个示例，含其真实的 `beneficiary` 与
    响应（智利、秘鲁 CCI + Yape、墨西哥 CLABE + 借记卡、委内瑞拉
    Pago Móvil + 银行转账、玻利维亚 ACH、巴西 PIX、巴拉圭）。
  - payin：玻利维亚与巴西 QR 并排展示，主动收款 `c2p` 与
    `debito_inmediato` 及其 OTP 响应，专属存款账户。
  - KYC/KYB：个人、企业与最简自动填充请求，附筛查、重新筛查与
    监控（启用/停用）的响应。
  - 内部转账：按邮箱、按 `account_id`、企业→个人（发薪）与幂等
    重放。
  - 加密：个人 vs 企业的钱包创建，以及 `wallet_limit_reached`
    错误。
  - API 参考：每个端点均可选择命名示例（10 个 payout 通道、3 种
    payin 模式、个人/企业 KYC……）。

### v1.10

**新增**

- **巴西（BRL）PIX** 在 payout 与 payin 中的文档：
  - 通过 `POST /v1/payouts` 按密钥（CPF/CNPJ、手机、邮箱或 `evp`
    随机密钥）进行 `pix` payout。
  - 通过 `qr/scan` + `qr/confirm` 流程（`country: "BR"`）向 PIX QR
    （静态或 "copia e cola"）付款。
  - 通过 `POST /v1/payins`（`method: "qr"`，`country: "BR"`）使用
    动态 PIX QR 收款，携带二维码图片与 "copia e cola" 代码。
  - 通过预告银行转账收款（`method: "bank_transfer"`）。

通道的启用是渐进的；目录（`GET /v1/payouts/methods`、
`GET /v1/payins/methods`）反映任一时刻的可用性。

### v1.9

**新增**

- **所有收款（payin）方式现已通过 API 提供**：
  - `POST /v1/payins` 现在接受 `method`：`qr`（QR 收款，同以往）或
    `bank_transfer`（预告一笔入账存款，并获取转账必须携带的参考码
    以便自动入账）。
  - `POST /v1/payins/collect` —— 在支持的通道（如委内瑞拉 `c2p` /
    `debito_inmediato`）进行主动拉取收款，同步入账；当方式要求
    预先 OTP 时使用 `POST /v1/payins/collect/otp`。
  - `POST /v1/payins/deposit-accounts` —— 绑定到你账户的固定专属
    存款账户（如墨西哥 CLABE）：汇入该账户的一切都会自动入账。
    使用 `GET /v1/payins/deposit-accounts` 列出它们。
- 指南中提供了 payout 的完整通道与方式矩阵（智利、秘鲁含 `yape`、
  墨西哥 SPEI、委内瑞拉含 `pago_movil`、玻利维亚含 `qr`、巴拉圭）。
- 委内瑞拉（VES）加入 `GET /v1/rates` 报价。

### v1.8

**新增**

- **玻利维亚 QR payout**：分两步支付任意玻利维亚收款二维码 ——
  `POST /v1/payouts/qr/scan`（免费，返回收款人数据）与
  `POST /v1/payouts/qr/confirm`（按常规 payout 收费：你的汇率 +
  固定费用，同步返回最终结果，失败时自动退款）。
- 玻利维亚（BOB）加入 `GET /v1/rates` 报价。

### v1.7

**新增**

- 新增 **[Postman](https://docs.cbpayapp.com/zh/postman)** 页面：官方可下载集合，包含全部
  25 个端点、示例请求体与预配置的认证。每个 API 版本都会重新生成。

**变更**

- 费用页面与 payout 示例现已反映当前的定价模型：payout 按**你的
  汇率 + 每笔固定费用**收取（无单独百分比）。派发等值 100 USDT
  会扣除 100 USDT 加上你配置的固定费用。

### v1.6

**改进**

- `GET /v1/rates` 现在按国家返回**你账户专属的汇率**：与你的操作
  实际执行的汇率相同（`local_amount / rate = USDT`），报价与扣款
  之间没有差异。

### v1.5

**移除（Breaking）**

- `GET /v1/crypto/deposit-address`（v1.4 中弃用的别名）已被永久
  移除。请使用 `POST /v1/crypto/wallets` 创建钱包，并用
  `GET /v1/crypto/wallets` 列出它们。

### v1.4

**新增**

- **企业多钱包**：企业账户现在可以**每个网络创建不限量的钱包**
  （个人仍为每个网络 1 个）。
- 新增端点：`POST /v1/crypto/wallets`（创建钱包，可选 `label`
  以便区分）与 `GET /v1/crypto/wallets`（列出我的钱包）。每次创建
  在配置了固定费用 `wallet_creation` 时计费。
- 当个人尝试在同一网络创建第二个钱包时，新增
  `422 wallet_limit_reached` 错误。
- 钱包响应现在包含 `wallet_id` 和 `label`。

**变更**

- 加密指南重组为：**创建钱包、查看我的钱包、充值、转账与流水**。
- `GET /v1/crypto/deposit-address` 作为弃用的旧别名保留：请改用
  钱包端点。

**修复**

- 两种语言的文案与翻译润色；流水表现在包含 `wallet_creation_fee`
  与 `wallet_creation_refund` 条目类型。

### v1.3

**改进**

- 专业级 API 参考：全部 25 个端点现在为**每种情况**（成功、幂等
  重放、以及每个可能的错误及其真实响应体）提供请求与响应示例，
  可直接在文档 playground 中试用。
- 5 个 webhook 现已在 API 参考内部文档化（标准 OpenAPI Webhooks
  章节），每个事件均含 schema 与示例负载。
- 方式与银行目录以系统的真实响应结构文档化。
- `GET /healthz` 端点已文档化（服务状态）。
- 加密指南新增 **"钱包余额与活动"**：如何查询余额、带 `tx_id` 的
  链上活动，以及账务历史。
- 品牌化文案：整套文档现在以 **CBPay** 的口吻表达（此前使用"你的
  运营方"或"该组织"之类的泛称）。
- 身份验证在全站文档中统一命名为 **KYC/KYB**（个人为 KYC，企业为
  KYB）。
- 内部转账：明确记录其可在**任意组合**的账户之间进行（个人↔个人、
  个人↔企业、企业↔企业），且**始终免费**。

### v1.2

**新增**

- 新增 `wallet_creation` 费用服务：在每条链上首次创建充值地址可能
  收取由 CBPay 配置的固定费用（0 = 免费，默认值）。
  `GET /v1/crypto/deposit-address` 响应现在包含 `creation_fee`，
  流水历史新增 `wallet_creation_fee` 与 `wallet_creation_refund`
  条目类型。获取已存在的地址始终免费；创建失败时费用自动退还。
- 新增 **更新日志** 页面（本页），记录 API 与文档的版本历史。

**变更**

- 加密指南现在有一个明确的 **"创建你的钱包"** 章节，说明按网络
  创建（首次调用返回 201 并附 `creation_fee`，之后为免费的 200），
  API 参考将该端点更名为"创建或获取我的钱包（充值地址）"。

## v1.1 · 2 个版本 - 2026年7月6日

### v1.1

**新增**

- 按操作计费的合规费用：`compliance_person`、`compliance_company`、
  `compliance_rescreen` 与 `compliance_monitoring`（每次调用的固定
  费用；0 = 免费）。KYC 响应现在包含 `compliance_service` 与
  `compliance_fee`。
- 新增 `POST /v1/kyc/rescreen` 与 `PATCH /v1/kyc/monitoring` 端点
  （停用监控免费）。两者都要求已有 KYC（`409 no_kyc`）。

**变更**

- CBPay 官方品牌形象已应用于整套文档。
- 管理相关文档已迁移至 CBPay 内部门户；本站现在仅涵盖账户 API。

### v1.0

**首次发布**

- CBPay 公开 API 文档，双语（西班牙语与英语）：认证（JWT 会话与
  `pk_` API key）、USDT 资金模型、费用、幂等性、多国法币 payout、
  payin、内部转账、加密（链上入金与提现）、KYC、签名 webhook 及
  完整的错误目录。
- 基于 OpenAPI 3.1 生成的交互式 API 参考。
