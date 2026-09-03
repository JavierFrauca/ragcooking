# ROADMAP — ragcooking.info

> Sitio web en español donde cualquier persona que quiera construir un RAG puede **aprender cada pieza del pipeline con ejemplos** y **componer visualmente su propia arquitectura** en un editor por fases, con validación, guardado en el navegador y export/import JSON.

**Fecha:** 2026-09-03 (rev. 4) · **Estado:** Hito 0 ✓ · Hito 1 ✓ · Hito 2 ✓ (editor v1) → **en curso: Hito 3 (pulido) y Hito 4 (contenido)**

---

## 1. Visión

Dos corazones enlazados en ambos sentidos:

1. **La Biblioteca** — cada fase tiene su página (generada desde el catálogo) y cada pieza/fase su ficha con "cómo elegir", pros/contras y ejemplos.
2. **El Constructor ("Cocina tu RAG", variante B)** — eliges **qué fases** quieres, sueltas piezas sobre sus carriles, y los **frameworks son conjuntos de bloques**: se anclan, cubren sus fases con bloques preconfigurados y se expanden/colapsan sin perder trazabilidad.

**Didáctica radical:** todo término técnico enlaza al **Diccionario** (frameworks, BDs, modelos de embedding incluidos). Nadie se queda fuera por vocabulario.

**Principio rector — todo es dato, nada es código:** el catálogo entero vive en `src/data/catalogo.json` (el "mega-JSON"). Actualizándolo se actualizan biblioteca, diccionario, editor, validación y plantillas.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Idioma | Español, terminología técnica en inglés enlazada al diccionario. |
| Contenido | Original; libro y posts de LinkedIn son inspiración. |
| Prioridades | **Lo más común y la tendencia de mercado primero** (por defecto lo más adecuado); ragkit/nucleus se ofrecen (★, al final), no se imponen. |
| Flujo del editor | **Framework-first**: "Nueva receta" → eliges framework → se activa su fase ancla y las fases de su variante, y se **completan los requisitos por encima y por debajo** (piezas por defecto de mercado, declaradas como dato en `requisitos`). El modo custom a mano se conserva. |
| Colisiones | Al soltar un conjunto sobre fases con piezas sueltas: se ofrece sustituir (ACEPTAR) o convivir (CANCELAR). |
| Editor | **Variante B** aprobada; **fases seleccionables** (desactivar una obligatoria = error didáctico). |
| Frameworks/BDs multi-fase | **Conjuntos de bloques (grupos)**: fase ancla + variantes con lista de **átomos de fase** (referencia a pieza o bloque propio). Expandibles/colapsables; cambio de variante preserva comentarios y config por fase. `embeddingExterno: true` avisa si falta modelo. |
| Embeddings | Piezas con propiedades: `licencia` (open/propietario), `idiomas` (multilingüe/solo inglés), `maxTokens`, `dimensiones`, `proveedor`. La **píldora** (chunk) debe caber en `maxTokens` (regla del editor). |
| Almacenes | Piezas/grupos con `modeloDatos: true` ofrecen el **diseñador de modelo de datos**: campo resumen (doble campo: embedding sobre resumen vs chunk), dominio, etiquetas, vigencia, nivel de acceso, tenant, linaje. |
| Piezas custom | Sí: solo descripción libre, sin validación. |
| Plantillas | Arranque = RAG mínimo (one-shot, solo fases obligatorias); galería por objetivo. |
| JSON | `ragcooking.architecture` **v2**: fasesActivas + bloques (pieza/custom/grupo+variante, comment, config con píldora y modeloDatos). Import tolerante. |
| Catálogo | **catalogo.json** como fuente única (58 piezas, 7 grupos, 10 embeddings, 18 fases, 3 plantillas, ~60 términos). |
| Stack | Astro 7 + TypeScript (vanilla en el editor: DnD nativo), CSS artesanal "recetario técnico" aprobado. Deploy GitHub Pages (CI listo). |
| Dominio | ragcooking.info → GitHub Pages. |

## 3. Modelo de datos (catalogo.json)

- **estaciones** (5) → **fases** (18, con nivel obligatoria/recomendada/opcional).
- **piezas** atómicas: `id, fase, nombre, icon, level, origin (comunidad/comercial/propio), tagline, pros, cons` + propiedades especiales (`licencia/idiomas/maxTokens/dimensiones` en embeddings, `pildora` en chunking, `modeloDatos`/`integrates` en almacenes).
- **grupos** (conjuntos): `faseAncla, variantes[{id, nombre, atomos[{fase, pieza? | propio{nombre,desc}}]}], embeddingExterno?, modeloDatos?, requisitos[{fase, pieza}]` (lo que el conjunto necesita por arriba y por abajo, con pieza por defecto de mercado). Orden de mercado primero, propios (★) al final. Hoy: LlamaIndex, LangChain/LangGraph, Haystack, Azure AI Search, Elasticsearch, ragkit ★, nucleus ★. Regla clave: **ragkit (multitenant) y nucleus son incompatibles** ( en el JSON): el editor inhibe la colocación y el validador da error; plantillas separadas conjunto-ragkit y conjunto-nucleus.
- **modeloDatos**: definición de los campos del diseñador (resumen/doble campo, dominio, etiquetas, vigencia, nivelAcceso, tenant, linaje).
- **plantillas** (3): rag-minimo (arranque), empresarial-segura, conjunto-ragkit / conjunto-nucleus (objetivos distintos: multitenant vs servicio).
- **diccionario**: ~60 términos incluyendo todos los frameworks, BDs y modelos de embedding del catálogo.

## 4. Validación del editor

| Regla | Tipo |
|---|---|
| Fase obligatoria desactivada | Error didáctico |
| Fase obligatoria activa sin cobertura | Error |
| Fase recomendada activa sin cobertura | Aviso (con mensajes de la voz del proyecto) |
| Píldora > maxTokens del embedding | Error ("la píldora no cabe") |
| Grupo con embeddingExterno y fase embedding vacía | Aviso |
| Integración aprovechable (Weaviate/Pinecone + embedding dedicado) | Info |
| Piezas custom | Exentas |

## 5. Hitos

- **Hito 0 ✓** — Repo, Astro+TS, CI Pages, estética aprobada, prototipo (conservado en `/prototype`).
- **Hito 1 ✓ (v1)** — Catálogo JSON fuente única; biblioteca con 18 páginas de fase generadas; diccionario completo.
- **Hito 2 ✓ (v1)** — Editor real: selector de fases, paleta, DnD, grupos expandibles con variantes, diseñador de modelo de datos, píldora↔embedding, comentarios, custom, localStorage, export/import v2, plantillas.
- **Hito 3 — Pulido** — Responsive total, accesibilidad del DnD, onboarding animado en el editor, fichas de pieza/grupo como páginas MDX con ejemplos de código.
- **Hito 4 — Contenido (continuo)** — Fichas ricas por pieza/grupo (pasos + código), recetas de ejemplo destacadas, re-escritura de posts de LinkedIn, cuñas de ragkit/nucleus pulidas.
- **Hito 5 — Extras** — Compartir receta por URL, esqueleto de código desde el JSON, comparador, i18n EN, modo oscuro, asistente paso a paso.

## 6. Tests

- `test-prototype.js` — 255 checks del prototipo (hito 0, congelado).
- `test-editor.mjs` — smoke test de runtime del editor real contra el bundle de `dist`.

## 7. Pendientes de conversación

- [ ] Contenido de las fichas ricas (Hito 4): ¿prioridad ragkit/nucleus o frameworks de mercado primero?
- [ ] Recetas de lanzamiento a destacar en la home.
- [ ] Publicación: crear el repo remoto (GitHub) y activar Pages con el dominio ragcooking.info.
