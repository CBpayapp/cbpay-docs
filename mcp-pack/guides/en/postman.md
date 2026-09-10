---
title: "Postman"
description: "Ready-to-import collection to try the whole API"
slug: en/postman
lang: en
source_url: https://docs.cbpayapp.com/en/postman
---
Download the official CBPay Postman collection, generated from the same
OpenAPI specification behind this documentation: every endpoint, with one
request per use case (each named example in the spec) and one saved
response per operation.

- **CBPay API — Postman collection** - Download `cbpay-api.postman_collection.json` (v2.1)

> **Collection updated:** 2026-09-10 03:23 UTC · 356 requests · version `fc1301ad0b4e`

## How to use it

### Import the collection

In Postman: **Import** → drag the downloaded file.
### Set your variables

The collection ships with two variables:

| Variable | Value |
|---|---|
| `baseUrl` | `https://api.qbank.cl/platform` (pre-configured) |
| `token` | Your session JWT or `pk_...` API key |
### Try it

Every request inherits Bearer authentication with `{{token}}`. Start
with `GET /v1/me` to validate your credential and `GET /v1/balances` to
see your balance.
> **Note**
The collection is regenerated with every API version — download it again
after each [changelog](https://docs.cbpayapp.com/en/changelog) entry to get the latest endpoints.
