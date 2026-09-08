---
title: "Errores"
description: "Formato de error y catálogo completo de códigos"
slug: es/errores
lang: es
source_url: https://docs.cbpayapp.com/es/errores
---
Todos los errores comparten el mismo formato:

```json
{
  "error": "insufficient_funds",
  "message": "account balance is not enough for this operation"
}
```

- `error`: código estable en `snake_case` — úsalo en tu lógica.
- `message`: explicación legible — puede cambiar, no lo parsees.

> **Nota**
**Mensajes de error saneados.** El `message` de un error nunca expone nombres de proveedores, detalles de infraestructura, URLs, bodies crudos del proveedor (JSON/HTML) ni configuración interna — ni en respuestas de la API, ni en webhooks, ni en los campos de estado persistidos. Los rechazos de negocio del procesador conservan su motivo accionable (por ejemplo, por qué se rechazó un documento o una cuenta); las fallas de infraestructura se reemplazan por el mensaje genérico fijo `"the payment provider could not process the request"` — reintenta esas operaciones con la misma `idempotency_key`.
## Códigos por categoría

### Autenticación y permisos

| HTTP | `error` | Significado |
|---|---|---|
| 401 | `unauthorized` | Credencial ausente o inválida |
| 401 | `invalid_credentials` | Email o contraseña incorrectos (login) |
| 401 | `invalid_refresh_token` | Refresh token inválido, expirado, ya usado o revocado — vuelve al login |
| 403 | `account_required` | El endpoint exige credencial de cuenta |
| 403 | `org_admin_required` | El endpoint exige credencial de administrador |
| 403 | `forbidden` | Nivel de credencial no permitido |
| 403 | `account_blocked` | La cuenta no está activa |
| 403 | `service_disabled` | El servicio no está habilitado para tu cuenta (consulta `GET /v1/services`) |
| 403 | `org_suspended` | El servicio está suspendido; contacta al equipo de CBPay |
| 403 | `company_only` | Función solo para cuentas empresa |
| 403 | `company_required` | Función solo para cuentas empresa (ej. [banking para terceros](https://docs.cbpayapp.com/es/guias/banking)) |
| 403 | `human_session_required` | La operación maneja llave privada (import/export de wallet segregada) y exige sesión de usuario con 2FA — las API keys no se permiten |
| 403 | `member_disabled` | El usuario está bloqueado para iniciar sesión; contacta al administrador de tu organización |
| 403 | `passkey_rejected` | La verificación de la passkey falló; reintenta o entra con contraseña |
| 403 | `owner_required` | Solo el miembro owner de la cuenta puede ejecutar esa acción |

### OTP / 2FA

Detalle y flujo completo en [seguridad y 2FA](https://docs.cbpayapp.com/es/seguridad-2fa).

| HTTP | `error` | Significado |
|---|---|---|
| 403 | `otp_required` | La acción exige OTP: verifica un desafío y reintenta con `X-OTP-Token` |
| 403 | `otp_invalid` | Token OTP inválido, expirado o ya usado |
| 403 | `session_required` | Los desafíos OTP requieren sesión de usuario, no API key |
| 403 | `phone_binding_cooldown` | Teléfono enlazado hace menos de 24 h sin verificación y sin factor alternativo (app autenticadora o email verificado) |
| 409 | `phone_verification_required` | Verifica tu teléfono (desafío OTP) antes de activar el 2FA de login por SMS/WhatsApp |
| 401 | `invalid_code` | El código no coincide |
| 401 | `invalid_pending_token` | El token intermedio del login expiró; vuelve a iniciar sesión |
| 400 | `invalid_action` / `invalid_channel` | Acción o canal fuera de catálogo |
| 409 | `phone_required` | La cuenta no tiene teléfono (`PATCH /v1/me`) |
| 409 | `otp_phone_missing` | El login exige OTP y la cuenta no tiene teléfono; contacta a tu operador |
| 409 | `challenge_not_pending` | El desafío expiró o ya se usó; crea uno nuevo |
| 429 | `too_many_attempts` | Límite de envíos o verificaciones; espera unos minutos |
| 503 | `otp_unavailable` | Servicio de verificación no disponible (la acción queda bloqueada, nunca se salta el OTP) |
| 409 | `otp_disabled_for_org` | Tu organización no tiene habilitado el 2FA por acción; contacta a tu operador |
| 409 | `totp_not_started` | No hay enrolamiento TOTP en curso; parte con `POST /v1/me/totp/enroll` |

### Login social (OAuth)

Detalle y flujo completo en [login social](https://docs.cbpayapp.com/es/guias/login-social).

| HTTP | `error` | Significado |
|---|---|---|
| 400 | `invalid_provider` | Proveedor fuera de `google/apple/microsoft/facebook` |
| 400 | `provider_not_configured` | Tu organización no tiene ese proveedor habilitado |
| 401 | `invalid_credential` | La credencial del proveedor es inválida, expiró o es de otra app |
| 409 | `email_conflict` | Ya existe una cuenta con ese email; entra con tu método actual y vincula el proveedor |
| 409 | `identity_taken` | Ese proveedor ya está vinculado a otra cuenta |
| 409 | `last_login_method` | No puedes desvincular tu único método de acceso |

### Panel de administración de organización

Estos códigos provienen de **superficies de administración de organización** (el panel [CBPay Admin](https://cbpayapp.com)), no de la API a nivel cuenta documentada arriba — nunca aparecen en los endpoints `/v1/*` de cuenta.

| HTTP | `error` | Significado |
|---|---|---|
| 403 | `global_treasury_access_disabled` | La organización no tiene habilitada la visibilidad de tesorería global en su panel admin; pide a un administrador de plataforma que habilite `global_treasury_read` en los settings de la organización |
| 400 | `invalid_value` | Un setting de la organización se envió con el tipo incorrecto (ej. `global_treasury_read` debe ser booleano, no un string) |
| 409 | `approval_in_progress` | Otro administrador está aplicando este ajuste; espera a que termine antes de intentarlo de nuevo |

### Validación (400)

| `error` | Significado |
|---|---|
| `invalid_json` | Body no es JSON válido o tiene campos desconocidos |
| `invalid_settings` | Los settings de la organización no son un objeto JSON válido o no pudieron normalizarse; corrige el payload y reintenta |
| `invalid_type` | `type` debe ser `person` o `company` |
| `invalid_email` / `invalid_display_name` | Campo requerido inválido |
| `weak_password` | Contraseña menor a 8 caracteres |
| `invalid_role` | Rol de miembro inválido |
| `unknown_org` | Slug de organización incorrecto (usa `cbpay`) |
| `invalid_request` | Faltan `country`/`currency` |
| `idempotency_key_required` | Falta la clave de idempotencia |
| `reserved_idempotency_key` | La clave usa un prefijo reservado del sistema (`payin-convert:` o `checkout-swap:`, propios de las auto-conversiones) — usa otra clave |
| `beneficiary_required` | Falta el beneficiario del payout |
| `invalid_amount` | Monto no es un decimal positivo válido |
| `recipient_required` / `self_transfer` | Destino de transferencia inválido |
| `invalid_chain` / `invalid_asset` | Red o activo no soportado |
| `to_address_required` | Falta dirección destino del retiro |
| `invalid_payload` | Falta un campo requerido (ej. `enabled` en monitoreo AML, `external_customer_id` en verificaciones) |
| `invalid_qr_payload` | QR de payout ilegible o no soportado (BR Code corrupto, checksum inválido o QR PIX dinámico); el `message` explica la razón exacta |
| `liveness_already_completed` | La prueba de vida de esa verificación ya fue superada |
| `invalid_event_type` / `weak_secret` / `invalid_callback_url` | Suscripción de webhook inválida |
| `invalid_phone` | Teléfono no normalizable a E.164 (contactos y `to_phone`) |
| `invalid_language` | `lang` del informe PDF no es `en`, `es` ni `zh` (informe AML e informe de verificación) |
| `invalid_locale` | `PATCH /v1/me` (o el registro) envió un locale no vacío fuera de `en` / `es` / `zh`. El string vacío guarda inglés. Distinto de `invalid_language` (`lang` de informe PDF) y del `invalid_value` de org-admin en `default_locale` |
| `invalid_format` | `format` del informe de verificación no es `pdf` ni `json` |
| `batch_too_large` | Import de contactos con más de 1.000 entradas (pagina la subida) |
| `invalid_alias` | El alias debe tener 4–20 caracteres (a-z, 0-9, punto, guion bajo, guion), empezar/terminar alfanumérico y no ser palabra reservada |
| `invalid_body` | No se pudo leer el body del request (subidas binarias, webhooks) |
| `invalid_image` | El body del avatar está vacío o no es una imagen soportada (PNG/JPEG/WebP, máx 512 KB) |
| `invalid_interval` | El `interval` de la suscripción debe ser `daily`, `weekly`, `monthly` o `yearly` |
| `query_required` | `GET /v1/resolve` necesita `alias=` o `qr=` |
| `same_email` | El nuevo email de login es el actual; usa `POST /v1/me/email/verify` para verificarlo |
| `invalid_status` / `invalid_kyc_status` / `invalid_direction` / `reason_required` / `account_id_required` / `invalid_service` / `invalid_fee` | Validaciones de administración |
| `invalid_settlement_hours` | `settlement_hours` solo se acepta en el servicio de comisión `payin_card` y debe ser un entero no negativo (`0` = acreditación inmediata) — ver [comisiones](https://docs.cbpayapp.com/es/conceptos/comisiones) |
| `invalid_country` | Código de país mal formado o ausente — ISO 3166-1 alpha-2 (ej. `GET /v1/aml/catalogs/cities?country=`); también un filtro de país válido pero no soportado (ej. un `country` distinto de `US` en el lookup del directorio bancario) |

### Dinero y estado (402 / 404 / 409 / 422)

| HTTP | `error` | Significado |
|---|---|---|
| 402 | `insufficient_funds` | Saldo disponible insuficiente — en transferencias banking salientes el chequeo incluye la comisión del riel (`saldo >= monto + comisión`); la operación no se crea si no se cumple |
| 404 | `not_found` | Recurso inexistente (o de otra cuenta) |
| 404 | `country_not_found` | Código de país ISO 3166-1 alpha-2 desconocido (catálogo de ciudades) |
| 404 | `bank_not_found` | El routing number o SWIFT/BIC no está en el directorio bancario embebido — el formulario de payout/contraparte sigue manual |
| 404 | `postal_code_not_found` | Código postal desconocido, o un país sin dataset (lookup por código postal) — los campos de dirección siguen manuales |
| 404 | `recipient_not_found` | Destino de transferencia inexistente |
| 404 | `verification_not_found` | La cuenta aún no tiene ninguna verificación enviada (`GET /v1/me/verification/report` antes del onboarding) |
| 409 | `duplicate` | El recurso ya existe |
| 403 | `verification_required` | Tu cuenta aún no aprobó su verificación de identidad (persona=KYC, empresa=KYB); hasta entonces solo puedes fondear — pide tu link en `POST /v1/me/verification/link` |
| 422 | `verification_required` | La operación exige el `verification_id` de una verificación aprobada del tercero (alta banking de terceros, tarjeta designada) |
| 422 | `verification_not_approved` | La verificación referenciada aún no está aprobada |
| 422 | `verification_kind_mismatch` | El kind de la verificación no calza con el producto (KYC ⇒ persona/INDIVIDUAL, KYB ⇒ empresa/COMPANY) |
| 422 | `verification_invalid` | Referenciaste una verificación de onboarding propio donde se exige la de un tercero |
| 403 | `company_account_required` | La verificación de terceros (links/submissions KYC-KYB) es solo para cuentas empresa |
| 409 | `already_verified` | Pediste link de onboarding con la cuenta ya verificada |
| 409 | `identity_locked` | Con la verificación aprobada, `display_name`, `tax_id` y `country` vienen de la identidad verificada y no se cambian por `PATCH /v1/me`; contacta al soporte |
| 409 | `no_screening` | Rescreen/monitoreo AML sin un screening previo |
| 409 | `no_banking_customer` | Operación banking sin perfil bancario creado (`POST /v1/banking/customer` primero) |
| 409 | `banking_customer_exists` | La cuenta ya tiene perfil bancario (es uno por cuenta) |
| 409 | `idempotency_conflict` | El claim del mismo perfil banking sigue pendiente o cambió el payload — conserva la misma solicitud y espera la reconciliación |
| 503 | `banking_recovery_pending` | El resultado del alta es ambiguo — operaciones debe reconciliar el claim durable antes de reintentar con una clave nueva |
| 422 | `currency_not_supported` | Sin tasa FX para esa moneda |
| 422 | `core_rejected` | El procesador rechazó la operación — cuando el mensaje reporta una **dirección de facturación incompleta** (o estado/región faltante), la tarjeta guardada no tiene una dirección utilizable en archivo: pide al pagador guardarla de nuevo con `save_card: true` |
| 422 | `recipient_unavailable` | La cuenta destino no puede recibir |
| 422 | `recipient_ambiguous` | Más de una cuenta comparte el teléfono de `to_phone` (usa `to_account_id` o `to_email`) |
| 422 | `contact_not_linked` | El contacto no tiene cuenta CBPay asociada para transferirle |
| 422 | `no_saved_destination` | El contacto no tiene destino guardado para ese corredor/chain |
| 422 | `wallet_limit_reached` | La cuenta ya tiene su wallet de esa combinación red+activo (depósito: todas las cuentas; [segregadas](https://docs.cbpayapp.com/es/guias/wallets-segregadas): personas) |
| 422 | `insufficient_gas` | La [wallet segregada](https://docs.cbpayapp.com/es/guias/wallets-segregadas) no tiene gas nativo (TRX/ETH) para el fee de red; fondea la dirección y reintenta |
| 409 | `idempotency_conflict` | Otra creación/envío de wallet con la misma clave sigue en curso; reintenta con la misma clave |
| 409 | `card_limit_reached` | Una cuenta persona intentó crear una segunda tarjeta del mismo tipo |
| 409 | `card_cancelled` | La tarjeta ya está cancelada y no se puede modificar |
| 409 | `card_not_pending` | Solo tarjetas en `pending_activation` se pueden activar |
| 409 | `cardholder_kyc_pending` | El titular designado requiere documentos de identidad |
| 400 | `invalid_occupation` | `occupation` no es un código del catálogo (`GET /v1/cards/catalog/occupations`) |
| 400 | `invalid_kind_of_business` | `kind_of_business` no es un código del catálogo (`GET /v1/cards/catalog/business-activities`) |
| 400 | `invalid_settlement_asset` | `settlement_asset` no es USDT, USDC, BTC ni GOLD |
| 400 | `settlement_asset_disabled` | Tu organización tiene deshabilitado ese asset como origen de settlement |
| 422 | `settlement_limit_exceeded` | La operación supera el límite por operación de los assets volátiles (BTC/GOLD); usa USDT/USDC o divide la operación |
| 422 | `settlement_daily_limit_exceeded` | La cuenta superó su volumen de 24 h en assets volátiles (BTC/GOLD); usa USDT/USDC o reintenta más tarde |
| 400 | `invalid_pair` | Swap con la misma moneda de origen y destino |
| 400 | `amount_too_small` | El monto del swap no alcanza la unidad mínima de la moneda destino |
| 400 | `swap_asset_disabled` | Una de las monedas del swap está deshabilitada para tu organización |
| 409 | `already_paid` | El [link de cobro universal](https://docs.cbpayapp.com/es/guias/checkout) ya se pagó por otro método |
| 410 | `checkout_expired` | El link de cobro universal venció sin pago |
| 422 | `method_unavailable` | El método elegido en el link de cobro no está disponible para ese link o país |
| 400 | `country_required` | Materialización fiat del link de cobro sin `?country=XX` |
| 400 | `currency_required` | El país ofrece el método del link de cobro en varias monedas; falta `?currency=YYY` |
| 422 | `country_unavailable` | Ese país no tiene métodos de pago disponibles en el link de cobro |
| 422 | `collect_otp_failed` | El rail rechazó el envío de la clave OTP del cobro pull del link |
| 422 | `collect_rejected` | El rail rechazó el cobro pull del link (OTP inválida o datos incorrectos); el link sigue pendiente |
| 422 | `settlement_asset_disabled` | El `settlement_asset` del link de cobro está deshabilitado para tu organización |
| 422 | `checkout_amount_mismatch` | La transferencia CBPay no cubre el monto vigente del link de cobro; el mensaje trae el monto actualizado |
| 422 | `stored_card_revoked` | La [tarjeta guardada](https://docs.cbpayapp.com/es/guias/stored-cards-subscriptions) está revocada; no acepta más cobros |
| 422 | `verification_required` | [QR Crypto POS](https://docs.cbpayapp.com/es/guias/qr-pos): registra al merchant con el `verification_id` de su KYC/KYB de terceros aprobado |
| 422 | `merchant_disabled` | El merchant [QR Crypto POS](https://docs.cbpayapp.com/es/guias/qr-pos) está deshabilitado; reactívalo antes de generar cobros |
| 422 | `nothing_received` | El cobro [QR Crypto POS](https://docs.cbpayapp.com/es/guias/qr-pos) no ha recibido ningún pago on-chain: no hay nada que devolver |
| 422 | `refund_exceeds_received` | La devolución supera lo recibido menos lo ya devuelto del cobro [QR Crypto POS](https://docs.cbpayapp.com/es/guias/qr-pos) |
| 400 | `to_address_required` | La devolución [QR Crypto POS](https://docs.cbpayapp.com/es/guias/qr-pos) (y el retiro crypto) exige la dirección destino explícita |
| 422 | `deposit_account_limit_reached` | Las cuentas tienen una cuenta de depósito por corredor (creada automáticamente con la cuenta); no se puede cambiar ni eliminar |
| 422 | `export_rejected` | El procesador rechazó el export de la llave de la wallet segregada |
| 422 | `stored_card_corridor_mismatch` | La [tarjeta guardada](https://docs.cbpayapp.com/es/guias/stored-cards-subscriptions) pertenece a otro corredor país/moneda distinto del cobro |
| 409 | `subscription_state` | La [suscripción](https://docs.cbpayapp.com/es/guias/stored-cards-subscriptions) no está en un estado que permita esa acción (ej. pausar un plan cancelado) |
| 409 | `email_required` | El login no tiene un email real; configura uno con `POST /v1/me/email/change` |
| 422 | `payin_not_refundable` | El cobro no está acreditado o no tiene credencial del procesador; no se puede [devolver](https://docs.cbpayapp.com/es/guias/devoluciones) |
| 422 | `refund_not_supported` | Ese rail no admite [devoluciones](https://docs.cbpayapp.com/es/guias/devoluciones) (QR, transferencia anunciada, cuenta dedicada, collect). Los cobros POS se devuelven por el riel crypto |
| 422 | `refund_exceeds_payin` | La [devolución](https://docs.cbpayapp.com/es/guias/devoluciones) supera lo que queda por devolver del cobro; tu saldo no se tocó |
| 422 | `settlement_pending` | El saldo del cobro sigue programado para [settlement](https://docs.cbpayapp.com/es/conceptos/comisiones#settlement-de-payins-con-tarjeta) y no se puede [devolver](https://docs.cbpayapp.com/es/guias/devoluciones) hasta liberarse (a `settle_at` o por liberación del admin de la organización) |
| 400 | `invalid_amount` | El `amount` de la [devolución](https://docs.cbpayapp.com/es/guias/devoluciones) debe ser un decimal positivo en la moneda del cobro |

### Cumplimiento (403 / 503)

| HTTP | `error` | Significado |
|---|---|---|
| 403 | `compliance_hold` | La operación fue retenida por los controles de cumplimiento de la plataforma. No es un error de tu request: contacta a soporte con el timestamp — por política no se informa la razón exacta |
| 403 | `geo_restricted` | El servicio o la operación no están disponibles para la jurisdicción de origen o de la contraparte |
| 503 | `compliance_check_unavailable` | La verificación de cumplimiento no se pudo evaluar; la operación NO salió — reintenta con la **misma** clave de idempotencia |
| 422 | `travel_rule_required` | Retiro on-chain sobre el umbral Travel Rule sin datos del beneficiario — agrega `travel_address` o `wallet_type: "self_hosted"` + `beneficiary_name` ([guía crypto](https://docs.cbpayapp.com/es/guias/crypto)) |
| 422 | `travel_rule_beneficiary_required` | Falta `beneficiary_name` en un retiro sujeto a Travel Rule |
| 422 | `travel_rule_address_mismatch` | Tu `to_address` no coincide con la dirección de pago aprobada por la institución receptora — omítela o usa la del intercambio |
| 422 | `travel_rule_rejected` | La institución receptora rechazó la transferencia; verifica los datos del beneficiario |
| 422 | `travel_rule_pending` | La institución receptora aún no resuelve el intercambio; reintenta con la **misma** clave de idempotencia |
| 422 | `travel_rule_incomplete_approval` | La institución receptora aprobó sin entregar dirección de pago; contacta a soporte |
| 503 | `travel_rule_unavailable` | Intercambio Travel Rule temporalmente no disponible; reintenta con la **misma** clave de idempotencia |

### Qscore

Errores de los endpoints del buró de crédito ([guía](https://docs.cbpayapp.com/es/guias/qscore)).

| HTTP | `error` | Significado |
|---|---|---|
| 400 | `purpose_required` | Falta `purpose` al crear un informe — la ley de protección de datos exige declararlo (`credit_evaluation`, `tenant_screening`, `hiring`, `supplier_onboarding` u `other`) |
| 400 | `invalid_purpose` | El `purpose` no es uno de los valores permitidos (`credit_evaluation`, `tenant_screening`, `hiring`, `supplier_onboarding`, `other`) — corrige el valor. `self_access` se rechaza aquí: tu propio informe solo va por `POST /v1/qscore/my-report` |
| 400 | `invalid_doc_id` | El `doc_id` no es válido para el `country` indicado (ej. dígito verificador de RUT incorrecto en Chile) — corrige el formato del documento |
| 400 | `invalid_subject_type` | `subject_type` no es `person`/`company` y no se pudo inferir del documento — envíalo explícito |
| 400 | `invalid_tax_id` | El `tax_id` verificado de la cuenta no es válido para su país (informe self) — contacta a soporte para corregir tus datos verificados |
| 403 | `kyc_required` | Generar tu propio informe exige un KYC/KYB aprobado — completa primero la verificación de identidad |
| 403 | `report_required` | Activar el monitoreo exige un informe comprado de ese sujeto — compra uno primero ([guía](https://docs.cbpayapp.com/es/guias/qscore)); por privacidad, un sujeto inexistente recibe esta misma respuesta |
| 404 | `no_score` | El sujeto aún no tiene un score calculado — compra un informe primero |
| 404 | `pdf_not_ready` | El PDF del informe aún no está disponible — consulta el detalle hasta `status=ready` (el webhook `risk_report_ready` te avisa) |
| 409 | `no_tax_id` | La cuenta verificada no tiene `tax_id` registrado, así que el informe self no puede resolver su sujeto — completa primero tus datos verificados |
| 409 | `identity_mismatch` | El `tax_id` de la cuenta no calza con el documento de identidad verificado (informe self) — contacta a soporte; tus datos verificados deben ser consistentes |
| 422 | `unsupported_country` | Este flujo de fraude/identidad de Qscore no está disponible para el país seleccionado — usa un país compatible o contacta a soporte |
| 503 | `recovery_pending` | El informe de fraude todavía se está finalizando — consulta el informe con las mismas credenciales y reintenta el PDF cuando llegue a `ready` |
| 400 | `no_valid_items` | Todas las filas del lote fueron rechazadas (`invalid_doc_id` / `duplicate_in_batch`) y no se creó ningún lote — valida el archivo localmente (cada `doc_id` debe pasar el dígito verificador del país y ser único) y reenvía con una clave de idempotencia **nueva** |
| 400 | `too_many_items` | Un lote acepta a lo más 5.000 sujetos — parte la cartera en varios lotes, cada uno con su propia clave de idempotencia |
| 409 | `already_decided` | El link de consentimiento ya fue decidido (`granted`, `revoked` o `expired`) y no puede transicionar de nuevo — crea un link nuevo si necesitas otra autorización |
| 409 | `link_inactive` | La conexión bancaria detrás del consentimiento no está `active` (la sesión del widget expiró o el vínculo se revocó) — el titular debe reconectar desde el mismo link |
| 409 | `holder_mismatch` | El documento verificado por el banco no calza con el `doc_id` del sujeto — una cuenta de OTRO documento jamás otorga el consentimiento; verifica que creaste el link para el documento correcto |
| 409 | `seal_companies_only` | El sello público Qscore es solo para cuentas **empresa** — las cuentas persona no tienen sello ([guía](https://docs.cbpayapp.com/es/guias/qscore-seal)) |
| 409 | `seal_not_eligible` | El Qscore de la cuenta no califica ahora para un sello público (banda A o B con una evaluación de no más de 90 días) — compra un informe fresco ([guía](https://docs.cbpayapp.com/es/guias/qscore)) y, si la banda sigue bajo B, el sello no estará disponible hasta que el score mejore |
| 404 | `no_active_seal` | La cuenta no tiene un sello activo que revocar — activa uno primero con `POST /v1/qscore/my-seal`; un sello revocado queda revocado permanentemente (crea uno nuevo) |

### Firewall transaccional

Errores de la revisión de operaciones retenidas por el firewall transaccional ([guía](https://docs.cbpayapp.com/es/guias/revisiones-operaciones)). La retención en sí **no es un error**: el create responde `202 Accepted` con `status: in_review` y `review_id`.

| HTTP | `error` | Significado |
|---|---|---|
| 400 | `invalid_status` | El filtro `status` no es válido — usa `in_review`, `info_requested`, `released`, `rejected` o `all` |
| 400 | `invalid_range` | Fechas `from`/`to` inválidas — formato `YYYY-MM-DD` (zona horaria de tu organización) |
| 400 | `invalid_name` | Falta el nombre del archivo en el query param `name` (máx. 200 caracteres, sin separadores de ruta) |
| 400 | `empty_file` | El body del archivo llegó vacío |
| 404 | `not_found` | La revisión o el archivo no pertenecen a tu cuenta — por diseño nunca se responde 403 |
| 409 | `not_awaiting_info` | La revisión no está esperando información (ya volvió a `in_review` o tiene decisión final) — consulta su estado actual |
| 413 | `file_too_large` | El archivo supera el límite de 50 MB — comprímelo o divídelo |
| 415 | `unsupported_file_type` | Tipo no permitido — usa PDF, PNG, JPEG, WEBP, TXT, CSV, DOC(X) o XLS(X) con el header `Content-Type` correcto |
| 422 | `file_limit_reached` | La revisión ya tiene 20 archivos |
| 503 | `firewall_unavailable` | No se pudo evaluar la política o persistir la revisión — reintenta con la **misma** clave de idempotencia |
| 503 | `storage_unavailable` | El almacenamiento de archivos no está disponible — reintenta en unos segundos |

### Eventos en tiempo real (SSE)

Códigos de [`GET /v1/events`](https://docs.cbpayapp.com/es/eventos-tiempo-real) y su historial.

| HTTP | `error` | Significado |
|---|---|---|
| 400 | `invalid_event_type` | Un valor de `?types=` no está en el catálogo — el `message` lista los válidos |
| 429 | `too_many_streams` | Se alcanzó el límite de streams simultáneos (por cuenta o por organización) — cierra uno antes de abrir otro |
| 429 | `rate_limited` | Demasiadas aperturas de stream desde esta IP (600 por hora) — la cuota cuenta *intentos*, no conexiones vivas: corta el bucle de reconexión y aplica backoff |
| 500 | `streaming_unsupported` | La conexión no soporta streaming (un proxy intermedio está bufferizando) — quita el buffering o usa webhooks |
| 503 | `stream_unavailable` | No se pudo abrir el stream; reintenta con backoff conservando tu `Last-Event-ID` |

### Firma de mensajes y vinculación de wallets

Códigos de la firma de mensajes con wallets (EIP-191 en EVM, TIP-191 en TRON): firma server-side con wallets segregadas (`POST /v1/segregated-wallets/{id}/signatures`, que emite un comprobante de firma verificable públicamente) y vinculación de wallets externas por desafío (`POST /v1/wallet-links/challenges` → firmas el desafío con tu wallet → `POST /v1/wallet-links/verify`).

| HTTP | `error` | Significado |
|---|---|---|
| 400 | `unsupported_chain` | La `chain` debe ser `tron` o `eth` |
| 400 | `invalid_statement` | El `statement` supera los 280 caracteres — acórtalo (ojo: el sobre firmado acepta máximo 140) |
| 409 | `proof_not_signable` | El comprobante ya no está en un estado firmable (ya firmado, expirado o cancelado) — solicita uno nuevo |
| 409 | `custody_transferred` | La custodia de la wallet fue transferida al cliente, así que la firma server-side ya no es posible — firma con tu propia clave |
| 409 | `challenge_consumed` | Este desafío ya fue usado o ya no es válido — solicita uno nuevo |
| 410 | `challenge_expired` | Este desafío expiró — solicita uno nuevo y fírmalo dentro de su ventana de validez |
| 422 | `signature_mismatch` | La firma no corresponde a la dirección del desafío — firma el mensaje exacto del desafío con la wallet que estás vinculando |
| 422 | `sign_rejected` | El firmante rechazó la solicitud — el `message` trae la razón saneada. Un `statement` de 141–280 caracteres también cae aquí (el sobre acepta máximo 140) |

### Servicio (5xx)

| HTTP | `error` | Significado |
|---|---|---|
| 500 | `internal_error` | Error inesperado; reintenta con la misma clave de idempotencia |
| 500 | `fee_config_invalid` | La configuración de comisiones de la cuenta es inválida; contacta al soporte (la operación no se ejecutó) |
| 502 | `rates_unavailable` | Tasas FX temporalmente no disponibles |
| 502 | `core_unavailable` | Procesador temporalmente no disponible |
| 502 | `core_invalid_response` | El procesador devolvió una respuesta inesperada; reintenta con la **misma** clave de idempotencia |
| 502 | `compliance_unavailable` | Screening AML temporalmente no disponible |
| 503 | `verifications_unavailable` | Verificación de identidad temporalmente no disponible |
| 503 | `org_credential_missing` | Servicio en configuración; contacta al soporte de CBPay |
| 503 | `withdrawals_unavailable` | Retiros on-chain no habilitados para el corredor |
| 503 | `pricing_unavailable` | Precio de ejecución de BTC/GOLD no disponible o desactualizado; reintenta más tarde o liquida en USDT/USDC |
| 503 | `channel_unavailable` | El canal de payout está temporalmente no disponible; reintenta más tarde con la **misma** clave de idempotencia |
| 503 | `webhook_processing_pending` | Un evento webhook entrante ya está siendo procesado; reintenta la misma entrega después de un backoff corto y no crees una operación nueva |
| 503 | `export_unavailable` | El export de llaves privadas de wallets segregadas no está habilitado en este entorno |

## Cómo manejarlos

- **4xx de validación**: corrige el request. No reintentes igual.
- **402**: fondea la cuenta y reintenta (clave de idempotencia nueva solo si
  la operación nunca se creó).
- **5xx / timeouts**: reintenta con **la misma** clave de idempotencia; la
  operación nunca se duplicará.

## Qscore fraude e Index

| HTTP | `code` | Significado y solución |
|---:|---|---|
| 400 | `invalid_period` | El período del Index no es `YYYY-Q1` a `YYYY-Q4` — usa un trimestre cerrado |
| 429 | `too_many_attempts` | La verificación pública de fraude está rate-limited — espera y reintenta |
| 502 | `generation_failed` | Falló la generación después del cargo — el fee se reembolsa; usa una nueva idempotency key |

## Ciclo de vida del corredor

| HTTP | Código | Significado y solución |
|---|---|---|
| 409 | `corridor_disabled` | El corredor seleccionado está deshabilitado administrativamente. Usa otro método habilitado o contacta al operador de la organización. |

## Banking creation recovery errors

| Code | HTTP | Meaning and action |
|---|---:|---|
| `idempotency_key_mismatch` | 400 | Header/body keys differ or the same key is reused with a different request hash. Correct the request or use a new key. |
| `idempotency_conflict` | 409 | The same key is already claimed with a conflicting payload. Do not resend with a new payload. |
| `idempotency_failed` | 409 | The claim is terminally failed. Start a new operation with a new key after reviewing the failure. |
| `claim_not_pending` | 409 | The requested human recovery is no longer pending. Read the claim and use the terminal result. |
| `claim_customer_owned_elsewhere` | 409 | The provider customer is already linked to another account. Stop and investigate ownership. |
| `banking_customer_creation_in_progress` | 409 | A lock is held by another banking operation. Retry the read/recovery flow later. |
| `banking_recovery_pending` | 503 | The result or refund remains ambiguous. Do not originate a second provider request; use the recovery endpoint. |
| `banking_invalid_response` | 422 | Provider account ownership did not match the claimed customer's `ProviderID`. |

## Errores de recuperación de creaciones banking

| Código | HTTP | Significado y acción |
|---|---:|---|
| `claim_identity_mismatch` | 422 | La identidad del cliente del proveedor no coincide con la solicitud banking original. Detén la recuperación y revisa el claim. |
| `claim_not_pending` | 409 | El claim ya no está pendiente. Lee el resultado terminal en vez de repetir la recuperación. |
| `claim_customer_owned_elsewhere` | 409 | El cliente del proveedor pertenece a otra cuenta. Detén el proceso y revisa la titularidad. |
| `banking_recovery_pending` | 503 | El resultado del proveedor sigue ambiguo. Usa la ruta administrativa; no origines otra creación. |
