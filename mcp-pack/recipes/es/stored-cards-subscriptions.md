---
recipe: stored-cards-subscriptions
title: "Tarjetas guardadas y suscripciones"
slug: es/guias/stored-cards-subscriptions
lang: es
source_url: https://docs.cbpayapp.com/es/guias/stored-cards-subscriptions
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

> **Importante**
La cuenta debe tener identidad aprobada antes de crear el payin `card` semilla,
cobrar una tarjeta guardada mediante
`POST /v1/stored-cards/{storedCardID}/charges` o crear una suscripción. Las
cuentas persona requieren KYC aprobado y las cuentas empresa KYB aprobado. Sin
aprobación, la request autenticada responde HTTP `403 verification_required`.
> **Nota**
Este gate de cuenta no bloquea la página pública de pago ni invalida un link
de pago que ya se había creado.
El método `card` soporta **credencial almacenada** (mandato COF de las
marcas): tu pagador guarda su tarjeta con consentimiento explícito en el
primer pago y después puedes ofrecerle pagar sin re-digitar el número — o
cobrarle tú suscripciones y cargos no programados sin que esté presente.
El número de tarjeta **jamás existe** en tu integración ni en la
plataforma: solo se guarda una referencia opaca del procesador más los
datos de display (marca, últimos 4 dígitos, expiración).

**COF acotado a la cuenta.** Una credencial guardada pertenece a la cuenta
CBPay que la creó. `payer_reference` es una referencia de cliente local de
esa cuenta, no una identidad global: el mismo correo o referencia en otra
cuenta no puede descubrir, listar ni cobrar esta credencial. Usar un
`stored_card_id` de otra cuenta responde el mismo `404 not_found` genérico
que cualquier credencial desconocida.

### Semilla: ofrece guardar la tarjeta en el primer pago

Crea el payin `card` con `save_card: true` y tu referencia del pagador:

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BO",
    "currency": "BOB",
    "method": "card",
    "amount": "700.00",
    "save_card": true,
    "payer_reference": "cliente-1042",
    "idempotency_key": "recarga-7720"
  }'
```

La página hosted muestra el checkbox **"Guardar esta tarjeta para futuros
pagos"**. La credencial se crea SOLO si el pagador lo marca y el pago
3-D Secure se aprueba. Al acreditarse recibes el webhook `card_stored` y
la tarjeta aparece en tu listado.
### Lista las tarjetas del pagador

```bash
curl "https://api.qbank.cl/platform/v1/stored-cards?from=2026-07-01&to=2026-07-20&payer_reference=cliente-1042" \
  -H "Authorization: Bearer <token>"
```

```json
{
  "page": 1,
  "page_size": 50,
  "stored_cards": [{
    "stored_card_id": "5f0f2c9e-…",
    "payer_reference": "cliente-1042",
    "country": "BO",
    "currency": "BOB",
    "brand": "visa",
    "last4": "2701",
    "expiry_month": "12",
    "expiry_year": "2028",
    "status": "active",
    "created_at": "2026-07-20T18:00:00Z"
  }]
}
```
### Pago con tarjeta guardada (el pagador presente)

Crea el payin `card` con `stored_card_id`: la página salta la captura del
número, muestra la tarjeta guardada (`VISA •••• 2701`) y el 3-D Secure
corre igual — el pagador solo confirma con su banco. Los **datos de
facturación** que el pagador ingresó al guardar la tarjeta también quedan
en archivo: la página los aplica sola y muestra solo un resumen enmascarado
(nombre, correo parcial y ciudad) con un enlace "usar otros datos" por si
quiere cambiarlos — no se re-tipea nada. Este camino server-to-server no
pide verificación adicional: tú ya conoces a tu cliente.

¿No sabes qué tarjeta tiene guardada (o si tiene)? No pases
`stored_card_id`: la página de pago le ofrece al pagador descubrir sus
tarjetas verificando su correo con un código — ver
[el pagador descubre sus tarjetas](#el-pagador-descubre-sus-tarjetas-en-la-página-de-pago).

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BO",
    "currency": "BOB",
    "method": "card",
    "amount": "350.00",
    "stored_card_id": "5f0f2c9e-…",
    "idempotency_key": "recarga-7721"
  }'
```
### Cobro recurrente / no programado (sin el pagador)

Cobra la tarjeta directamente — suscripciones (`recurring: true`) o cargos
no programados acordados con tu cliente:

```bash
curl -X POST https://api.qbank.cl/platform/v1/stored-cards/5f0f2c9e-…/charges \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "45.00",
    "description": "Suscripción mensual",
    "recurring": true,
    "idempotency_key": "sub-2026-07-cliente1042"
  }'
```

Respuesta `201` — el cobro aprobado acredita tu saldo automáticamente
(webhook `payin_credited`, mismo camino que cualquier payin de tarjeta):

```json
{
  "payin_id": "3c5b002c-…",
  "status": "pending",
  "reference": "3c5b002c-…",
  "transaction_id": "7846012604…",
  "note": "charge approved; the balance is credited automatically (payin_credited webhook)"
}
```

Un cobro declinado por el emisor responde `422` con el payin en `failed` y
`failure_reason`. Un retry con la misma `idempotency_key` devuelve el payin
original y **jamás cobra dos veces**.

Si la llamada al proveedor o la persistencia local queda ambigua, la
plataforma conserva el payin en `pending`/revisión y responde con un estado
de reconciliación. Es fail-closed: reintenta con la **misma**
`idempotency_key` para recuperar el claim existente; jamás generes una clave
nueva ni envíes un segundo cobro MIT.

### Dirección de facturación en archivo (requerida para capturar)

Todo cobro MIT necesita una **dirección de facturación completa** del
tarjetahabiente — el procesador la exige para capturar el cobro. La
plataforma la toma automáticamente de los datos de facturación que el
pagador ingresó al guardar la tarjeta (nombre, correo, dirección, ciudad,
código postal, país y **estado/región** cuando el país lo exige — ver
[estado/región de facturación por país](https://docs.cbpayapp.com/es/guias/payins#dirección-de-facturación-estadoregión-requerido-según-el-país)),
así que **no envías nada extra** en el request.

- **Tarjetas guardadas con billing completo** — operan sin cambios.
- **Tarjetas legacy sin billing completo** — el cobro se rechaza con
  `422 core_rejected` (dirección de facturación incompleta) **sin mover
  plata**. Pide al pagador guardar la tarjeta de nuevo con
  `save_card: true` (la página de pago captura la dirección completa,
  incluido el estado/región).
Para revocar una tarjeta guardada (a pedido del pagador o por sospecha):
`DELETE /v1/stored-cards/{stored_card_id}` — los cobros dejan de funcionar
al instante y recibes `stored_card_revoked` (`422 stored_card_revoked` si
intentas cobrarla después).

> **Importante**
Los cobros sin el pagador presente viajan **sin 3-D Secure** por definición
del mandato: el riesgo de contracargo es tuyo. Cobra solo lo acordado
explícitamente con tu cliente — la plataforma persiste la evidencia del
consentimiento de la semilla (checkbox, IP y timestamp) para disputas.
## El pagador descubre sus tarjetas en la página de pago

Toda página de pago con tarjeta — la `payment_url` de un payin `card` y la
opción tarjeta del checkout universal — pide el **correo del pagador como
primer campo**. Si ese correo tiene tarjetas guardadas contigo, la página
le envía un **código de verificación** (con la marca de tu organización) y
solo cuando lo ingresa correctamente le revela sus tarjetas: marca,
últimos 4 dígitos y vencimiento, jamás el número completo. Al elegir una,
paga con 3-D Secure sin re-digitarla; también puede elegir "usar otra
tarjeta" y pagar con una nueva.

### El pagador escribe su correo

Si ya lo enviaste en `customer.email` (o un `payer_reference` con correo),
la página lo muestra pre-llenado. Si el correo no tiene tarjetas guardadas,
el formulario de tarjeta nueva sigue su curso — no se revela nada.
### Lo verifica con el código (una vez por dispositivo)

Con tarjetas encontradas, la página envía un código al correo y pide
ingresarlo. El checkbox **"Recordar este dispositivo"** (marcado por
defecto) deja el dispositivo confiable por **30 días**: los pagos
siguientes con ese correo en ese navegador muestran las tarjetas sin pedir
código.
### Elige la tarjeta y paga

Con el correo verificado, el pagador ve sus tarjetas enmascaradas, elige
una y completa solo el 3-D Secure. El correo **verificado** queda como la
identidad del pagador del cobro — gana sobre cualquier correo declarado en
el formulario.
> **Nota**
La confianza es por dispositivo y dura 30 días; cada pagador puede tener
hasta 10 dispositivos recordados (al superar el tope se olvida el más
antiguo). Si un pagador pierde un dispositivo, soporte puede revocar sus
dispositivos recordados y volverá a recibir el código en su próximo pago.
## Suscripciones (cobros recurrentes agendados)

Si en vez de cobrar tú manualmente cada mes quieres que **la plataforma
lleve el calendario**, crea una suscripción sobre la tarjeta guardada: el
primer período se cobra al crearla (salvo `start_at` futuro) y los
siguientes se disparan solos según el `interval`.

```bash
curl -X POST https://api.qbank.cl/platform/v1/subscriptions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stored_card_id": "5f0f2c9e-…",
    "amount": "45.00",
    "interval": "monthly",
    "description": "Plan mensual",
    "idempotency_key": "plan-cliente1042-mensual"
  }'
```

Respuesta `201` (el `first_charge` aparece cuando se cobró el primer
período al crear):

```json
{
  "subscription_id": "7a1c9e2d-…",
  "stored_card_id": "5f0f2c9e-…",
  "amount": "45.00",
  "currency": "BOB",
  "interval": "monthly",
  "status": "active",
  "period": 1,
  "next_charge_at": "2026-08-20T18:00:00Z",
  "first_charge": { "outcome": "approved", "payin_id": "3c5b002c-…" }
}
```

- `interval`: `daily`, `weekly`, `monthly` o `yearly`. El día del mes se
  conserva y se ajusta al último día en meses cortos (un plan del 31 cobra
  el 28/29 de febrero y vuelve al 31 en marzo).
- `start_at` (opcional, RFC3339 futuro): difiere el primer cobro (trial /
  fecha de inicio); sin él, cobra al crear.
- **Dunning**: si el emisor declina, la plataforma reintenta cada 24 h
  hasta 3 veces; agotados, la suscripción pasa a `past_due` y recibes el
  webhook `subscription_status_changed`. `resume` la reactiva con un
  intento fresco.
- Cada cobro exitoso acredita tu saldo como cualquier payin de tarjeta
  (webhook `payin_credited`, con `subscription_id` para enlazarlo al plan).

Gestión del ciclo de vida:

```bash
# Pausar (deja de cobrar; reanudar NO recupera períodos perdidos)
curl -X POST https://api.qbank.cl/platform/v1/subscriptions/7a1c9e2d-…/pause -H "Authorization: Bearer <token>"
# Reanudar
curl -X POST https://api.qbank.cl/platform/v1/subscriptions/7a1c9e2d-…/resume -H "Authorization: Bearer <token>"
# Cancelar (terminal)
curl -X POST https://api.qbank.cl/platform/v1/subscriptions/7a1c9e2d-…/cancel -H "Authorization: Bearer <token>"
# Listar / consultar
curl "https://api.qbank.cl/platform/v1/subscriptions?from=2026-07-01&to=2026-07-31&status=active" -H "Authorization: Bearer <token>"
```

Revocar la tarjeta guardada (`DELETE /v1/stored-cards/{id}`) cancela
automáticamente sus suscripciones (`cancel_reason: card_revoked`).
## Estados de la suscripción

| Estado | Significado | Qué hacer |
|---|---|---|
| `active` | Cobra cada período en `next_charge_at` | Nada — el scheduler la ejecuta |
| `paused` | Congelada; los períodos perdidos **no** se cobran retroactivamente | `POST .../resume` cuando quieras |
| `past_due` | Fallaron los 3 reintentos de dunning (cada 24 h) | Corrige la tarjeta/saldo y haz `resume` para reactivar |
| `canceled` | Terminal — por `cancel` o porque la tarjeta guardada se revocó | Crea una suscripción nueva si la necesitas |

## Errores

| HTTP | Código | Qué hacer |
|---|---|---|
| 400 | `idempotency_key_required` | Envía `idempotency_key` (body o header `Idempotency-Key`) |
| 400 | `invalid_amount` | `amount` debe ser un decimal positivo en string |
| 400 | `invalid_interval` | Usa `daily`, `weekly`, `monthly` o `yearly` |
| 400 | `invalid_request` | La moneda debe calzar con el corredor de la tarjeta guardada |
| 404 | `not_found` | La tarjeta guardada / suscripción no existe o no es tuya |
| 409 | `idempotency_conflict` | Misma clave con payload distinto — usa una clave nueva |
| 409 | `subscription_state` | El estado actual no permite esa acción (ej. reanudar un plan cancelado) |
| 422 | `stored_card_revoked` | La credencial de la tarjeta se revocó; pide al pagador guardarla de nuevo |
| 422 | `core_rejected` | El riel rechazó el cobro — el mensaje trae el motivo. Cuando reporta una **dirección de facturación incompleta** (o estado/región faltante), la tarjeta guardada no tiene una dirección utilizable en archivo: pide al pagador guardarla de nuevo con `save_card: true` |

El catálogo general de errores vive en [Errores](https://docs.cbpayapp.com/es/errores).

## FAQ

#### ¿Almacenan el número de tarjeta (PAN)?
Jamás. Guardar una tarjeta almacena un token de red opaco — el PAN nunca
toca la plataforma. Revocar la credencial invalida el token.
#### ¿Por qué los cobros recurrentes no piden 3-D Secure?
Las transacciones iniciadas por el comercio (MIT) corren sin 3DS por
mandato de las marcas: el pagador se autenticó con 3DS en el pago inicial
consentido, y cada MIT referencia esa transacción.
#### ¿Qué pasa con las suscripciones si la tarjeta se revoca?
Se cancelan automáticamente (`card_revoked`). El pagador debe guardar la
tarjeta de nuevo y tú creas una suscripción nueva.
#### ¿Pausar acumula cobros?
No — no hay catch-up: los períodos transcurridos en pausa avanzan el
contador sin cobrarse. Al reanudar se cobra solo desde el siguiente
período.
#### ¿Cómo funciona el dunning cuando un cobro declina?
El scheduler reintenta hasta 3 veces, cada 24 h. Si todas fallan el plan
pasa a `past_due` y recibes `subscription_status_changed` — no hay más
cobros hasta que hagas `resume`.
#### ¿Cuándo se cobra el primer período?
Síncrono en la creación, salvo que pases un `start_at` futuro (trial): ahí
el primer cobro espera esa fecha.
#### ¿Por qué la página de pago pide un código al correo del pagador?
Para mostrarle sus tarjetas guardadas sin que cualquiera que sepa su correo
pueda verlas: la lista solo se revela tras verificar el correo con el
código (o en un dispositivo ya recordado). Si el correo no tiene tarjetas,
la página sigue directo al formulario de tarjeta nueva.
#### ¿El pagador debe verificar su correo en cada pago?
No: con "Recordar este dispositivo" (marcado por defecto) el navegador
queda confiable por 30 días y los pagos siguientes con ese correo muestran
las tarjetas sin código. Pasado el plazo — o en otro dispositivo — se
verifica de nuevo.
