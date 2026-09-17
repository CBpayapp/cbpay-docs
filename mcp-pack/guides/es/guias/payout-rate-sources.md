---
title: "Orígenes de tasa de payouts y cotizaciones FIFO"
description: "Entiende el pricing lot, blend y spot y consulta una cotización FIFO indicativa"
slug: es/guias/payout-rate-sources
lang: es
source_url: https://docs.cbpayapp.com/es/guias/payout-rate-sources
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

## Origen de tasa y cotización FIFO indicativa

Las respuestas de payout pueden incluir `rate_source` para explicar de dónde
salió la tasa de mercado ejecutada:

| Valor | Significado |
|---|---|
| `lot` | El monto local fue cubierto completamente por el inventario fiat FIFO de la organización. |
| `blend` | El inventario FIFO cubrió una parte y el resto usó spot. |
| `spot` | No se usó inventario FIFO elegible. |

El campo está disponible en la creación y el detalle cuando se carga la
atribución. Puede faltar en filas históricas o de listado. No cambia el débito,
la comisión ni el contrato del webhook.

### Cotización de payout vigente en `GET /v1/rates`

La respuesta de tasas para la cuenta mantiene el nombre `rate` para la punta
de payout. Es la cotización de mercado ejecutable para el próximo payout: la
plataforma revisa el lote FIFO abierto más antiguo de la moneda del país.
Cuando existe inventario elegible, `rate_source` es `lot`; si no, usa spot y
`rate_source` es `spot`. Si falla la lectura del inventario, también cae a
`spot`; el débito del payout sigue siendo fail-closed.

`payin_rate` sigue siendo la cotización de depósitos basada en spot. Los lotes
FIFO solo valorizan payouts. El endpoint para administradores de organización
expone la misma distinción con `payout_rate` y `rate_source`.

```json
{
  "rates": {
    "chile": {
      "currency": "CLP",
      "rate": "910.896551",
      "rate_source": "lot",
      "payin_rate": "955.10"
    }
  }
}
```

Este valor por país es una vista indicativa del próximo payout. Un payout más
grande puede consumir varios lotes; usa el `lot_quote` opt-in para una
cotización indicativa por monto y conserva la respuesta del payout junto con
el webhook final como registro autoritativo de la ejecución.

Para previsualizar una cotización indicativa que considere inventario, agrega
`currency` y `amount` a `GET /v1/rates`:

```bash
curl "https://api.qbank.cl/platform/v1/rates?currency=CLP&amount=100000.00"   -H "Authorization: Bearer <token>"
```

La respuesta normal de tasas puede traer:

```json
{
  "lot_quote": {
    "currency": "CLP",
    "amount": "100000.00000000",
    "market_rate": "13.42150000",
    "rate_source": "blend",
    "marked_rate": "13.28728500",
    "indicative": true
  }
}
```

`lot_quote` es de solo lectura e indicativo. La ejecución bloquea el inventario
dentro de la transacción del débito, por lo que un payout concurrente puede
cambiar el resultado. `marked_rate` es opcional. Los errores de validación son
valores dentro de la respuesta `200`: `invalid_amount`,
`currency_not_supported` o `quote_unavailable`.

La cotización no garantiza el precio futuro. La respuesta del payout y el
evento final `payout_status_changed` son la fuente autoritativa.

### Estados de la cotización

| Estado | Significado | Siguiente acción |
|---|---|---|
| `indicative` | La cotización se calculó sin locks de ejecución. | Crea el payout con la misma clave y lee su `rate_source` ejecutado. |
| `executed` | La respuesta del payout contiene la atribución autoritativa. | Guarda la respuesta y el webhook final para conciliar. |
| `error` | La respuesta contiene `invalid_amount`, `currency_not_supported` o `quote_unavailable`. | Corrige los datos o repite la cotización de solo lectura; no crees un payout desde el error. |

### Llave de tasa EUR para SEPA

El único corredor de enrutamiento Europa (`EU`)/EUR/`sepa` comparte
una sola llave de tasa: `sepa`, con `currency: "EUR"`. El catálogo de payouts
devuelve `country: "EU"` para esta fila, mientras el país real del beneficiario
sale del IBAN. El fee de payout y el spread FX resuelven sobre la fila de
pricing `EU`. `rate_source` sigue describiendo la cotización ejecutable
(`lot` o `spot`) y `payin_rate` sigue siendo spot del lado de depósitos.

#### Does this quote reserve inventory?
  No. It is read-only and indicative. The payout debit transaction locks and
  consumes inventory atomically.
#### What should I store for reconciliation?
  Store the payout response and its final `payout_status_changed` event. Use
  `rate_source` as the execution provenance; do not treat `lot_quote` as a
  guarantee.
