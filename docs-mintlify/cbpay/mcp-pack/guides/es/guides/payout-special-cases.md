---
title: "Casos especiales de payouts"
description: "Corredores especiales, documentos y flujos QR de payouts"
slug: es/guides/payout-special-cases
lang: es
source_url: https://docs.cbpayapp.com/es/guides/payout-special-cases
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

## SEPA Instant en EUR

Consulta la [guía dedicada de payouts SEPA Instant](https://docs.cbpayapp.com/es/guides/sepa-instant-payouts)
para la única fila de enrutamiento Europa (`EU`)/EUR/`sepa`; el país real del
beneficiario sale del IBAN. Los IBAN GB fallan rápido con HTTP 400 antes del
despacho; SEPA Credit Transfer para GB es alcance futuro.

## Documento de respaldo obligatorio en transferencias USD

TODA transferencia saliente en **USD** por rail bancario (`ach`, `wire` o
`swift`) exige un **documento de respaldo** (factura o recibo) adjunto —
es un requisito del banco procesador y aplica a **cualquier corredor USD**,
no solo al de EE. UU. (por ejemplo, también a un SWIFT internacional como
`PY/USD/swift`).

### Sube el documento

Envía el archivo con `POST /v1/payouts/documents`: binario crudo un PDF (`application/pdf`, hasta 50 MB) y el nombre en el query
param `name`. La interfaz actual de payouts US/USD acepta solo PDF.

```bash
curl -X POST "https://api.qbank.cl/platform/v1/payouts/documents?name=factura-2210.pdf" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/pdf" \
  --data-binary "@factura-2210.pdf"
```

```json
{
  "document_key": "payout-docs/9f1c…/org/…/3c2e…"
}
```
### Pásalo al crear el payout

El `document_key` viaja en `options.supporting_document_key`. En
`ach`/`wire` puedes agregar `options.document_reference_number` (número
de factura o referencia del documento) — se envía al banco.

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "ach",
    "amount": "250.00",
    "beneficiary": { "…": "…" },
    "options": {
      "supporting_document_key": "payout-docs/9f1c…/org/…/3c2e…",
      "document_reference_number": "INV-2210"
    },
    "idempotency_key": "us-ach-2210"
  }'
```
- Un payout USD por rail bancario creado **sin el documento** se rechaza
  al crear con `400 supporting_document_required` (sin débito).
- Una key subida por **otra cuenta** se rechaza con
  `400 invalid_document_key`.
- La `document_key` queda almacenada: si el create falla por otra causa,
  la reutilizas en el reintento — **no necesitas re-subir el archivo**.
## Payout QR

Pagar un QR de cobro (Bolivia, PIX de Brasil) ahora tiene su propia guía:

- **Payout QR** - Escanea el QR gratis, muestra a tu usuario los datos del destinatario y confirma el pago en una segunda llamada — se cobra como un payout normal.
