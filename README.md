# ragcooking.info — el recetario del RAG 🍳

Sitio web en español donde cualquier persona que quiera construir un RAG puede:

1. **Aprender** cada pieza del pipeline en la [biblioteca](src/pages/biblioteca.astro) — 18 fases, piezas con pros/contras, conjuntos (frameworks) explicados, y un [diccionario](src/data/catalogo.json) donde nada se queda fuera por vocabulario.
2. **Cocinar su RAG** en el [constructor](src/pages/constructor.astro): eliges fases, sueltas piezas, y los frameworks funcionan como **conjuntos de bloques** — se anclan, completan lo que necesitan por arriba y por abajo, y se expanden para no perder trazabilidad. Validación en vivo, guardado en el navegador y export/import en JSON.

> El 80% del éxito de un RAG ocurre antes del prompt.

## Cómo funciona por dentro

**Todo es dato, nada es código.** El catálogo completo vive en [`src/data/catalogo.json`](src/data/catalogo.json):
fases, piezas atómicas, conjuntos con variantes y átomos de fase, modelos de embedding con licencia/idiomas/maxTokens,
almacenes con diseñador de modelo de datos, plantillas y diccionario. Actualizando el JSON se actualiza todo el sitio.

- **Astro 7 + TypeScript** — la biblioteca es estática (SEO); el editor es un módulo TS con drag & drop nativo.
- **Validación por cobertura**: fases obligatorias (error), recomendadas (aviso), píldora ≤ maxTokens del embedding, embedding externo requerido…
- **Estética "recetario técnico"**: papel crema, tinta, especias (CSS artesanal en [`src/styles/global.css`](src/styles/global.css)).

## Comandos

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/
npm run check      # diagnóstico de tipos (astro check)
node test-editor.mjs   # smoke test del editor contra dist (tras build)
node test-prototype.js # tests del prototipo Hito 0 (255 checks)
```

## Estructura

```
src/
  data/catalogo.json      # fuente única de verdad (el "mega-JSON")
  data/catalogo.ts        # tipos + re-export
  scripts/editor.ts       # el constructor ("Cocina tu RAG")
  pages/                  # home, biblioteca/[fase], diccionario, constructor
  styles/global.css       # sistema de diseño
prototype/                # prototipo Hito 0 (congelado, referencia)
.github/workflows/        # CI de despliegue a GitHub Pages
ROADMAP.md                # decisiones e hitos del proyecto
```

## Contribuir al catálogo

Añadir un framework o BD = añadir un `grupo` en `catalogo.json` con sus `variantes` (lista de átomos de fase) y
`requisitos` (lo que necesita por arriba y por abajo, con piezas por defecto). Lo común y la tendencia de mercado
primero; lo propio se ofrece, no se impone.

---

Por Javier Frauca · [El origen del conocimiento](https://github.com/JavierFrauca/el-origen-del-conocimiento) · ragcooking.info
