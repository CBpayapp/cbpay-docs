---
title: "Subsanación KYC/KYB"
description: "Continúa el expediente vigente cuando compliance solicita cambios"
slug: es/guides/kyc-remediation
lang: es
source_url: https://docs.cbpayapp.com/es/guides/kyc-remediation
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

## Continúa el expediente vigente

Tu cuenta tiene un único **expediente de verificación vigente**. Un registro
`rejected` posterior no anula un expediente que todavía permite subsanar. Si
ya existe una solicitud en curso, `POST /v1/me/verification/link` responde
`409 self_verification_in_progress` sin entregar un link nuevo:

```json
{
  "error": {
    "code": "self_verification_in_progress",
    "message": "a verification is already in progress"
  }
}
```

Consulta `GET /v1/me/verification` y vuelve a abrir el `link.url` existente.
No crees un segundo expediente ni cambies la clave de idempotencia.

Si un link subsanable vence mientras su submission sigue en
`changes_requested` o `more_info_required`, al abrirlo se reabre
automáticamente por 90 días más. Su estado queda en `opened` y la respuesta
reporta `changes_requested` con `next_step: resubmit`. Los links terminales o
revocados permanecen cerrados.

## Resubmisión en el mismo expediente

Mientras se pueda subsanar, la submission vigente expone:

```json
{
  "submission_id": "sub_123",
  "status": "changes_requested",
  "pending_documents": ["proofOfResidence"],
  "documents_received": ["identity"],
  "changes_requested_comments": "Sube un comprobante de domicilio legible.",
  "documents_gate": { "ok": false, "total": 2, "matched": 1 }
}
```

Sube cada elemento de `pending_documents` en el wizard existente. La
resubmisión ocurre **en el mismo expediente**: se conserva el
`submission_id` y no se crea otra submission. Al aceptar el último documento
exigido, el caso vuelve automáticamente a `pending_review` y el portal muestra
**Esperando aprobación**.

Para un UBO o director invitado en `/on/ubo/`, si falta la declaración jurada,
la tarjeta de revisión muestra **Falta tu firma en la declaración jurada**.
El UBO puede firmarla inline; basta con firmar y el caso mantiene su lugar en
revisión.

La pantalla de link vencido es distinguible, explica que tu avance quedó
guardado y solicita pedir un link nuevo.

```mermaid
flowchart LR
  A["changes_requested"] --> B["Subir pending_documents"]
  B --> C["Mismo submission_id"]
  C --> D["pending_review"]
  D --> E["Esperando aprobación"]
```

#### ¿Por qué recibí un 409?
    Ya existe un expediente vigente. Consulta la verificación y reutiliza su
    link abierto.
#### ¿La resubmisión crea otra revisión?
    No. Se actualiza la submission existente y vuelve a revisión cuando la
    evidencia exigida está completa.
Consulta el [catálogo de errores](https://docs.cbpayapp.com/es/errors) para los códigos accionables.
