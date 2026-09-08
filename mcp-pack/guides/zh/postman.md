---
title: "Postman"
description: "可直接导入的集合，用于试用整个 API"
slug: zh/postman
lang: zh
source_url: https://docs.cbpayapp.com/zh/postman
---
下载官方 CBPay Postman 集合，它由支撑本文档的同一份 OpenAPI 规范生成：涵盖所有端点，每个用例一个请求（对应规范中的每个命名示例），每个操作一个已保存的响应。

- **CBPay API — Postman 集合** - 下载 `cbpay-api.postman_collection.json`（v2.1）

> **集合更新时间：** 2026-09-07 12:06 UTC · 354 个请求 · 版本 `9f134a92b9cd`

## 如何使用

### 导入集合

在 Postman 中：**Import** → 拖入下载的文件。
### 设置变量

集合自带两个变量：

| 变量 | 值 |
|---|---|
| `baseUrl` | `https://api.qbank.cl/platform`（已预先配置） |
| `token` | 您的会话 JWT 或 `pk_...` API 密钥 |
### 开始试用

每个请求都通过 `{{token}}` 继承 Bearer 认证。先用 `GET /v1/me` 验证您的凭证，再用 `GET /v1/balances` 查看您的余额。
> **注**
集合会随每个 API 版本重新生成——每次[更新日志](https://docs.cbpayapp.com/zh/changelog)有新条目后请重新下载，以获取最新端点。
