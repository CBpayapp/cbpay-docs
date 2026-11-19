---
title: "Errores y FAQ de payouts"
description: "Errores de payouts, rechazos y solución de problemas"
slug: es/guides/payout-errors
lang: es
source_url: https://docs.cbpayapp.com/es/guides/payout-errors
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

> **Importante**
**Cambio incompatible — 2026-11-13.** Los saldos BOB, MXN, ARS y CLP, junto con los espejos `BANK_*`, viven solo en Banking. Los payouts, swaps, transferencias internas, tarjetas, checkout, POS y comisiones de la plataforma rechazan la liquidación fiat con HTTP `400`. Las cuentas legacy conservan su default explícito `USDT`; las cuentas nuevas usan `USD` como saldo principal. Usa Banking para las operaciones fiat.
## Errores frecuentes

| HTTP | `error` | Qué hacer |
|---|---|---|
| 400 | `idempotency_key_required` | Envía la clave en body o header |
| 400 | `beneficiary_required` | Incluye el objeto `beneficiary` |
| 400 | `supporting_document_required` | La transferencia USD por rail bancario exige el documento de respaldo — súbelo con `POST /v1/payouts/documents` y pásalo en `options.supporting_document_key` |
| 400 | `invalid_document_key` | La `supporting_document_key` no pertenece a tu cuenta — sube el documento con tu propia sesión |
| 402 | `insufficient_funds` | Fondea la cuenta; el payout no se creó |
| 403 | `account_blocked` | La cuenta no está activa; contacta al equipo de CBPay |
| 403 | `service_disabled` | Payouts no está habilitado para tu cuenta — ver [servicios](https://docs.cbpayapp.com/es/concepts/services) |
| 403 | `compliance_hold` | El payout quedó retenido para revisión y NO fue procesado (no se movieron fondos). El mensaje de la API es `this operation was held for review and was not processed; no funds were moved; contact support with the request reference (X-Request-ID)`. Copia la línea de referencia del portal (hora UTC, código del error y request corto) al contactar a soporte; ver [errores](https://docs.cbpayapp.com/es/errors) |
| 422 | `currency_not_supported` | No hay tasa FX para esa moneda |
| 422 | (payout con `status: failed`) | El corredor rechazó los datos; el débito ya fue reembolsado — corrige `beneficiary` y reintenta con clave nueva |
| 503 | `channel_unavailable` | El canal de pago está temporalmente no disponible. Puede ser una condición temporal de tesorería o del canal, no un error de los datos del beneficiario. Repite un 503 directo más tarde con la MISMA `idempotency_key`; si el payout queda `in_review`, sigue el resultado de la revisión |
| 503 | `compliance_check_unavailable` | No se pudo evaluar compliance ni dejar el payout en la cola técnica de screening; reintenta con la **misma** idempotency key. Si la cola está disponible, el create devuelve `202` con `status: pending` |

## Rechazo inmediato vs fallo posterior

Si el procesador rechaza el payout al crearlo por una razón de negocio
corregible, recibes `422` con el objeto en `status: failed` y el reembolso ya
aplicado. Corrige los datos del beneficiario o de la solicitud y crea un payout
nuevo con una clave nueva. Una falta temporal de fondos del canal o de
tesorería es distinta: la plataforma puede dejar el payout en `in_review` en
vez de fallarlo de inmediato, así que no crees otro payout hasta conocer el
resultado de la revisión.

Cuando un payout está `in_review`, el mensaje visible para la cuenta es
intencionalmente genérico: está en revisión y se completará solo cuando se
libere. No corrijas datos del beneficiario por este estado. Si se aprueba la
revisión pero la clave de despacho original ya se consumió, la aprobación
responde `reissue_required`; solo entonces crea un payout nuevo con una
**nueva** `idempotency_key`. CBPay nunca vuelve a emitir la operación por su
cuenta.

### Cómo leer `status_code` en un payout fallido

| `status_code` | Significado | Acción |
|---|---|---|
| `core_rejected` | El procesador rechazó la operación al crearla (datos del beneficiario inválidos, corredor no disponible) | Lee `status_message`, corrige y crea un payout nuevo con clave nueva |
| `counterparty_rejected` | El riel bancario rechazó al beneficiario mismo (corredor US/USD) | Revisa la identidad y dirección del beneficiario con el titular y crea un payout nuevo con clave nueva |
| `channel_unavailable` | El canal de pago quedó temporalmente no disponible | En un 503 directo, repite con la misma clave. Si el payout está `in_review`, espera la revisión; si la aprobación responde `reissue_required`, crea un payout nuevo con una clave nueva |
| *otro código* | Rechazo posterior del riel bancario (p. ej. cuenta destino cerrada) | Igual: corrige los datos y crea una operación nueva |
| *(vacío)* | Fallo genérico del corredor | Revisa `status_message`; si no es claro, contacta soporte con el `payout_id` |

En un payout fallido terminal, el mensaje para la cuenta indica que no se pudo
completar y que los fondos fueron devueltos. Verifica el reembolso con la
entrada `payout_refund` en
[movimientos](https://docs.cbpayapp.com/es/concepts/movements-reconciliation). Un payout que sigue
`in_review` no es terminal: espera el resultado de la revisión en vez de
asumir que hubo reembolso o un nuevo despacho.

> **Nota**
Un payout en `processing` no se puede cancelar por API: el canal ya lo tiene.
Un payout en `in_review` tampoco es un flujo de cancelación del cliente:
espera el resultado de la revisión. En ambos estados, espera el estado final
por webhook o `GET`. Un fallo terminal devuelve los fondos; una aprobación
que informa `reissue_required` exige que el cliente cree una operación nueva
con una clave nueva.
## FAQ

#### ¿Cuándo se debita mi saldo?
Al crear: el payout debita y retiene los fondos de inmediato. Si el payout
falla, el monto exacto debitado (comisión incluida) se reembolsa
automáticamente.
#### ¿Puedo cancelar un payout en processing?
No — una vez despachado al riel se resuelve solo a `completed` o `failed`.
Suscríbete a `payout_status_changed` para el estado final.
#### ¿Qué tasa FX usa mi payout?
La tasa cotizada al crear (devuelta como `fx_rate`), congelada para esa
operación. Tu spread acordado ya viene dentro de la tasa.
#### ¿Puedo pagar desde un saldo distinto de USDT?
Sí — fija un default por cuenta (`PUT /v1/settlement`) o sobreescribe por
payout con `settlement_asset` (USDC, BTC, GOLD). Los reembolsos devuelven
el monto liquidado exacto, jamás se re-cotizan.
#### ¿Qué significa `status: pending` con `compliance_pending: true`?
El screening del beneficiario no está disponible temporalmente, pero CBPay
persistió el payout en su cola técnica de screening. No se debitó saldo, no
existe hold ni asiento en el ledger, no se llamó al core y todavía no hay
`receipt_url`. El replay con la misma idempotency key devuelve el mismo recurso.
Espera el evento `payout_status_changed` o consulta el payout: continuará con
`process`, entrará al firewall con un `hold` válido o terminará `failed` sin
débito si el resultado es `rejected`.
#### ¿Qué significa compliance_hold (403)?
El payout quedó retenido para revisión y **no** fue procesado: no se movieron fondos y tu `idempotency_key` no se consumió. El portal muestra una línea de
referencia copiable con hora UTC, código del error y request corto. Inclúyela
al contactar a soporte; la razón exacta de compliance no se informa.
#### ¿Qué significa `status: in_review` en un payout?
El payout está en revisión y el mensaje visible para la cuenta es genérico: se
completará solo cuando se libere. Este estado puede proteger un payout cuando
el canal o su tesorería no están disponibles temporalmente. No cambies el
beneficiario ni crees un segundo payout mientras está en revisión. Si la
aprobación responde `reissue_required`, crea un payout nuevo con una clave de
idempotencia nueva; CBPay nunca lo vuelve a emitir automáticamente.
#### ¿Por qué un payout respondió 503 sin un error del beneficiario?
Algunas condiciones temporales del canal no son causadas por los datos del
beneficiario. Repite el 503 directo con la misma clave de idempotencia. Si el
payout quedó `in_review`, espera el resultado de la revisión; solo un
`reissue_required` explícito autoriza un payout nuevo con una clave nueva.
#### ¿Cómo reintento sin riesgo tras un timeout o 5xx?
Reintenta con la **misma** `idempotency_key`: recibes el payout original
(`idempotency_hit: true`) — jamás un duplicado. Una clave nueva es un
payout nuevo e independiente.
#### Por qué mi payout US ACH/wire/SWIFT sigue processing?
Los payouts del riel bancario US los paga el operador a mano. El create
ya trae el CBF en `bank_reference` y queda `processing` hasta que el banco
confirma. Estimaciones: ACH 24 a 48 horas hábiles, wire/Fedwire mismo día hábil (hasta 24 horas), SWIFT 24 a 48 horas hábiles (posiblemente más según el banco receptor). Escucha `payout_status_changed`; un fallo reembolsa el débito.
Para errores de payouts y la secuencia de reintento `422 destination_recently_rejected`,
consulta [Errores](../errors) y [Protección ante rechazo del destino](payout-destination-retries).

## Propósito y validación de pagos US/USD

En payouts bancarios `US`/`USD` (`ach`, `wire` y `swift`),
`options.purpose` es obligatorio. La API acepta la etiqueta visible o su
código, sin distinguir mayúsculas. El catálogo aceptado es:

| Etiqueta visible | Código aceptado |
|---|---|
| Asset Purchase | `Asset_Purchase` |
| Contract Payment | `Contract_Payment` |
| Dividends | `Dividends` |
| Education Payment | `Education_Payment` |
| Gift/Donation | `Gift_Donation` |
| Investment Purchase | `Investment_Purchase` |
| Invoice Payment | `Invoice_Payment` |
| Loan Payments | `Loan_Payments` |
| Materials Purchase | `Materials_Purchase` |
| Mortgage Payments | `Mortgage_Payments` |
| Payroll | `Payroll` |
| Personal/Family Payment | `Personal_Family_Payment` |
| Professional Service Payments | `Professional_Service_Payments` |
| Reimbursements | `Reimbursements` |
| Remittance | `Remittance` |
| Rent/Utility Payments | `Rent_Utility_Payments` |
| Savings | `Savings` |
| Settlement (Trade) | `Settlement_Trade` |
| Tax Payments | `Tax_Payments` |
| Treasury Movement | `Treasury_Movement` |
| Other (describe below) | `Other` |

`options.purpose_detail` es obligatorio solo cuando `purpose` es `Other` y
acepta hasta 140 caracteres. Se rechaza con cualquier otro propósito. Crear
sin `purpose` ahora responde `400 purpose_required`: es un cambio incompatible
para clientes que dependían del antiguo default `Invoice_Payment`.

`beneficiary.account_type` es obligatorio tanto para `ach` como para `wire` y
debe ser `checking` o `savings` (sin distinguir mayúsculas). `swift` no usa
este campo. Para `wire` y `swift`, montos menores a USD 25 responden
`422 amount_below_minimum`. Países del beneficiario o banco del Anexo B
(`CU`, `IR`, `KP`, `SY`) responden `422 prohibited_country`. Estas validaciones
ocurren antes de debitar.

Los errores normalizados son `invalid_beneficiary`, `invalid_amount`,
`amount_below_minimum`, `prohibited_country`, `purpose_required`,
`invalid_options` y `supporting_document_required`. Revisa `message` para
corregir el campo exacto. No repitas una solicitud rechazada sin cambios; ante
timeout o 5xx, reutiliza la misma clave de idempotencia.
