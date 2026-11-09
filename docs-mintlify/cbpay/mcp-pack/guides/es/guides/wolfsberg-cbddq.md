---
title: "Cuestionario Wolfsberg CBDDQ v1.4"
description: "Completa y adjunta el cuestionario Wolfsberg durante el onboarding de empresas"
slug: es/guides/wolfsberg-cbddq
lang: es
source_url: https://docs.cbpayapp.com/es/guides/wolfsberg-cbddq
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

## Completar el cuestionario

El onboarding de empresas incluye el cuestionario Wolfsberg CBDDQ v1.4:
15 secciones, preguntas condicionales y una declaración final. Solo muestra
las preguntas activadas por tus respuestas y el progreso cuenta las visibles.

El formulario precarga datos coincidentes del perfil de la empresa y guarda
un borrador local mientras avanzas. Revisa cada valor precargado: es una
sugerencia, no una decisión de compliance.

Selecciona **Generar PDF** para crear el archivo brandeado
`wolfsberg-cbddq-v1.4-*.pdf`. El PDF terminado se adjunta a la submission KYB
nativa con categoría `wolfsberg`. Si falla la carga, reintenta desde el
borrador sin responder de nuevo.

```mermaid
flowchart LR
  A["Precarga"] --> B["Responder preguntas visibles"]
  B --> C["Guardar borrador"]
  C --> D["Generar PDF brandeado"]
  D --> E["Adjuntar como wolfsberg"]
```

#### ¿Puedo enviar el cuestionario incompleto?
    No. Completa todas las preguntas visibles obligatorias y la declaración
    final.
#### ¿Puedo editarlo después de generar el PDF?
    Sí. Genera y sube la última versión; el expediente sigue siendo el mismo.
#### ¿Reemplaza los demás antecedentes KYB?
    No. Es una categoría de evidencia solicitada.
Consulta el [catálogo de errores](https://docs.cbpayapp.com/es/errors) si falla la carga del PDF.
