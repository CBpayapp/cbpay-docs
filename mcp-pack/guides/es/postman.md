---
title: "Postman"
description: "Colección lista para importar y probar toda la API"
slug: es/postman
lang: es
source_url: https://docs.cbpayapp.com/es/postman
---
Descarga la colección oficial de Postman de CBPay, generada desde la misma
especificación OpenAPI de esta documentación: incluye todos los endpoints,
con un request por caso de uso (cada ejemplo nombrado del spec) y una
respuesta guardada por operación.

- **CBPay API — Colección Postman** - Descargar `cbpay-api.postman_collection.json` (v2.1)

> **Colección actualizada:** 2026-09-10 01:07 UTC · 356 requests · versión `b84ed853198d`

## Cómo usarla

### Importa la colección

En Postman: **Import** → arrastra el archivo descargado.
### Configura tus variables

La colección trae dos variables:

| Variable | Valor |
|---|---|
| `baseUrl` | `https://api.qbank.cl/platform` (ya configurada) |
| `token` | Tu JWT de sesión o API key `pk_...` |
### Prueba

Todas las requests heredan la autenticación Bearer con `{{token}}`.
Empieza por `GET /v1/me` para validar tu credencial y `GET /v1/balances`
para ver tu saldo.
> **Nota**
La colección se regenera con cada versión de la API — descárgala de nuevo
después de cada entrada del [changelog](https://docs.cbpayapp.com/es/changelog) para tener los
últimos endpoints.
