---
title: "Documentos de facturación"
description: "Tus documentos tributarios chilenos (DTE) en el portal: lista, detalle y descarga del XML firmado"
slug: es/guides/billing
lang: es
source_url: https://docs.cbpayapp.com/es/guides/billing
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

Cada comisión que CBPay te factura en Chile tiene su documento tributario
electrónico (DTE), emitido directo al Servicio de Impuestos Internos (SII).
La sección **Facturación** del portal (Informes → Facturación, en cuentas
persona y empresa) lista tus documentos con folio, tipo, estado, total y
fecha de emisión, y cada detalle permite descargar el **XML DTE firmado**
para tu contabilidad. Solo ves los documentos de tu propia cuenta.

```mermaid
sequenceDiagram
    participant Y as Tú (portal)
    participant API as API CBPay
    participant S as SII (Chile)
    Y->>API: GET /v1/me/billing/docs
    API-->>Y: Tus DTE (folio, tipo, estado, total)
    Y->>API: GET /v1/me/billing/docs/{id}
    API-->>Y: Detalle + dte_xml firmado
    Note over S: El SII acepta o rechaza cada DTE;<br/>estado y glosa se actualizan en el documento
```

## Tipos de documento y estados

| Tipo | Significado |
|---|---|
| `33` | Factura electrónica (afecta, con IVA) |
| `34` | Factura electrónica exenta |
| `61` | Nota de crédito electrónica (anula una factura) |

| Estado | Significado |
|---|---|
| `queued` / `processing` / `stamped` / `sent` / `verify` | En camino al SII |
| `accepted` | Aceptado por el SII (final) |
| `rejected` | Rechazado por el SII (final, nada se facturó) |
| `failed` | Error temporal, se reintenta solo |
| `paused` | En pausa mientras la facturación está pausada |
| `cancelled` | Factura anulada antes del timbre (sin contacto SII, sin nota) |

Una factura anulada muestra su documento original más la nota `61` que la
anula; ambos cuentan en el libro mensual de ventas.

## Descargar el XML DTE

Abre cualquier documento y usa **Descargar XML**: obtienes los bytes exactos
que se timbraron y enviaron al SII (ISO-8859-1), incluido el timbre
electrónico (TED) y la autorización del SII (CAF). Entrégalo a tu contador
tal cual; no lo recodifiques.

```bash
curl "https://api.qbank.cl/platform/v1/me/billing/docs?page=1&page_size=50&status=accepted&from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z" \
  -H "Authorization: Bearer $CBPAY_TOKEN"
```

```bash
curl "https://api.qbank.cl/platform/v1/me/billing/docs/dte-7c9e2f1a" \
  -H "Authorization: Bearer $CBPAY_TOKEN"
```

> **Nota**
Solo ves los documentos facturados a tu propia cuenta: un ID ajeno devuelve
`404 not_found`, igual que uno inexistente. El desglose interno de precios
nunca se expone.
## Errores

| HTTP | Código | Causa y solución |
|---|---|---|
| 400 | `invalid_status` | Filtro de estado desconocido. Usa uno de la tabla. |
| 400 | `invalid_range` | Rango de fechas malo. Envía datetimes RFC3339. |
| 403 | `account_required` | Llama con una credencial de cuenta (sesión miembro o API key de cuenta). |
| 404 | `not_found` | El ID no existe o no es de tu cuenta. |

## Preguntas frecuentes

#### ¿Dónde están mis facturas de otros países?
    Esta sección cubre solo DTE chilenos. Las facturas de otros países
    aparecen en tu listado habitual de facturas.
#### ¿Puedo descargar el XML de un documento rechazado?
    Sí, cuando existe: el detalle incluye lo que se timbró. Un documento
    rechazado nunca se facturó, así que no hay nada que anular.
#### ¿Debo declarar algo ante el SII?
    No. CBPay declara el libro mensual de ventas por su cuenta; el XML es
    para tus propios registros contables.
#### ¿Por qué veo una nota de crédito (61)?
    Una factura tuya se anuló tras la aceptación del SII, así que la
    plataforma emitió una nota de crédito referenciando al original. Ambos
    documentos quedan visibles por trazabilidad.
