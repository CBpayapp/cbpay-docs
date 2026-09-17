---
title: "Preguntas frecuentes"
description: "Las dudas típicas al integrar, respondidas de una"
slug: es/faq
lang: es
source_url: https://docs.cbpayapp.com/es/faq
---
## Empezando

#### ¿Cuál es la URL base de la API?
Hay una por ambiente: **live** usa
`https://api.qbank.cl/platform` y **test** usa
`https://cryptobank.qbank.cl/platform`. Todos los endpoints de esta
documentación cuelgan de ellas (por ejemplo
`https://api.qbank.cl/platform/v1/balances`).
#### ¿Hay un ambiente sandbox de pruebas?
Sí. CBPay opera dos ambientes totalmente aislados: **test**
(`https://cryptobank.qbank.cl/platform`, keys `pk_test_...`, dinero
simulado) y **live** (`https://api.qbank.cl/platform`, keys `pk_...`,
dinero real). Integra primero contra test: todos los corredores los sirve
un simulador determinista con valores mágicos para forzar cada camino de
falla, y pasar a live es solo cambiar la URL base y la key. Guía completa
en [entorno y pruebas](https://docs.cbpayapp.com/es/entorno-y-pruebas).
#### ¿Cómo pongo saldo en mi cuenta para empezar?
Dos caminos: (1) **deposita USDT on-chain** — crea una wallet con
`POST /v1/crypto/wallets` y envía USDT a esa dirección (TRON o Ethereum);
(2) **cobra fiat** con un [payin](https://docs.cbpayapp.com/es/guias/payins) (QR, transferencia
anunciada, etc.). En ambos casos el saldo se acredita solo y te llega un
webhook.
#### ¿Necesito pasar KYC/KYB antes de operar?
Sí: toda cuenta debe aprobar su verificación de identidad (persona = KYC,
empresa = KYB) antes de mover dinero hacia afuera. Mientras tanto puedes
**fondear** (payins, depósitos crypto, transferencias entrantes) y leer;
las demás acciones responden `403 verification_required`. Pide tu link con
`POST /v1/me/verification/link` y completa el wizard —
[guía completa](https://docs.cbpayapp.com/es/guias/kyc). Si algo te responde `403 account_blocked`,
contacta al equipo de CBPay.
#### ¿Por qué una operación me responde 403 service_disabled?
Ese servicio no está habilitado para tu cuenta (los servicios se activan por
cuenta según tu acuerdo comercial). Consulta `GET /v1/services` para ver el
mapa completo de lo que tienes habilitado — úsalo también para decidir qué
mostrar en tu UI — y contacta al equipo de CBPay si necesitas activar algo.
Las lecturas y el dinero en tránsito nunca se bloquean.
#### ¿Qué credencial uso: sesión JWT o API key?
Para procesos servidor-a-servidor usa siempre una **API key** (`pk_…`, no
expira). Las sesiones JWT (24 h) son para front-ends con usuarios que
inician sesión. Ambas van en `Authorization: Bearer <token>` (o
`X-API-Key`).
#### ¿Qué idioma usará mi cuenta después de este deploy?
Las cuentas existentes quedan preconfiguradas `locale=es` (one-shot en el deploy, no es un endpoint).
Las cuentas nuevas nacen en inglés salvo body de registro, `Accept-Language` o `default_locale` de la org.
Cámbialo con `PATCH /v1/me` `{ "locale": "en" }`. Las respuestas JSON de la API siguen en inglés.
Ver [Idioma y locale](https://docs.cbpayapp.com/es/guias/idioma).
## Dinero y tasas

#### ¿En qué moneda está mi saldo?
Tu cuenta mantiene **seis saldos independientes**: USDT (la moneda
operativa, 6 decimales), USDC, BTC y GOLD. Las operaciones fiat (payouts
en CLP, cobros en BOB…) se convierten a/desde USDT con las tasas de tu
cuenta al momento de ejecutar (`rate` para payouts, `payin_rate` para
payins); también puedes liquidar payouts desde otro saldo
(`settlement_asset`) y quedarte con tus payins en el asset que elijas
(`default_payin_asset`). Ver
[modelo de dinero](https://docs.cbpayapp.com/es/conceptos/modelo-de-dinero).
#### ¿Cómo sé cuánto me va a costar un payout antes de crearlo?
Consulta `GET /v1/rates` (devuelve **tu** tasa por país) y calcula:

```
usdt_amount ≈ monto_local / tasa       (redondeo hacia arriba, 6 decimales)
total_debit = usdt_amount + fee fijo   (tus fees vienen en la misma respuesta)
```

El objeto payout devuelve los valores exactos (`fx_rate`, `usdt_amount`,
`fee`, `total_debit`) calculados por el servidor.
#### ¿La tasa que veo en /v1/rates está garantizada?
No es una cotización congelada: el payout usa la tasa vigente **al momento
de crearlo** y el payin la vigente **al momento del abono**, que pueden
variar levemente respecto a la que consultaste. La tasa aplicada queda
registrada en el campo `fx_rate` de cada operación para auditoría.
#### ¿Hay montos mínimos o máximos?
La API no impone mínimos técnicos; con montos muy chicos la comisión fija
puede superar el monto (recibirás `invalid_amount` o un débito
antieconómico). Los máximos dependen de tu configuración con CBPay.
#### ¿Qué comisiones me aplican y dónde las veo?
Las define CBPay para tu cuenta: por servicio (payout, payin, funding,
retiro, KYC, creación de wallet), por país y con componente % y/o fijo.
`GET /v1/rates` devuelve tu lista efectiva en el campo `fees` (y los
porcentajes de FX ya vienen dentro de la tasa cotizada). Detalle en
[comisiones](https://docs.cbpayapp.com/es/conceptos/comisiones).
## Payouts

#### ¿Cuánto tarda un payout en llegar?
Depende del corredor: varios son **síncronos o casi inmediatos** (Yape,
Pago Móvil, QR Bolivia) y otros procesan en minutos vía el rail bancario
local (SPEI, transferencias). Diseña tu integración alrededor del webhook
`payout_status_changed`: no asumas tiempos fijos ni hagas polling.
#### ¿Qué pasa exactamente si un payout falla?
Se reembolsa **el débito completo** (monto + comisión) a tu saldo
`available`, automáticamente, y te llega el webhook con `status: failed` y
un `status_code` explicando la causa. Corrige los datos y reintenta con
una `idempotency_key` **nueva**.
#### ¿Puedo reintentar sin riesgo de pagar dos veces?
Sí — ese es el propósito de la `idempotency_key`: si repites la misma
clave, recibes el payout original (`idempotency_hit: true`) sin crear ni
debitar nada nuevo. Usa una clave distinta solo cuando realmente quieras
crear otro pago. Ver [idempotencia](https://docs.cbpayapp.com/es/conceptos/idempotencia).
#### ¿Cómo sé qué campos lleva el beneficiary de cada país?
En los [ejemplos por país](https://docs.cbpayapp.com/es/guias/payouts#ejemplos-por-pais) hay una tabla de campos
y un ejemplo completo por país y método, y
`GET /v1/payouts/banks?country=XX` te da los códigos de banco vigentes
cuando aplican.
#### ¿Un QR escaneado se puede pagar dos veces?
No: cada `provider_reference` del scan admite un solo confirm. Reintentos
con la misma `idempotency_key` devuelven el payout original.
#### ¿Puedo cancelar o editar un payout en processing?
No. Cuando el payout está `processing` el rail bancario ya lo tiene; no
existe cancelación por API. Espera el estado final: si el rail lo rechaza,
el reembolso completo es automático. Verifica los datos del beneficiario
**antes** de crear (el `qr/scan` gratuito existe justamente para confirmar
el destinatario antes de pagar un QR).
#### ¿Hay montos mínimos, máximos o límites diarios?
La API no impone mínimos técnicos (con montos muy chicos la comisión fija
puede superar el monto). Los máximos y límites operacionales dependen de tu
acuerdo comercial y del corredor — si necesitas ampliar límites, contacta a
tu administrador CBPay indicando país, volumen esperado y ticket promedio.
## Payins y depósitos

#### ¿Cuándo se acredita mi saldo tras un cobro?
Cuando el proveedor confirma el pago: los QR y cobros activos suelen
acreditar en segundos; las transferencias bancarias cuando el depósito
llega y se matchea. Siempre recibes el webhook `payin_credited` con el
monto neto acreditado.
#### Mi cliente transfirió sin la referencia, ¿se perdió el dinero?
No. El depósito queda en estado `unassigned` y el equipo de CBPay lo
asigna manualmente a tu cuenta (al asignarse se acredita con tu tasa y
comisiones normales). Mientras tanto no aparece en tu saldo — si esperas
un depósito que no llega, avisa a tu administrador con el monto, moneda y
hora aproximada para acelerar la asignación. Para evitarlo, usa la
**cuenta CLABE dedicada** en México, la **página de pago** en Chile, o
insiste en que la referencia viaje en la descripción de la transferencia.
#### ¿Cuánto tarda en confirmarse un depósito crypto?
La detección es casi inmediata y el abono llega cuando la red confirma:
**TRON ~1 minuto** (19 confirmaciones), **Ethereum algunos minutos** según
congestión. El webhook `crypto_deposit_credited` cierra el ciclo con el
`tx_id` para que lo verifiques en el explorador.
#### ¿Cómo saco un estado de cuenta para mi contador?
Con la [cartola](https://docs.cbpayapp.com/es/guias/cartola): un endpoint que consolida todos los
movimientos del período (payouts, payins, crypto, transferencias y
comisiones) con cuadratura contable exacta. Pide `format=pdf` o
`format=xlsx` para descargar el documento con branding CBPay, o `json`
para mostrarla en tu web.
#### ¿El saldo de banking y mi saldo USDT son lo mismo?
No. El dinero de [banking](https://docs.cbpayapp.com/es/guias/banking) vive en **tus cuentas
bancarias reales** (USD u otras monedas habilitadas) y se consulta con
`GET /v1/banking/accounts/{id}/balance`. Tu saldo CBPay es USDT y solo se
toca para cobrar las comisiones fijas de banking (que se reembolsan si la
operación falla).
#### ¿Un depósito crypto y un payin son lo mismo?
No: un **payin** es un cobro fiat (moneda local → USDT); un **depósito
crypto** es USDT on-chain que llega a tu wallet (`funding`). Ambos terminan
en el mismo saldo USDT, con webhooks distintos (`payin_credited` vs
`crypto_deposit_credited`).
## Webhooks y errores

#### ¿Los webhooks son obligatorios?
No, pero sí muy recomendados: los estados finales llegan por webhook sin
que hagas polling. De todas formas puedes consultar cualquier objeto por
API (`GET /v1/payouts/{id}`, `GET /v1/payins/{id}`…) en cualquier momento.
#### ¿Cómo pruebo webhooks desde mi máquina (localhost)?
Las URLs locales se rechazan por seguridad. Usa un túnel HTTPS gratuito
(Cloudflare Tunnel o ngrok) y suscribe esa URL pública — receta paso a
paso en [ambiente y pruebas](https://docs.cbpayapp.com/es/entorno-y-pruebas).
#### ¿Cuál es la diferencia entre GET /v1/movements y la cartola?
Leen el mismo ledger: `movements` es la vista programática paginada (para
conciliación automática y tu UI); la cartola es el snapshot del período con
totales, desgloses y cuadratura garantizada (para cierres contables).
Nunca discrepan. Detalle en
[movimientos y conciliación](https://docs.cbpayapp.com/es/conceptos/movimientos-y-conciliacion).
#### ¿Por qué recibí el mismo webhook dos veces?
Las entregas son **at-least-once**: ante timeouts se reintenta (hasta 5
veces). Deduplica con el header `X-Webhook-Event-ID`, que es único por
evento.
#### ¿Qué hago con un error 5xx o core_unavailable?
Es transitorio: reintenta con backoff usando la **misma**
`idempotency_key` (así nunca duplicas). Si el problema persiste, contacta
al equipo de CBPay con el `payout_id`/`payin_id` y la hora.
