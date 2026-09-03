# ragcooking.info — el recetario del RAG 🍳

Sitio web en español donde cualquier persona que quiera construir un RAG puede:

1. **Aprender** cada pieza del pipeline en la [biblioteca](src/pages/biblioteca.astro) — 18 fases, piezas con pros/contras, conjuntos (frameworks) explicados, y un [diccionario](src/data/catalogo.json) donde nada se queda fuera por vocabulario.
2. **Cocinar su RAG** en el [constructor](src/pages/constructor.astro): eliges fases, sueltas piezas, y los frameworks funcionan como **conjuntos de bloques** — se anclan, completan lo que necesitan por arriba y por abajo, y se expanden para no perder trazabilidad. Validación en vivo, guardado en el navegador y export/import en JSON.
3. **Descargar el esqueleto de código** — Python (camino libre) o C# · .NET (vía ragkit), con las piezas sin ficha cocinadas por IA en un clic.

> El 80% del éxito de un RAG ocurre antes del prompt.

## Cómo funciona por dentro

**Todo es dato, nada es código.** El catálogo completo vive en [`src/data/catalogo.json`](src/data/catalogo.json):
fases, piezas atómicas, conjuntos con variantes y átomos de fase, modelos de embedding con licencia/idiomas/maxTokens,
almacenes con modelo de datos por defecto y diccionario; las recetas base en `src/data/templates/` (un JSON cada una, se validan en build). Actualizando estos ficheros se actualiza todo el sitio.

- **Astro 7 + TypeScript** — la biblioteca es estática (SEO); el editor es un módulo TS con drag & drop nativo.
- **Validación por cobertura**: fases obligatorias (error), recomendadas (aviso), píldora ≤ maxTokens del embedding, embedding externo requerido…
- **Estética "recetario técnico"**: papel crema, tinta, especias (CSS artesanal en [`src/styles/global.css`](src/styles/global.css)).
- **Cocinador IA**: proxy Cloudflare Worker con la clave protegida en su entorno; el usuario solo pulsa "Cocinar".

## Comandos

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/
npm run check      # diagnóstico de tipos (astro check)
node test-editor.mjs   # smoke test del editor contra dist (tras build)
node test-prototype.cjs # tests del prototipo Hito 0 (255 checks)
```

## Publicación

### Sitio principal (GitHub Pages)

El CI hace todo: push a `main` → typecheck + tests + build + deploy.
Solo tienes que activar Pages en Settings → Pages → Source: GitHub Actions.

```bash
git remote add origin https://github.com/TU-USUARIO/ragcooking.git
git push -u origin main
```

### Worker del cocinador IA (Cloudflare, una vez)

```bash
cd worker
npm i -g wrangler && wrangler login
wrangler kv namespace create RATE_KV    # copia el ID a wrangler.toml
wrangler secret put GLM_KEY            # pega tu clave de bigmodel.cn
wrangler deploy                        # te da la URL del worker
```

Después actualiza la URL del worker en `astro.config.mjs` → `vite.server.proxy['/api/cook'].target`.

> La clave del LLM **jamás toca git**: vive solo en el entorno del worker.

## Estructura

```
src/
  data/catalogo.json      # fuente única de verdad (el "mega-JSON")
  data/catalogo.ts        # tipos + re-export
  data/templates/         # recetas base (un JSON por receta, validadas en build)
  scripts/editor.ts       # el constructor ("Cocina tu RAG")
  scripts/codegen.ts      # generador de código (Python + .NET + zip)
  scripts/py/             # fichas de código python (un .py por pieza)
  pages/                  # home, biblioteca/[fase], biblioteca/conjunto/[id],
                          # diccionario, constructor, legal
  styles/global.css       # sistema de diseño
worker/                   # Cloudflare Worker (cocinador IA)
prototype/                # prototipo Hito 0 (congelado, referencia)
.github/workflows/        # CI (tests) + deploy (GitHub Pages)
ROADMAP.md                # decisiones e hitos del proyecto
```

## Contribuir al catálogo

- **Añadir un framework o BD** = añadir un `grupo` en `catalogo.json` con sus `variantes` (átomos de fase), `requisitos` y `langs`.
- **Añadir una receta base** = soltar un `.json` en `src/data/templates/`.
- **Añadir cobertura de código** = soltar un `.py` en `src/scripts/py/` (con cabecera `# deps:` y `# env:`).
- Lo común y la tendencia de mercado primero; lo propio se ofrece, no se impone.

---

Por Javier Frauca · [El origen del conocimiento](https://github.com/JavierFrauca/el-origen-del-conocimiento) · ragcooking.info
