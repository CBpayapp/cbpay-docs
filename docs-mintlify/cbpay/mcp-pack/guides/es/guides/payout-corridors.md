---
title: "Corredores de payouts"
description: "Requisitos de payouts por país y corredor"
slug: es/guides/payout-corridors
lang: es
source_url: https://docs.cbpayapp.com/es/guides/payout-corridors
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

## Ejemplos por país

Cada corredor con su `beneficiary` exacto, el request completo y la
respuesta real. Las tasas (`fx_rate`) son ilustrativas — siempre aplican
las de tu cuenta en `GET /v1/rates`; el débito es el equivalente del saldo predeterminado + la comisión
(fijo, si está configurado; aquí `0.30`).

### Campos del beneficiary por corredor

| País | Método | Campos del `beneficiary` |
|---|---|---|
| CL | `bank_transfer` | `name`, `tax_id` (RUT), `bank_code`, `account_type`, `account_number` |
| PE | `bank_transfer` | `name`, `account_number` (CCI de 20 dígitos) |
| PE | `yape` | `name`, `phone` (`51XXXXXXXXX`) |
| MX | `bank_transfer` | `name`, `account_type` (`clabe`/`debit_card`), `account_number` (+ `bank_code` si es tarjeta) |
| VE | `pago_movil` | `name` (nombre + primer apellido, tal como en la cédula), `phone`, `bank_code` (SUDEBAN), `document_value` |
| VE | `bank_transfer` | `name`, `account_number` (20 dígitos), `document_value` |
| BO | `bank_transfer` | `name`, `tax_id`, `bank_code`, `account_number` |
| CO | `breb` | `name`, `tax_id`/`document_value`, `document_type`, `phone`, `address`, `breb_key`, `breb_key_type` |
| BR | `pix` | `name`, `tax_id` + (`pix_key` y `pix_key_type`) o (`bank_code` ISPB, `branch_code`, `account_number`) |
| EC | `bank_transfer` | `name`, `document_value` (cédula), `sender_name`, `account_number` (+ `bank_code` y `account_type` si es a otro banco) |
| EC | `deuna` | `name`, `document_value`, `sender_name`, `phone` (celular de la billetera) |
| EC | `cash_pickup` / `cnb` | `name`, `document_value`, `sender_name` — el beneficiario retira con su documento |
| PY | `bank_transfer` | `name` (≤35), `tax_id`, `bank_code`, `account_number` |
| AR | `bank_transfer` | `name`, `tax_id` (CUIT/CUIL de 11 dígitos), `account_number` (CBU/CVU de 22 dígitos o alias bancario; USD solo CBU) |
| US | `ach` / `wire` / `swift` | `name`, `account_number`, `email`, `country_code` (cualquier país), `address`, `city`, `postal_code` (+ `state` si `country_code` es `US`), `bank_name`, `bank_country` (`US` en `ach`/`wire`), `bank_code` (routing ABA para `ach`/`wire`, BIC SWIFT para `swift`; + `account_type` `CHECKING`/`SAVING` para `ach`) |

#### Chile

Transferencia bancaria en CLP. Requiere RUT, banco y cuenta: el peso chileno no tiene unidad menor, por lo que los montos de payouts CLP deben ser enteros (por ejemplo, `30000` o `30000.00`).

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "CL",
    "currency": "CLP",
    "method": "bank_transfer",
    "amount": "100000",
    "beneficiary": {
      "name": "Pedro Soto Fuentes",
      "tax_id": "12.345.678-5",
      "bank_code": "012",
      "account_type": "checking",
      "account_number": "123456789"
    },
    "description": "Pago proveedor",
    "idempotency_key": "cl-prov-0091"
  }'
```

```json
{
  "payout_id": "b3e1…",
  "country": "CL",
  "currency": "CLP",
  "method": "bank_transfer",
  "local_amount": "100000",
  "fx_rate": "925.69",
  "usdt_amount": "108.027528",
  "fee": "0.300000",
  "total_debit": "108.327528",
  "status": "processing",
  "status_code": "",
  "status_message": "",
  "funds_debited": true,
  "compliance_pending": false,
  "bank_reference": ""
}
```

El catálogo de bancos (`GET /v1/payouts/banks?country=CL`) da los `bank_code` vigentes. `CL`/`CLP`/`bank_transfer` puede despacharse en ventanas agrupadas de cinco minutos; `POST /v1/payouts` sigue respondiendo `202` con `status: "processing"` y cada payout conserva su estado final y su webhook `payout_status_changed`.

#### Perú

Dos métodos: transferencia bancaria (CCI interbancario) y **Yape** (al
número de teléfono).

```bash bank_transfer (CCI)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "PE",
    "currency": "PEN",
    "method": "bank_transfer",
    "amount": "1000.00",
    "beneficiary": {
      "name": "Rosa Álvarez Díaz",
      "account_number": "00219300123456789012"
    },
    "idempotency_key": "pe-cci-3310"
  }'
```

```bash yape (teléfono)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "PE",
    "currency": "PEN",
    "method": "yape",
    "amount": "150.00",
    "beneficiary": {
      "name": "Luis Ramos Vega",
      "phone": "51987654321"
    },
    "idempotency_key": "pe-yape-8874"
  }'
```

```json
{
  "payout_id": "c7a2…",
  "country": "PE",
  "currency": "PEN",
  "method": "yape",
  "local_amount": "150.00",
  "fx_rate": "3.40",
  "usdt_amount": "44.117648",
  "fee": "0.300000",
  "total_debit": "44.417648",
  "status": "completed",
  "bank_reference": "00761123456"
}
```

En `yape` el teléfono va en formato `51XXXXXXXXX` (11 dígitos con código de
país). El resultado suele ser síncrono.

#### México

SPEI en MXN, a CLABE (18 dígitos) o a tarjeta de débito:

```bash CLABE
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "MX",
    "currency": "MXN",
    "method": "bank_transfer",
    "amount": "1500.00",
    "beneficiary": {
      "name": "María López",
      "account_type": "clabe",
      "account_number": "012180001234567895"
    },
    "idempotency_key": "mx-clabe-8841"
  }'
```

```bash Tarjeta de débito
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "MX",
    "currency": "MXN",
    "method": "bank_transfer",
    "amount": "800.00",
    "beneficiary": {
      "name": "Jorge Herrera",
      "account_type": "debit_card",
      "account_number": "4152313412341234",
      "bank_code": "40012"
    },
    "idempotency_key": "mx-card-1102"
  }'
```

```json
{
  "payout_id": "0d4f…",
  "country": "MX",
  "currency": "MXN",
  "method": "bank_transfer",
  "local_amount": "1500.00",
  "fx_rate": "17.50",
  "usdt_amount": "85.714286",
  "fee": "0.300000",
  "total_debit": "86.014286",
  "status": "processing",
  "status_code": "",
  "status_message": "",
  "funds_debited": true,
  "compliance_pending": false,
  "bank_reference": ""
}
```

Con CLABE el banco destino se deriva de los primeros dígitos; con tarjeta
es obligatorio `bank_code`.

#### Venezuela

Dos métodos: **Pago Móvil** (nombre + teléfono + banco + cédula) y transferencia
bancaria (cuenta de 20 dígitos):

```bash pago_movil
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "VE",
    "currency": "VES",
    "method": "pago_movil",
    "amount": "2000.00",
    "beneficiary": {
      "name": "Carmen Delgado",
      "phone": "04141234567",
      "bank_code": "0102",
      "document_value": "V12345678"
    },
    "idempotency_key": "ve-pm-5567"
  }'
```

```bash bank_transfer
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "VE",
    "currency": "VES",
    "method": "bank_transfer",
    "amount": "5000.00",
    "beneficiary": {
      "name": "Carmen Delgado",
      "account_number": "01020123456789012345",
      "document_value": "V87654321"
    },
    "idempotency_key": "ve-bank-7810"
  }'
```

```json
{
  "payout_id": "e9b4…",
  "country": "VE",
  "currency": "VES",
  "method": "pago_movil",
  "local_amount": "2000.00",
  "fx_rate": "666.00",
  "usdt_amount": "3.003004",
  "fee": "0.300000",
  "total_debit": "3.303004",
  "status": "completed",
  "bank_reference": "00761123456"
}
```

`bank_code` usa códigos SUDEBAN; en `bank_transfer` puede derivarse de los
primeros 4 dígitos de la cuenta.

#### Bolivia

Transferencia ACH en BOB o USD (además del
[payout QR](https://docs.cbpayapp.com/es/guides/payout-special-cases#payout-qr)):

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BO",
    "currency": "BOB",
    "method": "bank_transfer",
    "amount": "1382.00",
    "beneficiary": {
      "name": "Juan Quispe Mamani",
      "tax_id": "4567890",
      "bank_code": "1016",
      "account_number": "1234567890"
    },
    "idempotency_key": "bo-ach-2204"
  }'
```

```json
{
  "payout_id": "f2c8…",
  "country": "BO",
  "currency": "BOB",
  "method": "bank_transfer",
  "local_amount": "1382.00",
  "fx_rate": "6.91",
  "usdt_amount": "200.000000",
  "fee": "0.300000",
  "total_debit": "200.300000",
  "status": "processing",
  "status_code": "",
  "status_message": "",
  "funds_debited": true,
  "compliance_pending": false,
  "bank_reference": ""
}
```

Para USD envía `currency: "USD"` con la misma estructura. La configuración de riel de la organización decide qué versión interna atiende los payouts de Bolivia; la elección se guarda en la operación para que el sondeo posterior siga usando la versión correcta, y respuestas y webhooks se mantienen provider-agnostic.

#### Brasil

PIX por llave (además del
[QR PIX](https://docs.cbpayapp.com/es/guides/payout-special-cases#payout-qr)):

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BR",
    "currency": "BRL",
    "method": "pix",
    "amount": "350.00",
    "beneficiary": {
      "name": "João da Silva",
      "tax_id": "123.456.789-09",
      "pix_key_type": "cpf",
      "pix_key": "12345678909"
    },
    "idempotency_key": "br-pix-3321"
  }'
```

```json
{
  "payout_id": "a6d1…",
  "country": "BR",
  "currency": "BRL",
  "method": "pix",
  "local_amount": "350.00",
  "fx_rate": "5.13",
  "usdt_amount": "68.226121",
  "fee": "0.300000",
  "total_debit": "68.526121",
  "status": "processing",
  "bank_reference": ""
}
```

`pix_key_type`: `cpf`, `cnpj`, `phone`, `email` o `evp` (llave aleatoria).

**PIX a cuenta (sin llave)** — si el beneficiario no tiene o no entrega su
llave PIX, envía sus datos bancarios; llega igual de rápido (mismo riel
PIX, 24/7):

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BR",
    "currency": "BRL",
    "method": "pix",
    "amount": "350.00",
    "beneficiary": {
      "name": "Empresa Exemplo Ltda",
      "tax_id": "19.385.062/0001-20",
      "bank_code": "45678923",
      "branch_code": "1",
      "account_number": "765432",
      "account_type": "CACC"
    },
    "idempotency_key": "br-pix-acct-3322"
  }'
```

- `bank_code` es el **ISPB** del banco destino (8 dígitos), `branch_code`
  la agencia y `account_type` el tipo de cuenta (`CACC` corriente —
  default —, `SVGS` ahorro, `TRAN` cuenta de pago, `SLRY` salario).
- El estado final llega por el webhook `payout_status_changed`
  (conciliación continua contra el rail); consulta puntual con
  `GET /v1/payouts/{id}`.

#### Ecuador

Remesas en **USD** (1 a 100.000 por operación, máx. 2 decimales; fuera del rango
devuelve `amount_below_minimum`/`amount_above_maximum` y los montos mayores se
dividen) con cuatro
métodos: transferencia bancaria, billetera **DE UNA** (por celular),
retiro en **ventanilla** (`cash_pickup`) y retiro en **corresponsal no
bancario** (`cnb`). Es un corredor de remesas: además del beneficiario, el
rail exige los datos del **ordenante** (quien envía), que van planos
dentro del mismo `beneficiary` con prefijo `sender_*`.
```bash bank_transfer (a cuenta)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "EC",
    "currency": "USD",
    "method": "bank_transfer",
    "amount": "250.00",
    "beneficiary": {
      "name": "Carlos Andrade Vera",
      "document_value": "1712345678",
      "account_number": "2203456789",
      "sender_name": "Ana Torres Silva",
      "sender_document_value": "V23456789",
      "sender_country": "US"
    },
    "idempotency_key": "ec-bank-4471"
  }'
```

```bash deuna (billetera)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "EC",
    "currency": "USD",
    "method": "deuna",
    "amount": "80.00",
    "beneficiary": {
      "name": "Lucia Paredes Mora",
      "document_value": "0923456781",
      "phone": "0998765432",
      "sender_name": "Ana Torres Silva"
    },
    "idempotency_key": "ec-deuna-5520"
  }'
```

```bash cash_pickup (ventanilla)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "EC",
    "currency": "USD",
    "method": "cash_pickup",
    "amount": "120.00",
    "beneficiary": {
      "name": "Miguel Zambrano Loor",
      "document_value": "1309876543",
      "sender_name": "Ana Torres Silva"
    },
    "idempotency_key": "ec-cash-6612"
  }'
```

```bash cnb (corresponsal)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "EC",
    "currency": "USD",
    "method": "cnb",
    "amount": "60.00",
    "beneficiary": {
      "name": "Rosa Cedeño Vera",
      "document_value": "0801234567",
      "sender_name": "Ana Torres Silva"
    },
    "idempotency_key": "ec-cnb-7703"
  }'
```

```json
{
  "payout_id": "9f3a…",
  "country": "EC",
  "currency": "USD",
  "method": "bank_transfer",
  "local_amount": "250.00",
  "fx_rate": "1",
  "usdt_amount": "250.000000",
  "fee": "0.300000",
  "total_debit": "250.300000",
  "status": "processing",
  "bank_reference": ""
}
```
- Ecuador está dolarizado: la moneda local ES el USD (`fx_rate: "1"`).
- `document_value` es la cédula del beneficiario; `document_type` acepta
  `IDCD` (cédula, default), `CCPT` (pasaporte) o `TXID` (RUC).
- En `bank_transfer`, si omites `bank_code` la cuenta es del banco emisor
  del corredor; para **otro banco** envía el `bank_code` del catálogo
  (`GET /v1/payouts/banks?country=EC`) más `account_type`
  (`checking` o `savings`); un beneficiario incompleto devuelve
  `invalid_beneficiary` con el campo exacto.
- Nombres estructurados opcionales (`given_name`, `middle_name`,
  `first_surname`, `second_surname` y sus pares `sender_*`): si los
  tienes, envíalos — mandan sobre la separación automática de `name`.
- El estado final llega por webhook `payout_status_changed`
  (con conciliación periódica de respaldo).

#### Paraguay

Transferencia bancaria en PYG:

```bash
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "PY",
    "currency": "PYG",
    "method": "bank_transfer",
    "amount": "500000",
    "beneficiary": {
      "name": "Sofía Benítez",
      "tax_id": "4123456",
      "bank_code": "0011",
      "account_number": "600123456"
    },
    "idempotency_key": "py-bank-9917"
  }'
```

```json
{
  "payout_id": "d4e7…",
  "country": "PY",
  "currency": "PYG",
  "method": "bank_transfer",
  "local_amount": "500000",
  "fx_rate": "6055.76",
  "usdt_amount": "82.566020",
  "fee": "0.300000",
  "total_debit": "82.866020",
  "status": "processing",
  "bank_reference": ""
}
```

`name` acepta hasta 35 caracteres en este corredor.

#### Argentina
**Alias bancarios**: en `bank_transfer` ARS y USD, `beneficiary.account_number` también acepta un alias de 6 a 20 letras/números/puntos/guiones, con al menos una letra. Un valor solo numérico se trata como CBU/CVU, no como alias. CBPay resuelve un alias válido a la cuenta destino antes de despachar; el wire usa el CBU resuelto. ARS puede resolver a CBU o CVU; USD sigue siendo solo CBU a CBU. Un alias que no puede resolverse se rechaza sin debitar el saldo. El alias original queda disponible en la evidencia del payout.

Transferencia bancaria en **ARS** o **USD** a cualquier **CBU o CVU** de
22 dígitos (cuentas bancarias y billeteras virtuales). No necesitas
`bank_code`: el CBU/CVU identifica el banco por sí solo.

```bash ARS (CBU o CVU)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "AR",
    "currency": "ARS",
    "method": "bank_transfer",
    "amount": "50000.00",
    "beneficiary": {
      "name": "Julieta Fernandez",
      "tax_id": "27-23456789-1",
      "account_number": "2850590940090418135201"
    },
    "idempotency_key": "ar-ars-3311"
  }'
```

```bash USD (solo CBU)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "AR",
    "currency": "USD",
    "method": "bank_transfer",
    "amount": "100.00",
    "beneficiary": {
      "name": "Julieta Fernandez",
      "tax_id": "27-23456789-1",
      "account_number": "2850590940090418135201"
    },
    "idempotency_key": "ar-usd-3312"
  }'
```

```json
{
  "payout_id": "b7c1…",
  "country": "AR",
  "currency": "ARS",
  "method": "bank_transfer",
  "local_amount": "50000.00",
  "fx_rate": "1250.00",
  "usdt_amount": "40.000000",
  "fee": "0.300000",
  "total_debit": "40.300000",
  "status": "completed",
  "bank_reference": "00761123456"
}
```

- `tax_id` es el **CUIT/CUIL** del titular de la cuenta destino (11
  dígitos; los guiones se aceptan y se normalizan).
- **USD opera solo de cuenta bancaria a cuenta bancaria (CBU)**: una CVU
  (billetera virtual) no admite dólares — el payout se rechaza antes de
  enviarse.
- La mayoría de los payouts se confirma en la misma llamada
  (`status: "completed"`); si el rail queda en `processing`, el estado
  final llega por webhook `payout_status_changed`.
- Excepcional: el rail puede **reversar** una transferencia ya acreditada
  (por ejemplo, por orden del banco receptor). Si ocurre, el payout pasa a
  `failed`, el débito se reembolsa completo y recibes el webhook
  `payout_status_changed`.

#### Estados Unidos

Payouts en **USD** a cuentas bancarias de EE. UU., con tres métodos:

- **`ach`** — transferencia ACH a cuenta corriente o de ahorro. Se envía
  con liquidación **al día siguiente**.
- **`wire`** — transferencia wire doméstica. Mínimo **USD 25.00**.
- **`swift`** — wire internacional en USD vía SWIFT. Mínimo **USD 25.00**.
Estimaciones: **ACH, 24 a 48 horas hábiles; wire/Fedwire, mismo día hábil (hasta 24 horas); SWIFT, 24 a 48 horas hábiles, posiblemente más según el banco receptor.** El payout queda `processing` hasta la confirmación bancaria.

El riel bancario de EE. UU. exige la **identidad y dirección postal
completas del beneficiario en cada transferencia** — un beneficiario
incompleto se rechaza al crear (`422`, ver abajo). El beneficiario puede
**vivir en cualquier país**: `country_code` es libre (por ejemplo, un ACH
a un banco de EE. UU. para un beneficiario que vive en Alemania). Lo que
sigue fijo es el **banco receptor**: en `ach`/`wire` debe ser un banco de
EE. UU. (`bank_country: "US"` — el riel doméstico no paga a bancos fuera
de EE. UU.); en `swift` el banco puede ser de cualquier país. Las
jurisdicciones del Anexo B (CU/IR/KP/SY) siguen bloqueadas para el país
del beneficiario **y** del banco (`422 prohibited_country`). Campos
requeridos y opcionales:

| Campo | `ach` | `wire` | `swift` | Notas |
|---|---|---|---|---|
| `name` | requerido | requerido | requerido | Nombre legal completo del titular |
| `account_number` | requerido | requerido | requerido | Número de cuenta bancaria |
| `email` | requerido | requerido | requerido | El riel lo registra para cada beneficiario |
| `country_code` | requerido | requerido | requerido | ISO-3166 alpha-2 de **residencia del beneficiario** — cualquier país (no solo `US`) |
| `address`, `city`, `postal_code` | requerido | requerido | requerido | Dirección postal completa del beneficiario (sin validación de formato ZIP fuera de EE. UU.) |
| `state` | condicional | condicional | condicional | Requerido **solo si `country_code` es `US`** (código de estado de 2 letras); opcional en el resto |
| `phone` | opcional | opcional | opcional | Teléfono de contacto del beneficiario |
| `bank_name` | requerido | requerido | requerido | Nombre del banco receptor |
| `bank_country` | requerido (`US`) | requerido (`US`) | requerido | País del banco receptor — **fijo en `US` para `ach`/`wire`**; cualquier país en `swift` |
| `bank_code` | requerido | requerido | requerido | **Routing number ABA** (9 dígitos) para `ach`/`wire`; **BIC SWIFT** para `swift` |
| `account_type` | requerido | — | — | `CHECKING` o `SAVING` |
| `bank_address`, `bank_city`, `bank_postal_code` | requerido | requerido | opcional | Dirección del banco receptor — en `swift` el riel la deriva del BIC |
| `bank_state` | requerido (banco US) | requerido (banco US) | opcional | Estado del banco cuando `bank_country` es `US` |
| `bank_phone` | opcional | opcional | opcional | Teléfono del banco receptor |

No hay catálogo de bancos de EE. UU.: el `bank_code` es el propio routing
ABA del banco del beneficiario (ACH/wire) o su BIC SWIFT (swift), dato que
entrega el beneficiario. Para autodetectar el banco mientras el pagador lo
escribe, llama `GET /v1/payouts/bank-directory/lookup` con el routing
number o el SWIFT/BIC — resuelve el nombre del banco, ciudad, estado y
bloque de dirección desde un directorio bancario público embebido, así
puedes pre-llenar `bank_name` y los campos opcionales `bank_*`. Un
`404 bank_not_found` solo significa que el código no está en el directorio:
el formulario sigue manual.

```bash
curl "https://api.qbank.cl/platform/v1/payouts/bank-directory/lookup?routing_number=021000021" \
  -H "Authorization: Bearer <token>"
```

```json
{
  "routing_number": "021000021",
  "bank_name": "JPMORGAN CHASE",
  "bank_city": "TAMPA",
  "bank_state": "FL",
  "bank_postal_code": "33610",
  "bank_country": "US",
  "bank_phone": "813-432-3700",
  "source": "directory",
  "directory_vintage": "fed_ach_2019"
}
```

```bash ach
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "ach",
    "amount": "250.00",
    "beneficiary": {
      "name": "John Carter",
      "email": "john.carter@example.com",
      "account_number": "123456789012",
      "account_type": "CHECKING",
      "country_code": "US",
      "address": "1200 Brickell Ave",
      "city": "Miami",
      "state": "FL",
      "postal_code": "33131",
      "bank_name": "Example Bank",
      "bank_code": "021000089",
      "bank_address": "500 Main Street",
      "bank_city": "New York",
      "bank_state": "NY",
      "bank_postal_code": "10001",
      "bank_country": "US"
    },
    "description": "Factura 2210",
    "idempotency_key": "us-ach-2210"
  }'
```

```bash ach (beneficiario fuera de EE. UU.)
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "ach",
    "amount": "250.00",
    "beneficiary": {
      "name": "Anna Schmidt",
      "email": "anna.schmidt@example.com",
      "account_number": "123456789012",
      "account_type": "CHECKING",
      "country_code": "DE",
      "address": "Friedrichstrasse 100",
      "city": "Berlin",
      "postal_code": "10117",
      "bank_name": "Example Bank",
      "bank_code": "021000089",
      "bank_address": "500 Main Street",
      "bank_city": "New York",
      "bank_state": "NY",
      "bank_postal_code": "10001",
      "bank_country": "US"
    },
    "description": "Factura 2215",
    "idempotency_key": "us-ach-2215"
  }'
```

```bash wire
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "wire",
    "amount": "1000.00",
    "beneficiary": {
      "name": "John Carter",
      "email": "john.carter@example.com",
      "account_number": "123456789012",
      "country_code": "US",
      "address": "1200 Brickell Ave",
      "city": "Miami",
      "state": "FL",
      "postal_code": "33131",
      "bank_name": "Example Bank",
      "bank_code": "021000089",
      "bank_address": "500 Main Street",
      "bank_city": "New York",
      "bank_state": "NY",
      "bank_postal_code": "10001",
      "bank_country": "US"
    },
    "description": "Factura 2211",
    "idempotency_key": "us-wire-2211"
  }'
```

```bash swift
curl -X POST https://api.qbank.cl/platform/v1/payouts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "swift",
    "amount": "1000.00",
    "beneficiary": {
      "name": "John Carter",
      "email": "john.carter@example.com",
      "account_number": "123456789012",
      "country_code": "US",
      "address": "1200 Brickell Ave",
      "city": "Miami",
      "state": "FL",
      "postal_code": "33131",
      "bank_name": "Example Bank",
      "bank_code": "CHASUS33XXX",
      "bank_country": "US"
    },
    "description": "Factura 2212",
    "idempotency_key": "us-swift-2212"
  }'
```

```json
{
  "payout_id": "c5f2…",
  "country": "US",
  "currency": "USD",
  "method": "ach",
  "local_amount": "250.00",
  "fx_rate": "0.9980",
  "usdt_amount": "250.501002",
  "fee": "0.300000",
  "total_debit": "250.801002",
  "status": "processing",
  "bank_reference": "CBF1234567890123"
}
```

- **Los payouts US quedan `processing` hasta que el banco confirma el pago manual.**
  El create ya devuelve el CBF en `bank_reference`. Escucha
  `payout_status_changed` para `completed` o `failed` (reembolsado).
- En este riel no hay un hold AML/CFT extra del beneficiario: el operador
  paga a mano y el poller reconcilia.
- **Mínimos**: `wire` y `swift` exigen al menos **USD 25.00**; bajo eso la
  creación se rechaza con `422` y `status_message`
  `"…payouts require an amount of at least USD 25"`. ACH no tiene mínimo
  validado.
- El riel pide una **declaración de propósito del pago** en cada
  transferencia. `purpose` es obligatorio (catálogo de 21 valores — ver
  abajo); las otras declaraciones usan su default salvo que las
  sobreescribas por operación en `options` (valores de hasta 140 caracteres):

  | Clave de `options` | Qué declara | Default |
  |---|---|---|
  | `purpose` | Propósito del pago (catálogo obligatorio) | — (ninguno; requerido) |
  | `crypto_activity` | Si el pago se relaciona con compra/venta de cripto (`Yes`/`No`) | `No` |
  | `payment_gateway` | Declaración de gateway de depósito | default del riel |
