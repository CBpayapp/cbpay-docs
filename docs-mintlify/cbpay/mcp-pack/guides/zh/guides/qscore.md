---
title: "Qscore — API 优先的征信局"
description: "为个人和企业购买带评分的完整信用报告（智利先行），下载 PDF，公开验证，管理 ARCO 异议，并通过告警监控主体。"
slug: zh/guides/qscore
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/qscore
---
> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

Qscore 是平台的 API 优先征信局。一次调用即可返回个人或企业的**完整信用报告**——身份、信贷账户、逾期记录、破产记录、商业活动、替代数据——外加**信用评分（1–999）及其等级和可解释的原因码**，渲染为品牌化 PDF 并以 JSON 暴露。

- **智利先行，国家无关设计**：目前主体为智利（`country: "CL"`，RUT 作为 `doc_id`）；新国家无需更改契约即可接入。
- **实时新鲜度**：每份报告在购买时查询数据源，并按来源声明数据是 `live`、`cached` 还是 `unavailable`。绝不静默使用陈旧数据。
- **内置合规**：声明的 `purpose` 为必填（智利数据保护法），每个评分都带有原因码，每份报告都包含公开验证码。

> **注**
Qscore 是付费产品，由您账户的 `risk` 服务标志门控，按报告计费（独立费用 `risk_report_person` / `risk_report_company`）。如果收费后生成失败，费用将**自动退还**，报告以 `failed` 结束并带有 `error_code`。例外：**您自己的报告（自助）是免费的**——见下文"您自己的报告（自助）"。
> **注**Qscore 还提供独立的[欺诈与身份报告](https://docs.cbpayapp.com/zh/guides/qscore-fraud)和公开的[Qscore Index](https://docs.cbpayapp.com/zh/guides/qscore-index)。## 工作原理

```mermaid
sequenceDiagram
    autonumber
    participant C as 您的系统
    participant P as CBPay 平台
    participant Q as Qbank 核心
    participant S as 数据源
    C->>P: POST /v1/qscore/reports (doc_id, purpose, idempotency_key)
    P->>Q: POST /v1/bureau/fetch (实时查询)
    Q->>S: 查询官方来源
    S-->>Q: 征信记录（已去重）
    Q-->>P: 记录
    P->>P: 计算评分 v1 + 构建 + 渲染 PDF
    P-->>C: 201 报告就绪（评分、等级、完整 JSON）
    P-->>C: Webhook risk_report_ready
    C->>P: GET /v1/qscore/reports/{report_id}/pdf
```

生成是**同步的**：`POST` 获取征信记录、计算评分、渲染 PDF，并在单个响应中返回就绪的报告。某个来源宕机**不会**导致付费报告失败——报告将使用持久化数据生成，该来源在 `sources` 部分声明为 `cached`（如果完全没有贡献则声明为 `unavailable`）。

## 您自己的报告（自助）

如果您持有**已验证账户**（KYC/KYB 已批准），您可以直接生成并下载**您自己的 Qscore 报告**。这是您访问个人数据的权利（ARCO / 智利第 21.719 号法律），而不是购买：

- **免费**：永不收取费用。
- **不影响评分**：自助报告不计入您评分的查询次数——查看自己的报告绝不会损害评分。
- **设计上防预言机**：主体身份来自您 KYC/KYB 中已验证的 `tax_id`。请求**不**接受 `doc_id`——通过这些端点请求他人报告是不可能的。
- **频率限制**：每 30 天一份**新**报告。如果您在窗口期内已有 `ready` 报告，`POST` 将返回该报告并带 `idempotency_hit: true`（HTTP 200），而不会生成新报告。

### 生成（或复用）您的报告

`POST /v1/qscore/my-report` — 请求体可选：`{"lang": "en"|"es"|"zh"}`（默认 `en`）。生成是**同步的**：响应携带已完成的报告。无需 `idempotency_key`——幂等性按账户、主体和日期确定（同一天重复提交将返回已创建的报告）。

```bash 生成您自己的报告
curl -X POST "https://api.qbank.cl/platform/v1/qscore/my-report" \
  -H "Authorization: Bearer pk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"lang": "zh"}'
```

```json 201 Created（已生成新报告）
{
  "report_id": "9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "ready",
  "purpose": "self_access",
  "lang": "zh",
  "band": "B",
  "model_version": "qscore-v2",
  "verify_code": "Q9f1c2d3e4a5b4c6d8e7f0a1b2c3d4e5f1a2b3c4d5e6f",
  "created_at": "2026-08-08T15:04:12Z",
  "score": 742,
  "reason_codes": ["RC01", "RC07"],
  "completed_at": "2026-08-08T15:04:19Z",
  "report": { "...": "完整报告 JSON" }
}
```

30 天内再次调用将返回 `200 OK`，携带同一报告并带 `"idempotency_hit": true`。如果生成失败，响应为 `201`，`status: "failed"` 并带 `error_code` / `error_message`（未收取任何费用——自助报告是免费的）。

### 读取您的最新报告

`GET /v1/qscore/my-report` 返回您最近的自助报告（任何状态），不生成新报告——如果您从未生成过，则返回 `404 not_found`。

### 下载 PDF

`GET /v1/qscore/my-report/pdf` 下载您最新自助报告的 PDF（`Content-Disposition: attachment; filename="qscore_self_<id>.pdf"`）。如果报告尚未 `ready`，则返回 `404 pdf_not_ready`。

PDF 带有与任何 Qscore 报告相同的公开验证码——任何持有它的人都可以在 `GET /verify/qscore/{code}` 验证其真实性（见下文"公开验证"）。

### 自助报告错误

| HTTP | 代码 | 何时 | 解决方案 |
|---|---|---|---|
| 403 | `kyc_required` | 您账户的 KYC/KYB 未获批准 | 请先完成身份验证 |
| 409 | `no_tax_id` | 您的账户没有已验证的税号记录 | 请完成您的已验证资料或联系支持 |
| 400 | `invalid_tax_id` | 已登记的税号对账户所在国家无效 | 请联系支持更正您的已验证数据 |
| 409 | `identity_mismatch` | 账户的 `tax_id` 与已验证的身份文件不符（已被覆盖） | 请联系支持 —— 您的已验证数据必须一致 |
| 404 | `not_found` | 您从未生成过自助报告（`GET`） | 使用 `POST /v1/qscore/my-report` 生成 |
| 404 | `pdf_not_ready` | 报告尚未 `ready` 或没有 PDF | 在报告 `ready` 后重试下载 |

> **注**
商业端点 `POST /v1/qscore/reports` 会以 `400 invalid_purpose` **拒绝** `purpose: "self_access"`——自助访问只能通过 `/v1/qscore/my-report`。自助报告的 `risk_report_ready` webhook 在 `data` 中带有额外的 `"purpose": "self_access"` 字段（商业报告省略该字段）。
## 1. 购买报告

`POST /v1/qscore/reports` 创建并生成完整报告。`idempotency_key` 为**必填**（报告会收取费用：使用相同密钥重试将返回原始报告并带 `idempotency_hit: true`，绝不会重复收费）。

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `doc_id` | string | 是 | 主体的证件号。在智利为 RUT（`11.111.111-1`）；将规范化为标准形式。 |
| `country` | string | 是 | 证件的 ISO 3166-1 alpha-2 国家代码。目前为 `CL`。 |
| `subject_type` | string | 否 | `person` 或 `company`。如果省略，将从证件推断。 |
| `purpose` | string | 是 | 声明的用途（数据保护法）：`credit_evaluation`、`tenant_screening`、`hiring`、`supplier_onboarding`、`other`。 |
| `lang` | string | 否 | 报告语言：`en`（默认）、`es`、`zh`。 |
| `idempotency_key` | string | 是 | 您此次购买的唯一密钥。 |

#### 个人

```bash 创建个人报告
curl -X POST "https://api.qbank.cl/platform/v1/qscore/reports" \
  -H "Authorization: Bearer pk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "11.111.111-1",
    "country": "CL",
    "purpose": "credit_evaluation",
    "lang": "zh",
    "idempotency_key": "qscore-2026-08-08-0001"
  }'
```

#### 企业

```bash 创建企业报告
curl -X POST "https://api.qbank.cl/platform/v1/qscore/reports" \
  -H "Authorization: Bearer pk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "76.123.456-0",
    "country": "CL",
    "subject_type": "company",
    "purpose": "supplier_onboarding",
    "lang": "zh",
    "idempotency_key": "qscore-2026-08-08-0002"
  }'
```

```json 201 Created（报告就绪）
{
  "report_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "ready",
  "purpose": "credit_evaluation",
  "lang": "zh",
  "band": "B",
  "model_version": "qscore-v1",
  "verify_code": "Qf47ac10b58cc4372a5670e02b2c3d4791a2b3c4d5e6f",
  "created_at": "2026-08-08T15:04:22Z",
  "score": 742,
  "completed_at": "2026-08-08T15:04:25Z",
  "report": {
    "meta": {
      "report_id": "QSR-f47ac10b58cc",
      "lang": "zh",
      "purpose": "credit_evaluation",
      "generated_at": "2026-08-08T15:04:25Z",
      "verification_code": "Qf47ac10b58cc4372a5670e02b2c3d4791a2b3c4d5e6f",
      "verification_url": "https://business.cbpayapp.com/verify/qscore/Qf47ac10b58cc4372a5670e02b2c3d4791a2b3c4d5e6f"
    },
    "identity": {
      "subject_type": "person",
      "doc_id": "11111111-1",
      "name": "Juan Pérez González",
      "country": "CL"
    },
    "score": {
      "score": 742,
      "band": "B",
      "model_version": "qscore-v1",
      "reason_codes": [
        {"code": "ACTIVE_TRADELINES", "direction": "positive", "weight": "medium"},
        {"code": "CREDIT_HISTORY_DEPTH", "direction": "positive", "weight": "low"}
      ],
      "computed_at": "2026-08-08T15:04:25Z"
    },
    "summary": ["无未结逾期记录", "税务状态正常"],
    "internal_score": {"available": false},
    "sources": [
      {"source": "res_chile", "label": "Registro de Empresas y Sociedades (RES)", "records": 2, "fetched_at": "2026-08-08T15:04:23Z", "freshness": "live"}
    ]
  }
}
```

如果收费后出现故障，费用将被退还，响应为错误，并在报告中持久化 `error_code: "generation_failed"`。使用**相同**的 `idempotency_key` 重新运行将返回原始报告（或其失败状态）——绝不会重复收费。

## 2. 评分（模型 v1）

评分运行 `qscore-v1`：基础分 **600**，范围 **1–999**，根据不利事实（未结逾期、拒付票据、破产、近期查询）和正面信号（活跃信贷账户、信用历史深度、公司活跃度、替代数据）进行调整。

| 等级 | 范围 | 解读 |
|---|---|---|
| `A` | 800–999 | 优秀 |
| `B` | 650–799 | 良好 |
| `C` | 500–649 | 一般 |
| `D` | 350–499 | 较弱 |
| `E` | 1–349 | 高风险 |
| `SC` | — | 未找到主体数据（评分为 `null`） |

每份报告都带有 `reason_codes`——评分的可解释层：

| 代码 | 方向 | 含义 |
|---|---|---|
| `NO_DATA` | negative | 未找到主体记录（等级 `SC`） |
| `BANKRUPTCY_OPEN` | negative | 有未结破产/资不抵债程序 |
| `OPEN_DELINQUENCY` | negative | 有未结催收逾期 |
| `PROTESTO_OPEN` | negative | 有未支付的拒付票据（支票/本票） |
| `RECENT_DELINQUENCY` | negative | 近期报告的逾期 |
| `MANY_RECENT_QUERIES` | negative | 过去 90 天内针对该主体购买了许多报告 |
| `ACTIVE_TRADELINES` | positive | 活跃且正常的信贷账户 |
| `CREDIT_HISTORY_DEPTH` | positive | 信用历史较长 |
| `COMPANY_ACTIVE` | positive | 公司活跃且有税务活动 |
| `COMPANY_NEW` | negative | 新成立的公司 |
| `ALTERNATIVE_POSITIVE` | positive | 正面替代数据（水电费、开放金融） |
| `INTERNAL_ACTIVITY` | positive | 平台内部正面信号 |

### 行业同业基准（仅企业报告）

**企业**报告可能包含 `peer_benchmark` 块：评分在其**细分行业**中的相对位置——相同国家、相同行业（ISIC 分类，取自税务登记）。

```json
"peer_benchmark": {
  "available": true,
  "segment_code": "6499",
  "segment_label": "Other financial service activities",
  "peers": 12,
  "percentile": 75,
  "median_score": 640
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `available` | 布尔值 | 有足够可比群体时为 `true`。 |
| `segment_code` / `segment_label` | 字符串 | 主体的行业代码与名称（ISIC）。 |
| `peers` | 数字 | 参与比较的企业数量。 |
| `percentile` | 数字 | 评分**更低**的同业占比（75 = 优于 75% 的同业）。 |
| `median_score` | 数字 | 该细分行业的评分中位数。 |

基准规则：

- **仅企业报告** — 个人报告永不包含该块（直接省略）。
- **行业取自税务登记**，并记录在主体上（以最新值为准）。
- **可比群体为同国家同行业每家企业的最新评分**，不含被评估主体。
- **可比企业少于 5 家时不发布** — 该块将从报告中省略（绝不虚构统计背景）。
- `percentile` 读作"优于 N% 的同业"；`median_score` 为该细分行业的评分中位数。

报告 PDF 仅在该块可用时包含同业对比部分。

## 3. 查询与历史

### 列出报告

`GET /v1/qscore/reports` 列出您账户购买的报告。`from` 和 `to`（日期 `YYYY-MM-DD`，组织时区，两端均包含）为**必填**；`subject_id` 和 `status`（`pending`、`ready`、`failed`）为可选筛选；使用 `page` / `page_size` 分页（默认 50，最大 200）。

```bash 列出报告
curl "https://api.qbank.cl/platform/v1/qscore/reports?from=2026-08-01&to=2026-08-31&status=ready&page=1&page_size=50" \
  -H "Authorization: Bearer pk_live_..."
```

```json 200 OK
{
  "items": [
    {
      "report_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "account_id": "ae8c91f2-…",
      "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "purpose": "credit_evaluation",
      "status": "ready",
      "lang": "zh",
      "score": 742,
      "band": "B",
      "score_model_version": "qscore-v1",
      "reason_codes": [{"code": "ACTIVE_TRADELINES", "direction": "positive", "weight": "medium"}],
      "verify_code": "Qf47ac10b58cc4372a5670e02b2c3d4791a2b3c4d5e6f",
      "created_at": "2026-08-08T15:04:22Z",
      "completed_at": "2026-08-08T15:04:25Z"
    }
  ],
  "meta": {"page": 1, "page_size": 50, "total": 1}
}
```

### 报告详情

`GET /v1/qscore/reports/{report_id}` 返回报告；当状态为 `ready` 时，包含完整的 `report` 对象（与创建响应相同的结构）。

### 下载 PDF

`GET /v1/qscore/reports/{report_id}/pdf` 下载品牌化 PDF（`application/pdf`，文件名 `qscore_<report_id>.pdf`）。在报告 `ready` 之前，响应为 `404 pdf_not_ready`。PDF 是私密文档：下载需要**身份验证**——绝不会附加到电子邮件或暴露在公开 URL 上。

### 主体档案与当前评分（无需购买新报告）

`GET /v1/qscore/subjects/{doc_id}?country=CL` 返回您已购买过报告的证件的主体档案（身份 + 最新评分）：

```json 200 OK（主体档案）
{
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "country": "CL",
  "doc_id": "11111111-1",
  "subject_type": "person",
  "display_name": "Juan Pérez González",
  "last_score": 742,
  "last_band": "B",
  "last_score_at": "2026-08-08T15:04:25Z"
}
```

`GET /v1/qscore/subjects/{doc_id}/score?country=CL` 仅返回当前评分（如果主体尚未有评分，则为 `404 no_score`）：

```json 200 OK（当前评分）
{
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "doc_id": "11111111-1",
  "country": "CL",
  "band": "B",
  "model_version": "qscore-v1",
  "computed_at": "2026-08-08T15:04:25Z",
  "score": 742
}
```

## 4. 报告状态

| 状态 | 含义 | 操作 |
|---|---|---|
| `pending` | 报告已创建，正在生成（同步调用中的瞬态） | 无需操作——`POST` 响应携带最终状态 |
| `ready` | 报告已生成：评分、完整 JSON 和 PDF 可用（最终） | 读取 JSON、下载 PDF、分享验证链接 |
| `failed` | 生成失败；费用已**退还**（最终） | 读取 `error_code` / `error_message`，修复原因，使用**新的** `idempotency_key` 购买新报告 |

## 5. 错误

| HTTP | 代码 | 何时 | 解决方案 |
|---|---|---|---|
| 400 | `invalid_payload` | 缺少 `doc_id`/`country` 或 JSON 格式错误 | 使用有效的 JSON body 发送两个字段 |
| 400 | `purpose_required` | 缺少 `purpose` | 声明用途（数据保护法） |
| 400 | `invalid_purpose` | `purpose` 不在封闭列表中，或者您在 `POST /v1/qscore/reports` 中发送了 `self_access`（该值保留给自助服务） | 使用 `credit_evaluation`、`tenant_screening`、`hiring`、`supplier_onboarding` 或 `other`；对于您自己的报告，请使用 `POST /v1/qscore/my-report` |
| 400 | `invalid_doc_id` | 证件在该国家/地区无效（例如 RUT 校验位错误） | 修正该国家/地区的 `doc_id` 格式 |
| 400 | `invalid_subject_type` | `subject_type` 不是 `person`/`company` 且无法推断 | 显式发送 `subject_type` |
| 400 | `idempotency_key_required` | 缺少 `idempotency_key` | 每次购买发送唯一密钥 |
| 404 | `not_found` | 报告/主体不存在（或属于另一账户） | 检查 ID |
| 404 | `no_score` | 主体尚未有计算出的评分 | 先购买报告 |
| 404 | `pdf_not_ready` | 报告尚未 `ready` | 轮询详情直到 `status=ready` |
| 502 | `generation_failed` | 收费后无法生成报告 | 费用已退还；稍后重试或联系支持 |

完整目录请参阅[错误](https://docs.cbpayapp.com/zh/errors)。

## 6. Webhooks

在您的 [webhook 设置](https://docs.cbpayapp.com/zh/webhooks)中订阅 Qscore 事件。三者都是账户受众事件，与所有其他 webhook 一样签名。

#### risk_report_ready — 报告已生成完毕

```json risk_report_ready
{
  "report_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "doc_id": "11111111-1",
  "country": "CL",
  "subject_type": "person",
  "score": 742,
  "band": "B",
  "verify_code": "Qf47ac10b58cc4372a5670e02b2c3d4791a2b3c4d5e6f"
}
```

自助报告（见"您自己的报告（自助）"）会发出相同的事件，并带有额外的 `"purpose": "self_access"` 字段；商业报告省略该字段。

#### risk_score_changed — 主体的评分发生变化

当新报告计算出的评分与主体之前的评分不同时触发。

```json risk_score_changed
{
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "report_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "old_score": 715,
  "new_score": 742,
  "old_band": "B",
  "new_band": "B"
}
```

#### risk_monitoring_alert — 被监控主体发生变化

每当主体的评分跌破您的 `monitor_since_score` 下限、征信出现新记录或记录被移除时，都会为每条启用的监控订阅触发。订阅后的首次评估仅建立基线，绝不告警。

```json risk_monitoring_alert
{
  "monitoring_id": "2f7b1c94-8d3a-4c5e-9f01-6a7b8c9d0e11",
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "doc_id": "11111111-1",
  "country": "CL",
  "subject_type": "person",
  "triggers": ["score_drop_below", "new_records"],
  "previous_score": 688,
  "score": 612,
  "band": "C",
  "record_count": 4,
  "new_records": [
    {
      "source": "res_chile",
      "record_type": "debt_collection",
      "reported_at": "2026-08-08",
      "amount": "350000",
      "currency": "CLP",
      "status": "open"
    }
  ],
  "detected_at": "2026-08-08T16:30:00Z"
}
```

## 7. 公开验证

每份报告 PDF 都会打印**验证码**和 URL。持有验证码的任何人都可以在 `GET /verify/qscore/{code}` 检查报告的真实性——不包含 PII（无需身份验证）：

```json 200 OK（有效报告）
{
  "valid": true,
  "type": "verification_report",
  "kind": "qscore",
  "status": "ready",
  "decision": "B",
  "date": "2026-08-08",
  "issued_by": "CBPay"
}
```

无效或被篡改的代码返回 `404` 和 `{"valid": false, ...}`。该端点按 IP 限流，除了有效性、等级和日期外不透露任何信息。

## 8. ARCO 异议

数据主体可以行使其 ARCO 权利（访问、更正、删除、反对）。您的账户可以针对主体的特定记录提出异议：

```bash 提出异议
curl -X POST "https://api.qbank.cl/platform/v1/qscore/subjects/11111111-1/disputes?country=CL" \
  -H "Authorization: Bearer pk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "record_source": "res_chile",
    "record_ref": "RES-2026-04512",
    "reason": "报告的逾期已于 2026-07-30 支付",
    "report_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }'
```

```json 201 Created
{
  "dispute_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "report_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "record_source": "res_chile",
  "record_ref": "RES-2026-04512",
  "reason": "报告的逾期已于 2026-07-30 支付",
  "status": "open",
  "created_by": "ae8c91f2-…",
  "created_at": "2026-08-08T16:11:00Z"
}
```

异议生命周期：`open` → `under_review` → `resolved_corrected` | `resolved_rejected`（最终）。使用 `GET /v1/qscore/subjects/{doc_id}/disputes?country=CL&status=open` 列出（分页），使用 `GET /v1/qscore/disputes/{dispute_id}` 读取单个。异议由您的组织管理员在管理面板中处理。

## 9. 监控

当您已持有某主体的 `ready` 报告后，可订阅**持续监控**，在发生相关变化时收到 `risk_monitoring_alert` webhook：评分跌破您的阈值、征信出现新记录或记录被移除。监控**免费** —— 唯一要求是已购买该主体的报告（与评分端点同一策略：未付费了解某主体之前，任何人都不能监控它）。

```bash 订阅（或更新阈值）
curl -X PUT "https://api.qbank.cl/platform/v1/qscore/subjects/11111111-1/monitoring" \
  -H "Authorization: Bearer pk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "country": "CL",
    "monitor_since_score": 640,
    "only_material": true
  }'
```

```json 200 OK
{
  "monitoring_id": "2f7b1c94-8d3a-4c5e-9f01-6a7b8c9d0e11",
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "doc_id": "11111111-1",
  "country": "CL",
  "subject_type": "person",
  "active": true,
  "only_material": true,
  "monitor_since_score": 640,
  "last_score": 688,
  "last_record_count": 3,
  "created_at": "2026-08-08T16:20:00Z",
  "last_checked_at": "2026-08-08T16:25:00Z"
}
```

- `monitor_since_score`（可选，1–999）：当评分跌破此阈值时告警（触发器 `score_drop_below`）。
- `only_material`（默认 `false`）：为 `true` 时仅重大变更触发告警。
- Worker 每 **约 5 分钟**重新评估所有被监控主体。首次评估仅建立基线 —— 绝不会针对您在已购报告中已见过的数据告警。

使用 `GET /v1/qscore/subjects/{doc_id}/monitoring` 读取单个订阅，使用 `GET /v1/qscore/monitoring?active=true&page=1&page_size=50` 列出账户下所有被监控主体（分页：`items`、`page`、`page_size`、`total`），并使用 `DELETE` 停用：

```bash 停用监控
curl -X DELETE "https://api.qbank.cl/platform/v1/qscore/subjects/11111111-1/monitoring?country=CL" \
  -H "Authorization: Bearer pk_live_..."
```

```json 200 OK
{
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "doc_id": "11111111-1",
  "active": false
}
```

`DELETE` 为停用（`active: false`）—— 订阅历史永不删除，再次 `PUT` 即以新阈值重新激活。

> **重要**
如果未购买该主体的 `ready` 报告，`PUT` 将返回 `403 report_required` —— 与主体不存在时的响应**相同**，这是有意设计，确保端点永不泄露某证件号是否存在于征信库。参见[错误](https://docs.cbpayapp.com/zh/errors)。
告警负载（`risk_monitoring_alert`）包含触发器（`score_drop_below`、`new_records`、`records_removed`）、当前与先前评分、等级以及新记录 —— 完整示例见 [webhooks](https://docs.cbpayapp.com/zh/webhooks)。

## 10. 批量评分(组合)

若要一次性评估整个组合而非逐个主体,请通过 `POST /v1/qscore/batches` 提交一个**批次**:最多 5,000 个主体(JSON 或 CSV),整个批次共享一个 `country` 和 `purpose`,费用预先估算。API 立即返回 `202 Accepted`,后台 worker 逐条生成单份报告——每个条目都是标准的 Qscore 报告,带有自己的 PDF、费用,以及生成失败时的自动退款。

- **结束时仅一次通知**:批次完成后,您将收到恰好**一个** `risk_batch_completed` webhook 和**一封**汇总邮件(绝不按主体逐个发送)。
- **后续跟踪**:列出并查看批次、分页浏览条目,并通过 `GET /v1/qscore/batches/{id}/results.csv` 下载汇总 CSV。

完整流程(mermaid 图、按条目拒绝、状态、错误与 FAQ)请参见[批量评分指南](https://docs.cbpayapp.com/zh/guides/qscore-batch)。

## 常见问题

#### 每份报告都会重新计算评分吗？
    是的。每次购买都会实时查询来源，并使用当前的 `qscore-v1` 模型重新计算评分。如果某个来源宕机，报告将使用持久化数据生成，该来源在 `sources` 部分声明为 `cached`/`unavailable`——绝不静默。
#### 如果收费后报告失败会怎样？
    费用将在同一流程中自动退还，报告以 `failed` 结束并带有 `error_code`。您的 `idempotency_key` 将重放到该失败的报告；要重试，请使用新密钥。
#### 为什么用途是必填的？
    智利数据保护法要求声明合法用途才能查询个人或企业的信用数据。该用途与报告一起存储并打印在报告中（供数据主体审计）。
#### 我可以在不支付报告费用的情况下查看某人的评分吗？
    可以——如果您已经购买过该主体的报告，`GET /v1/qscore/subjects/{doc_id}/score` 将免费返回最新计算的评分。主体的第一份报告始终是付费的完整报告。
#### PDF 会通过电子邮件发送吗？
    不会。"报告就绪"电子邮件特意不携带附件（第三方数据最小化）。PDF 只能通过 API 身份验证后下载。
#### 支持哪些国家/地区？
    目前为智利（`country: "CL"`，RUT 作为 `doc_id`）。契约是国家无关的：新国家/地区接入其来源后将使用相同的端点。
#### 被监控主体多久检查一次？
    每约 5 分钟。`risk_monitoring_alert` webhook 仅在相对基线发生变化时才触发（设置 `only_material: true` 后仅重大变更触发）—— 绝不会因无变化而打扰您。
