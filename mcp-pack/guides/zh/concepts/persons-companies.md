---
title: "个人与企业"
description: "两种账户类型逐产品的全部差异，汇总在一个页面"
slug: zh/concepts/persons-companies
lang: zh
source_url: https://docs.cbpayapp.com/zh/concepts/persons-companies
---
CBPay 有两种账户类型 — **个人**（`type: "person"`）和**企业**
（`type: "company"`）— 它们使用**同一套 API** 和相同的接口。
本页将所有差异汇总在一处，让您永远不必猜测哪一条适用。

账户类型在创建账户时设定且不可更改。您可以在
`GET /v1/me` → `type` 中查看。

## 完整差异表

| 能力 | 个人 | 企业 |
|---|---|---|
| USDT 余额、出款、收款、转账、银行服务、对账单 | 相同 | 相同 |
| 每个网络+资产组合的**充值钱包**（[加密货币](https://docs.cbpayapp.com/zh/guides/crypto)） | **1 个**（随账户创建；仅用于接收） | **1 个**（随账户创建；仅用于接收） |
| **隔离钱包**（[独立链上余额](https://docs.cbpayapp.com/zh/guides/segregated-wallets)） | **每个网络+资产组合 1 个** | **不限**（用 `label` 加以区分） |
| **卡片** | **1 张虚拟卡 + 1 张实体卡**，仅限本人使用 | **不限**，可为企业本身或**指定人员**（员工）发卡 |
| **可登录的成员**（`POST /v1/members`） | 否（`403 company_only`） | 是 — `owner` / `operator` / `viewer` 角色 |
| **身份验证**（`/v1/me/verification`） | **KYC** 开户验证（含证件 + 活体检测的向导） | **KYB** 开户验证（含企业文件的向导） |
| **为第三方做验证**（`/v1/{kyc,kyb}/links` 及提交） | 否（`403 company_account_required`） | 是 — 托管链接或 API 数据提交，计费 `kyc_verification`/`kyb_verification` |
| **AML 筛查**（`POST /v1/aml/screenings`） | **个人**筛查（`customer.person`），计费 `compliance_person` | **企业**筛查（`customer.company`），计费 `compliance_company` |
| 持卡人（首次发卡） | 个人资料 + 身份证件 | 企业资料 + 企业文件（或指定人员的资料） |
| 注册 | `type: "person"` | `type: "company"`（建议附带 `tax_id`） |

其余一切 — 认证、幂等性、webhook、状态、错误、单卡消费限额、
已启用的服务 — 均完全相同。

## 实际使用是什么样子

#### 个人账户

- 注册：调用 `POST /v1/auth/register` 并传入 `type: "person"`
  （或由您的运营方创建）。
- 验证：通过 `POST /v1/me/verification/link` 获取您的 KYC 链接并
  完成向导 — 在通过之前您只能进行入金
  （[指南](https://docs.cbpayapp.com/zh/guides/kyc)）。
- 加密货币：您的**充值钱包随账户自动创建**（每个网络+资产组合
  一个；仅用于接收）。需要拥有独立余额的钱包？您可以持有
  **每个网络+资产组合 1 个隔离钱包**。
- 卡片：最多 **1 张虚拟卡 + 1 张实体卡**；首次发卡使用您的资料与
  证件 — [指南](https://docs.cbpayapp.com/zh/guides/cards)。
- 无成员：由您的登录账号和您的 API 密钥操作账户。

#### 企业账户

- 注册：`type: "company"`，最好附带 `tax_id`。
- 验证：通过 `POST /v1/me/verification/link` 获取您的 KYB 链接并
  用企业资料完成向导；通过后您还可以为自己的客户做验证
  （[指南](https://docs.cbpayapp.com/zh/guides/kyc)）。
- 加密货币：您的**充值钱包随账户自动创建**（每个网络+资产组合
  一个；仅用于接收）。如需分开的链上余额，可创建**不限数量的
  隔离钱包**（可按分支机构、按产品、按供应商各建一个……），并使用
  描述性的 `label`。
- 卡片：**不限数量** — 企业卡（持卡人 = 企业本身，首张卡需企业
  文件）或**员工卡**（指定人员，每次指定都需其个人资料）—
  [指南](https://docs.cbpayapp.com/zh/guides/cards)。
- 成员：添加拥有独立登录和权限的用户
  （`owner`/`operator`/`viewer`）— [指南](https://docs.cbpayapp.com/zh/authentication#company-members)。

## 能揭示账户类型的错误

| `error` | 含义 |
|---|---|
| `403 company_only` | 您在个人账户上尝试了企业功能（成员） |
| `422 wallet_limit_reached` | 该账户在此组合下已持有对应钱包（充值钱包：所有账户；隔离钱包：个人账户） |
| `409 card_limit_reached` | 个人账户已有一张有效卡或一条开放申请 |
| `400 physical_temporarily_unavailable` | 新实体卡发行暂时暂停；已经发行的实体卡继续正常使用 |

> **注**
您的业务规模超出了个人账户的能力？账户类型无法通过 API 更改：
请联系您的 CBPay 管理员创建企业账户，并通过内部转账（免费且即时）
迁移余额。
