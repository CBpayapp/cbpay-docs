---
title: "出金通道"
description: "按国家和通道查看出金要求"
slug: zh/guides/payout-corridors
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/payout-corridors
---
> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

## 各国示例

每条通道均附有其精确的 `beneficiary`、完整的请求和真实的响应。汇率
（`fx_rate`）仅供参考 —— 实际始终采用 `GET /v1/rates` 返回的您账户的
汇率；扣款为 `usdt_amount + fee`（固定费用，如已配置；此处为 `0.30`）。

### 各通道的收款人字段

| 国家 | 方式 | `beneficiary` 字段 |
|---|---|---|
| CL | `bank_transfer` | `name`、`tax_id`（RUT）、`bank_code`、`account_type`、`account_number` |
| PE | `bank_transfer` | `name`、`account_number`（20 位 CCI） |
| PE | `yape` | `name`、`phone`（`51XXXXXXXXX`） |
| MX | `bank_transfer` | `name`、`account_type`（`clabe`/`debit_card`）、`account_number`（银行卡还需 `bank_code`） |
| VE | `pago_movil` | `name`（名 + 第一姓氏，与证件一致）、`phone`、`bank_code`（SUDEBAN）、`document_value` |
| VE | `bank_transfer` | `name`、`account_number`（20 位）、`document_value` |
| BO | `bank_transfer` | `name`、`tax_id`、`bank_code`、`account_number` |
| CO | `breb` | `name`、`tax_id`/`document_value`、`document_type`、`phone`、`address`、`breb_key`、`breb_key_type` |
| BR | `pix` | `name`、`tax_id` +（`pix_key` 和 `pix_key_type`）或（`bank_code` ISPB、`branch_code`、`account_number`） |
| EC | `bank_transfer` | `name`、`document_value`（身份证 cédula）、`sender_name`、`account_number`（转到其他银行还需 `bank_code` 和 `account_type`） |
| EC | `deuna` | `name`、`document_value`、`sender_name`、`phone`（钱包手机号） |
| EC | `cash_pickup` / `cnb` | `name`、`document_value`、`sender_name` — 收款人凭证件领取现金 |
| PY | `bank_transfer` | `name`（最多 35 个字符）、`tax_id`、`bank_code`、`account_number` |
| AR | `bank_transfer` | `name`、`tax_id`（11 位 CUIT/CUIL）、`account_number`（22 位 CBU/CVU 或银行 alias；USD 仅支持 CBU） |
| US | `ach` / `wire` / `swift` | `name`、`account_number`、`email`、`country_code`、`address`、`city`、`postal_code`、`bank_name`、`bank_code`（`ach`/`wire` 用 ABA routing，`swift` 用 SWIFT BIC；`ach` 还需 `account_type` `CHECKING`/`SAVING`） |

#### 智利

以 CLP 进行银行转账。需要 RUT、银行和账户：智利比索没有小数单位，因此 CLP payout 金额必须为整数（例如 `30000` 或 `30000.00`）。

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "CL",
    "currency": "CLP",
    "method": "bank_transfer",
    "amount": "100000",
    "beneficiary": {
      "name": "Pedro Soto Fuentes",
      "tax_id": "12.345.678-5",
      "bank_code": "012",
      "account_type": "checking",
      "account_number": "123456789"
    },
    "description": "Supplier payment",
    "idempotency_key": "cl-prov-0091"
  }'
```

```json
{
  "payout_id": "b3e1…",
  "country": "CL",
  "currency": "CLP",
  "method": "bank_transfer",
  "local_amount": "100000",
  "fx_rate": "925.69",
  "usdt_amount": "108.027528",
  "fee": "0.300000",
  "total_debit": "108.327528",
  "status": "processing",
  "status_code": "",
  "status_message": "",
  "funds_debited": true,
  "compliance_pending": false,
  "bank_reference": ""
}
```

银行目录（`GET /v1/payouts/banks?country=CL`）列出当前有效的
`bank_code` 值。对于 `CL`/`CLP`/`bank_transfer`，payout 可能在约五分钟
的短窗口内批量派发；`POST /v1/payouts` 仍返回 `202` 与
`status: "processing"`，每笔 payout 仍保留自己的最终状态和
`payout_status_changed` webhook。

#### 秘鲁

两种方式：银行转账（跨行 CCI）和 **Yape**（转到手机号码）。

```bash bank_transfer (CCI)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "PE",
    "currency": "PEN",
    "method": "bank_transfer",
    "amount": "1000.00",
    "beneficiary": {
      "name": "Rosa Alvarez Diaz",
      "account_number": "00219300123456789012"
    },
    "idempotency_key": "pe-cci-3310"
  }'
```

```bash yape (phone)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "PE",
    "currency": "PEN",
    "method": "yape",
    "amount": "150.00",
    "beneficiary": {
      "name": "Luis Ramos Vega",
      "phone": "51987654321"
    },
    "idempotency_key": "pe-yape-8874"
  }'
```

```json
{
  "payout_id": "c7a2…",
  "country": "PE",
  "currency": "PEN",
  "method": "yape",
  "local_amount": "150.00",
  "fx_rate": "3.40",
  "usdt_amount": "44.117648",
  "fee": "0.300000",
  "total_debit": "44.417648",
  "status": "completed",
  "bank_reference": "00761123456"
}
```

对于 `yape`，手机号码使用 `51XXXXXXXXX` 格式（含国家代码共 11 位）。
结果通常是同步返回的。

#### 墨西哥

以 MXN 进行 SPEI 转账，转到 CLABE（18 位）或借记卡：

```bash CLABE
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "MX",
    "currency": "MXN",
    "method": "bank_transfer",
    "amount": "1500.00",
    "beneficiary": {
      "name": "Maria Lopez",
      "account_type": "clabe",
      "account_number": "012180001234567895"
    },
    "idempotency_key": "mx-clabe-8841"
  }'
```

```bash Debit card
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "MX",
    "currency": "MXN",
    "method": "bank_transfer",
    "amount": "800.00",
    "beneficiary": {
      "name": "Jorge Herrera",
      "account_type": "debit_card",
      "account_number": "4152313412341234",
      "bank_code": "40012"
    },
    "idempotency_key": "mx-card-1102"
  }'
```

```json
{
  "payout_id": "0d4f…",
  "country": "MX",
  "currency": "MXN",
  "method": "bank_transfer",
  "local_amount": "1500.00",
  "fx_rate": "17.50",
  "usdt_amount": "85.714286",
  "fee": "0.300000",
  "total_debit": "86.014286",
  "status": "processing",
  "status_code": "",
  "status_message": "",
  "funds_debited": true,
  "compliance_pending": false,
  "bank_reference": ""
}
```

使用 CLABE 时，目标银行由其前几位数字推导；使用银行卡时，必须提供
`bank_code`。

#### 委内瑞拉

两种方式：**Pago Móvil**（姓名 + 手机号 + 银行 + 证件）和银行转账
（20 位账户）：

```bash pago_movil
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "VE",
    "currency": "VES",
    "method": "pago_movil",
    "amount": "2000.00",
    "beneficiary": {
      "name": "Carmen Delgado",
      "phone": "04141234567",
      "bank_code": "0102",
      "document_value": "V12345678"
    },
    "idempotency_key": "ve-pm-5567"
  }'
```

```bash bank_transfer
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "VE",
    "currency": "VES",
    "method": "bank_transfer",
    "amount": "5000.00",
    "beneficiary": {
      "name": "Carmen Delgado",
      "account_number": "01020123456789012345",
      "document_value": "V87654321"
    },
    "idempotency_key": "ve-bank-7810"
  }'
```

```json
{
  "payout_id": "e9b4…",
  "country": "VE",
  "currency": "VES",
  "method": "pago_movil",
  "local_amount": "2000.00",
  "fx_rate": "666.00",
  "usdt_amount": "3.003004",
  "fee": "0.300000",
  "total_debit": "3.303004",
  "status": "completed",
  "bank_reference": "00761123456"
}
```

`bank_code` 使用 SUDEBAN 代码；对于 `bank_transfer`，可由账号的前 4 位
数字推导。

#### 玻利维亚

以 BOB 或 USD 进行 ACH 转账（此外还有 [QR](https://docs.cbpayapp.com/zh/guides/payout-special-cases#qr-出金)）：

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BO",
    "currency": "BOB",
    "method": "bank_transfer",
    "amount": "1382.00",
    "beneficiary": {
      "name": "Juan Quispe Mamani",
      "tax_id": "4567890",
      "bank_code": "1016",
      "account_number": "1234567890"
    },
    "idempotency_key": "bo-ach-2204"
  }'
```

```json
{
  "payout_id": "f2c8…",
  "country": "BO",
  "currency": "BOB",
  "method": "bank_transfer",
  "local_amount": "1382.00",
  "fx_rate": "6.91",
  "usdt_amount": "200.000000",
  "fee": "0.300000",
  "total_debit": "200.300000",
  "status": "processing",
  "status_code": "",
  "status_message": "",
  "funds_debited": true,
  "compliance_pending": false,
  "bank_reference": ""
}
```

如需 USD，请发送 `currency: "USD"`，结构相同。

组织配置决定内部使用的 rail 版本。该选择不是客户可控制的字段，并会保存在
操作中，使后续轮询继续使用正确的版本。响应和 webhook 保持 provider-agnostic。

#### 巴西

按密钥进行 PIX 转账（此外还有 [PIX QR](https://docs.cbpayapp.com/zh/guides/payout-special-cases#qr-出金)）：

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BR",
    "currency": "BRL",
    "method": "pix",
    "amount": "350.00",
    "beneficiary": {
      "name": "João da Silva",
      "tax_id": "123.456.789-09",
      "pix_key_type": "cpf",
      "pix_key": "12345678909"
    },
    "idempotency_key": "br-pix-3321"
  }'
```

```json
{
  "payout_id": "a6d1…",
  "country": "BR",
  "currency": "BRL",
  "method": "pix",
  "local_amount": "350.00",
  "fx_rate": "5.13",
  "usdt_amount": "68.226121",
  "fee": "0.300000",
  "total_debit": "68.526121",
  "status": "processing",
  "bank_reference": ""
}
```

`pix_key_type`：`cpf`、`cnpj`、`phone`、`email` 或 `evp`（随机密钥）。

**PIX 转账到账户（无密钥）** —— 当收款人没有（或不愿提供）PIX 密钥时，
可发送其银行账户信息；到账同样迅速（同一 PIX 通道，24/7 全天候）：

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BR",
    "currency": "BRL",
    "method": "pix",
    "amount": "350.00",
    "beneficiary": {
      "name": "Empresa Exemplo Ltda",
      "tax_id": "19.385.062/0001-20",
      "bank_code": "45678923",
      "branch_code": "1",
      "account_number": "765432",
      "account_type": "CACC"
    },
    "idempotency_key": "br-pix-acct-3322"
  }'
```

- `bank_code` 是目标银行的 **ISPB**（8 位），`branch_code` 是分行号，
  `account_type` 是账户类型（`CACC` 活期 —— 默认 ——、`SVGS` 储蓄、
  `TRAN` 支付账户、`SLRY` 工资账户）。
- 最终状态通过 `payout_status_changed` webhook 送达（与通道持续对账）；
  也可随时使用 `GET /v1/payouts/{id}` 查询。

#### 厄瓜多尔

以 **USD** 汇出汇款（每笔 1 至 100,000，最多 2 位小数）；对于
`EC/USD/bank_transfer`，低于 USD 1 返回 `amount_below_minimum`，高于
USD 100,000 返回 `amount_above_maximum`，更大金额应拆分为多笔 payout；支持四种方式：
银行转账、**DE UNA** 钱包（按手机号）、**柜台取现**（`cash_pickup`）和
**非银行代理点取现**（`cnb`）。这是一个汇款通道：除收款人外，通道还
要求提供**汇款人**（付款发起方）的信息，以 `sender_*` 前缀平铺在同一个
`beneficiary` 对象中。
```bash bank_transfer（到账户）
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "EC",
    "currency": "USD",
    "method": "bank_transfer",
    "amount": "250.00",
    "beneficiary": {
      "name": "Carlos Andrade Vera",
      "document_value": "1712345678",
      "account_number": "2203456789",
      "sender_name": "Ana Torres Silva",
      "sender_document_value": "V23456789",
      "sender_country": "US"
    },
    "idempotency_key": "ec-bank-4471"
  }'
```

```bash deuna（钱包）
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "EC",
    "currency": "USD",
    "method": "deuna",
    "amount": "80.00",
    "beneficiary": {
      "name": "Lucia Paredes Mora",
      "document_value": "0923456781",
      "phone": "0998765432",
      "sender_name": "Ana Torres Silva"
    },
    "idempotency_key": "ec-deuna-5520"
  }'
```

```bash cash_pickup（柜台）
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "EC",
    "currency": "USD",
    "method": "cash_pickup",
    "amount": "120.00",
    "beneficiary": {
      "name": "Miguel Zambrano Loor",
      "document_value": "1309876543",
      "sender_name": "Ana Torres Silva"
    },
    "idempotency_key": "ec-cash-6612"
  }'
```

```bash cnb（代理点）
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "EC",
    "currency": "USD",
    "method": "cnb",
    "amount": "60.00",
    "beneficiary": {
      "name": "Rosa Cedeño Vera",
      "document_value": "0801234567",
      "sender_name": "Ana Torres Silva"
    },
    "idempotency_key": "ec-cnb-7703"
  }'
```

```json
{
  "payout_id": "9f3a…",
  "country": "EC",
  "currency": "USD",
  "method": "bank_transfer",
  "local_amount": "250.00",
  "fx_rate": "1",
  "usdt_amount": "250.000000",
  "fee": "0.300000",
  "total_debit": "250.300000",
  "status": "processing",
  "bank_reference": ""
}
```

- 厄瓜多尔为美元化经济体：当地货币就是美元（`fx_rate: "1"`）。
- `document_value` 为收款人的身份证号（cédula）；`document_type` 接受
  `IDCD`（身份证，默认）、`CCPT`（护照）或 `TXID`（RUC）。
- 在 `bank_transfer` 中，省略 `bank_code` 表示账户属于通道的发卡银行；转到
  **其他银行**时需发送目录中的 `bank_code`（`GET /v1/payouts/banks?country=EC`）
  以及 `account_type`（`checking` 或 `savings`）。
- 收款人资料不完整时，在创建或扣款前返回 `invalid_beneficiary`，并由
  `message` 指出具体字段。
- 可选的结构化姓名字段（`given_name`、`middle_name`、`first_surname`、
  `second_surname` 及其 `sender_*` 对应字段）：如有请发送 —— 它们优先
  于对 `name` 的自动拆分。
- 最终状态通过 `payout_status_changed` webhook 送达（并有周期性对账
  作为兜底）。

#### 巴拉圭

以 PYG 进行银行转账：

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "PY",
    "currency": "PYG",
    "method": "bank_transfer",
    "amount": "500000",
    "beneficiary": {
      "name": "Sofia Benitez",
      "tax_id": "4123456",
      "bank_code": "0011",
      "account_number": "600123456"
    },
    "idempotency_key": "py-bank-9917"
  }'
```

```json
{
  "payout_id": "d4e7…",
  "country": "PY",
  "currency": "PYG",
  "method": "bank_transfer",
  "local_amount": "500000",
  "fx_rate": "6055.76",
  "usdt_amount": "82.566020",
  "fee": "0.300000",
  "total_debit": "82.866020",
  "status": "processing",
  "bank_reference": ""
}
```

在此通道中，`name` 最多接受 35 个字符。

#### 阿根廷

**银行 alias**：对于 ARS 和 USD 的 `bank_transfer`，`beneficiary.account_number` 也接受长度为 6–20、由字母/数字/点/连字符组成且至少包含一个字母的银行 alias。纯数字值仍按 CBU/CVU 处理，而不是 alias。CBPay 会在发起前将有效 alias 解析为目标账户，wire 使用解析后的 CBU。ARS 可解析到 CBU 或 CVU；USD 仍仅支持 CBU 到 CBU。无法解析的 alias 会在扣款前拒绝，原始 alias 会保留在 payout 证据中。

以 **ARS** 或 **USD** 银行转账到任何 22 位的 **CBU 或 CVU**（银行账户和
虚拟钱包）。无需 `bank_code`：CBU/CVU 本身即可识别银行。

```bash ARS（CBU 或 CVU）
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "AR",
    "currency": "ARS",
    "method": "bank_transfer",
    "amount": "50000.00",
    "beneficiary": {
      "name": "Julieta Fernandez",
      "tax_id": "27-23456789-1",
      "account_number": "2850590940090418135201"
    },
    "idempotency_key": "ar-ars-3311"
  }'
```

```bash USD（仅 CBU）
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "AR",
    "currency": "USD",
    "method": "bank_transfer",
    "amount": "100.00",
    "beneficiary": {
      "name": "Julieta Fernandez",
      "tax_id": "27-23456789-1",
      "account_number": "2850590940090418135201"
    },
    "idempotency_key": "ar-usd-3312"
  }'
```

```json
{
  "payout_id": "b7c1…",
  "country": "AR",
  "currency": "ARS",
  "method": "bank_transfer",
  "local_amount": "50000.00",
  "fx_rate": "1250.00",
  "usdt_amount": "40.000000",
  "fee": "0.300000",
  "total_debit": "40.300000",
  "status": "completed",
  "bank_reference": "00761123456"
}
```

- `tax_id` 是目标账户持有人的 **CUIT/CUIL**（11 位数字；接受带连字符的
  格式并自动规范化）。
- **USD 仅支持银行账户到银行账户（CBU）**：CVU（虚拟钱包）不支持美元 ——
  该出金会在发送前被拒绝。
- 大多数出金在同一次调用中确认（`status: "completed"`）；如果通道返回
  `processing`，最终状态会通过 `payout_status_changed` webhook 送达。
- 极少数情况下，通道可能**冲正**一笔已入账的转账（例如接收银行的指令）。
  此时该出金变为 `failed`，扣款全额退还，并且你会收到
  `payout_status_changed` webhook。

#### 美国

以 **USD** 向美国银行账户出金，提供三种方式：

- **`ach`** —— 向支票或储蓄账户发起 ACH 转账，**次日**结算。
- **`wire`** —— 美国境内电汇，最低 **USD 25.00**。
- **`swift`** —— 通过 SWIFT 的国际美元电汇，最低 **USD 25.00**。

美国各通道的预计时间为：**ACH 约 24–48 个工作小时；wire/Fedwire 为同一
工作日（最长 24 小时）；SWIFT 约 24–48 个工作小时，且可能因收款银行而
延长。**这些估算不改变 `processing` 状态，也不替代银行确认；银行截止时间
和节假日可能延长结算。

美国银行通道要求**每笔转账都附带收款人完整的身份与邮政地址** ——
收款人信息不完整会在创建时被拒绝（`422`，见下文）。收款人的
`country_code` 是其**居住国，可以是任何国家**（例如：向居住在德国的
收款人的美国银行账户发起 ACH 转账）；保持不变的是**银行**：在
`ach`/`wire` 中收款银行必须位于美国（`bank_country: "US"`），而
`swift` 本身就是国际化的。合规底线（古巴、伊朗、朝鲜和叙利亚）对
收款人所在国和银行所在国均保持封锁。必填与选填字段：

| 字段 | `ach` | `wire` | `swift` | 说明 |
|---|---|---|---|---|
| `name` | 必填 | 必填 | 必填 | 账户持有人的完整法定姓名 |
| `account_number` | 必填 | 必填 | 必填 | 美国银行账户号码 |
| `email` | 必填 | 必填 | 必填 | 通道会为每个收款人登记该邮箱 |
| `country_code` | 必填 | 必填 | 必填 | **收款人居住国**的 ISO-3166 alpha-2 —— 任何国家（不仅限于 `US`） |
| `address`、`city`、`postal_code` | 必填 | 必填 | 必填 | 收款人的完整邮政地址 |
| `state` | 条件必填 | 条件必填 | 条件必填 | **仅当 `country_code` 为 `US` 时**必填（两位字母的州代码）；其他国家选填 |
| `phone` | 选填 | 选填 | 选填 | 收款人联系电话 |
| `bank_name` | 必填 | 必填 | 必填 | 收款银行名称 |
| `bank_code` | 必填 | 必填 | 必填 | `ach`/`wire` 用 **ABA routing number**（9 位数字）；`swift` 用 **SWIFT BIC** |
| `account_type` | 必填 | — | — | `CHECKING` 或 `SAVING` |
| `bank_country` | 必填（`US`） | 必填（`US`） | 必填 | 收款银行所在国 —— **`ach`/`wire` 固定为 `US`**；`swift` 可为任何国家 |
| `bank_address`、`bank_city`、`bank_postal_code` | 必填 | 必填 | 选填 | 收款银行的地址块 |
| `bank_state` | 必填（美国银行） | 必填（美国银行） | 选填 | 收款银行的两位字母州代码 |
| `bank_phone` | 选填 | 选填 | 选填 | 收款银行电话 |

美国没有银行目录：`bank_code` 是收款人银行自身的 ABA routing number
（ACH/wire）或 SWIFT BIC（swift），由收款人提供。要在付款人输入时自动识别银行，可调用
`GET /v1/payouts/bank-directory/lookup` 并传入 routing number 或 SWIFT/BIC——它会从嵌入式公开银行目录解析出银行名称、城市、州和地址块，
便于预填 `bank_name` 和选填的 `bank_*` 地址字段。返回 `404 bank_not_found`
仅表示该代码不在目录中：表单保持手动填写即可。

```bash
curl "https://api.qbank.cl/platform/v1/payouts/bank-directory/lookup?routing_number=021000021" \
  -H "Authorization: Bearer <token>"
```

```json
{
  "routing_number": "021000021",
  "bank_name": "JPMORGAN CHASE",
  "bank_city": "TAMPA",
  "bank_state": "FL",
  "bank_postal_code": "33610",
  "bank_country": "US",
  "bank_phone": "813-432-3700",
  "source": "directory",
  "directory_vintage": "fed_ach_2019"
}
```

```bash ach
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "ach",
    "amount": "250.00",
    "beneficiary": {
      "name": "John Carter",
      "email": "john.carter@example.com",
      "account_number": "123456789012",
      "account_type": "CHECKING",
      "country_code": "US",
      "address": "1200 Brickell Ave",
      "city": "Miami",
      "state": "FL",
      "postal_code": "33131",
      "bank_name": "Example Bank",
      "bank_code": "021000089",
      "bank_address": "270 Park Ave",
      "bank_city": "New York",
      "bank_state": "NY",
      "bank_postal_code": "10017",
      "bank_country": "US"
    },
    "description": "Invoice 2210",
    "idempotency_key": "us-ach-2210"
  }'
```

```bash ach（美国境外的收款人）
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "ach",
    "amount": "250.00",
    "beneficiary": {
      "name": "Anna Becker",
      "email": "anna.becker@example.com",
      "account_number": "123456789012",
      "account_type": "CHECKING",
      "country_code": "DE",
      "address": "Friedrichstrasse 100",
      "city": "Berlin",
      "postal_code": "10117",
      "bank_name": "Example Bank",
      "bank_code": "021000089",
      "bank_address": "270 Park Ave",
      "bank_city": "New York",
      "bank_state": "NY",
      "bank_postal_code": "10017",
      "bank_country": "US"
    },
    "description": "Invoice 2210",
    "idempotency_key": "us-ach-2210-de"
  }'
```

```bash wire
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "wire",
    "amount": "1000.00",
    "beneficiary": {
      "name": "John Carter",
      "email": "john.carter@example.com",
      "account_number": "123456789012",
      "country_code": "US",
      "address": "1200 Brickell Ave",
      "city": "Miami",
      "state": "FL",
      "postal_code": "33131",
      "bank_name": "Example Bank",
      "bank_code": "021000089",
      "bank_address": "270 Park Ave",
      "bank_city": "New York",
      "bank_state": "NY",
      "bank_postal_code": "10017",
      "bank_country": "US"
    },
    "description": "Invoice 2211",
    "idempotency_key": "us-wire-2211"
  }'
```

```bash swift
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "swift",
    "amount": "1000.00",
    "beneficiary": {
      "name": "John Carter",
      "email": "john.carter@example.com",
      "account_number": "123456789012",
      "country_code": "US",
      "address": "1200 Brickell Ave",
      "city": "Miami",
      "state": "FL",
      "postal_code": "33131",
      "bank_name": "Example Bank",
      "bank_code": "CHASUS33XXX",
      "bank_country": "US"
    },
    "description": "Invoice 2212",
    "idempotency_key": "us-swift-2212"
  }'
```

```json
{
  "payout_id": "c5f2…",
  "country": "US",
  "currency": "USD",
  "method": "ach",
  "local_amount": "250.00",
  "fx_rate": "0.9980",
  "usdt_amount": "250.501002",
  "fee": "0.300000",
  "total_debit": "250.801002",
  "status": "processing",
  "bank_reference": "CBF1234567890123"
}
```

- **美国 payout 会保持 `processing`，直到银行确认人工付款。**
  创建响应已在 `bank_reference` 返回 CBF。监听 `payout_status_changed`
  以获得 `completed` 或 `failed`（已退款）。
- 该通道没有额外的收款人 AML/CFT hold：运营方手工付款，poller 对账。
- **最低金额**：`wire` 和 `swift` 至少 **USD 25.00**；低于该金额会在创建时
  被拒绝（`422`，`status_message` 为
  `"…payouts require an amount of at least USD 25"`）。ACH 无已验证的最低金额。
- 通道要求每笔转账附带**付款用途声明**。`purpose` 为必填项（21 值目录——见下文）；其他声明除非在 `options` 中按笔覆盖，否则使用默认值（值最长 140 字符）：

  | `options` 键 | 声明内容 | 默认值 |
  |---|---|---|
  | `purpose` | 付款用途（必填目录） | —（无；必填） |
  | `crypto_activity` | 该付款是否涉及加密货币买卖活动（`Yes`/`No`） | `No` |
  | `payment_gateway` | 入金网关声明 | 通道默认值 |
