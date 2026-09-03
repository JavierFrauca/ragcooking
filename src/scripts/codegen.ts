/* ============================================================
   ragcooking — generador de código (el coder)
   Convierte una receta en un esqueleto de proyecto descargable:
   - Python para el camino libre y frameworks py
   - C#/.NET vía ragkit (API real de github.com/JavierFrauca/Ragkit)
   Las piezas sin ficha generan secciones TODO honestas.
   Todo es dato: las fichas viven en FICHAS_PY / STARTER_RAGKIT.
   ============================================================ */
import type { Receta } from './tipos';
import { piezaById, grupoById, faseById } from '../data/catalogo';

/* ---------- fichas de código python: un fichero .py por pieza en src/scripts/py ----------
   Convención de cabecera: líneas '# deps:' y '# env:' opcionales; el resto es Python puro.
   El token __PILDORA__ se sustituye por el valor de la receta (o 512). */
interface FichaPy { deps: string[]; env: string[]; body: string; }

const _ficherosPy = import.meta.glob('./py/*.py', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const FICHAS_PY: Record<string, FichaPy> = {};
for (const [ruta, raw] of Object.entries(_ficherosPy)) {
  const id = ruta.split('/').pop()!.replace(/\.py$/, '');
  const deps: string[] = []; const env: string[] = [];
  const lineas = raw.split('\n');
  let i = 0;
  for (; i < lineas.length; i++) {
    const l = lineas[i];
    if (l.startsWith('# deps:')) l.replace('# deps:', '').trim().split(/[\s,]+/).filter(Boolean).forEach((d) => deps.push(d));
    else if (l.startsWith('# env:')) l.replace('# env:', '').trim().split(/\s+/).filter(Boolean).forEach((e) => env.push(e));
    else break;
  }
  FICHAS_PY[id] = { deps, env, body: lineas.slice(i).join('\n').trim() };
}

/* ---------- starter .NET: ragkit (API real del repo) ---------- */
const STARTER_RAGKIT = {
  csproj: `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <!-- Ajusta las versiones a las últimas publicadas en NuGet -->
  <ItemGroup>
    <PackageReference Include="RagKit" Version="*" />
    <PackageReference Include="RagKit.Extractors" Version="*" />
    <PackageReference Include="RagKit.Onnx" Version="*" />
  </ItemGroup>
</Project>
`,
  program: (receta: Receta) => `// Esqueleto generado por ragcooking.info — receta: ${receta.name}
// ragkit (MIT): github.com/JavierFrauca/Ragkit — RAG agéntico llave en mano para .NET
using RagKit;

var rutaCorpus = args.Length > 0 ? args[0] : "./corpus";

// 1) Cliente: tier-1 responde, tier-2 clasifica/enruta (API OpenAI-compatible)
var rag = await RagClient.CreateAsync(builder => builder
    .WithOpenAiTier1(apiKey: Environment.GetEnvironmentVariable("OPENAI_API_KEY")!)
    .WithOnnxEmbedder()          // BGE-M3 / E5 en local (se descarga y cachea solo)
    .WithQdrantStore("http://localhost:6333") // o WithPostgresStore(...) / WithSqlServerStore(...) / InMemory
    .WithHybridRetrieval()       // densa + BM25 con fusión RRF, acotada por dominio y etiquetas
);

// 2) Ingesta idempotente de la carpeta (por hash: reingerir no rompe nada)
await foreach (var resultado in rag.IngestFolderAsync(rutaCorpus, recursive: true))
    Console.WriteLine($"[{resultado.Status}] {resultado.Source}");

// 3) Pregunta con citas (antes de que lleguen los tokens en streaming)
Console.Write("Pregunta: ");
if (Console.ReadLine() is { Length: > 0 } pregunta)
{
    var respuesta = await rag.AskAsync(pregunta);
    Console.WriteLine(respuesta.Text);
    foreach (var c in respuesta.Citations)
        Console.WriteLine($"  [{c.Index}] {c.Source}");
}

// Siguientes pasos: rag.EnableLlmRerank(), guardarails, perfiles y el modo
// agéntico AskAgentAsync (13 herramientas) — docs en el repo.
`,
};


/* ---------- cocinado IA: secciones generadas por el usuario con su LLM ---------- */
const COCINADO: Record<string, string> = {};
export const setCocinado = (m: Record<string, string>) => { for (const k of Object.keys(COCINADO)) delete COCINADO[k]; Object.assign(COCINADO, m); };
export const hayCocinado = () => Object.keys(COCINADO).length > 0;

export interface PiezaACocinar { id: string; nombre: string; fase: string; tagline: string; pros: string[]; cons: string[]; }
export function piezasSinFicha(receta: Receta): PiezaACocinar[] {
  return receta.bloques
    .filter((b) => !b.grupoId && !(b.pieza && FICHAS_PY[b.pieza]))
    .map((b) => {
      const p = b.pieza ? piezaById(b.pieza) : undefined;
      const f = faseById(b.fase);
      return { id: b.id, nombre: p ? p.nombre : 'custom', fase: f ? f.nombre : b.fase,
               tagline: p ? p.tagline : (b.custom || ''), pros: p ? p.pros || [] : [], cons: p ? p.cons || [] : [] };
    });
}

/* ---------- utilidades ---------- */
const slug = (s: string) => (s || 'mi-rag').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function lenguajesRecetaCode(receta: Receta): string[] {
  const conGrupos = receta.bloques.some((b) => b.grupoId);
  const sueltas = receta.bloques.some((b) => !b.grupoId);
  const deGrupos = [...new Set(receta.bloques.filter((b) => b.grupoId).map((b) => grupoById(b.grupoId!)).filter((g): g is NonNullable<typeof g> => !!g).flatMap((g) => g.langs || []))];
  if (!conGrupos) return receta.bloques.length ? ['py'] : [];
  return [...new Set([...deGrupos, ...(sueltas ? ['py'] : [])])];
}

export interface LenguajeDisponible { lang: string; label: string; icono: string; pct: number; nota?: string; }
export function lenguajesDisponibles(receta: Receta): LenguajeDisponible[] {
  const langs = lenguajesRecetaCode(receta);
  return langs.map((lang) => {
    const total = receta.bloques.length || 1;
    let cubiertos = 0;
    if (lang === 'py') cubiertos = receta.bloques.filter((b) => b.pieza && FICHAS_PY[b.pieza]).length;
    if (lang === 'dotnet') cubiertos = receta.bloques.filter((b) => b.grupoId === 'grupo.ragkit').length;
    const pct = Math.round((cubiertos / total) * 100);
    return {
      lang, label: lang === 'py' ? 'Python' : 'C# · .NET', icono: lang === 'py' ? '🐍' : '⚙️', pct,
      nota: pct < 100 ? `las piezas sin ficha generan secciones TODO` : 'cobertura completa',
    };
  });
}

/* ---------- generador python ---------- */
function generarPython(receta: Receta): { name: string; content: string }[] {
  const deps = new Set<string>(); const envs = new Set<string>();
  const secciones: string[] = [];
  const orden = [...receta.fasesActivas];
  for (const faseId of orden) {
    const bloques = receta.bloques.filter((b) => b.fase === faseId);
    if (!bloques.length) continue;
    const fase = faseById(faseId);
    secciones.push(`\n# ═══ ${fase ? fase.nombre.toUpperCase() : faseId} ═════════════════════════════`);
    for (const b of bloques) {
      const nombre = b.pieza ? (piezaById(b.pieza)?.nombre || b.pieza) : (b.custom || 'custom').split(' — ')[0];
      if (COCINADO[b.id]) {
        secciones.push(`
# [${nombre}] 🍳 cocinado con IA — revisa antes de usar`);
        secciones.push(COCINADO[b.id]);
      } else if (b.pieza && FICHAS_PY[b.pieza]) {
        const f = FICHAS_PY[b.pieza];
        f.deps.forEach((d) => deps.add(d));
        f.env.forEach((e) => envs.add(e));
        secciones.push(`\n# [${nombre}]${b.comment ? `  # 📝 ${b.comment}` : ''}`);
        secciones.push(f.body.replace(/__PILDORA__/g, String(b.config?.pildora || 512)));
      } else if (b.grupoId) {
        const g = grupoById(b.grupoId);
        secciones.push(`\n# [${nombre}] — conjunto «${g?.nombre}»: en Python se integra vía su librería (ver su documentación).`);
        secciones.push(`# TODO: cablear ${g?.nombre} para la fase ${faseId} (${b.custom || 'átomo del conjunto'}).`);
      } else {
        secciones.push(`\n# [${nombre}] — pieza custom (sin ficha de código aún)`);
        secciones.push(`# TODO: ${b.custom || 'implementar'} — fase ${faseId}.`);
      }
    }
  }
  const pasos = orden.filter((f) => receta.bloques.some((b) => b.fase === f)).map((f) => `- **${faseById(f)?.nombre}**: ${receta.bloques.filter((b) => b.fase === f).map((b) => (b.pieza ? piezaById(b.pieza)?.nombre : 'custom')).join(', ')}`).join('\n');
  const tiene = (pid: string) => receta.bloques.some((b) => b.pieza === pid);
  const mainPy: string[] = ['\n\nif __name__ == "__main__":', '    # Orquestación mínima: recorre el pipeline de tu receta (ajusta a tu caso)'];
  if (tiene('corpus.carpeta-pdf')) mainPy.push('    rutas = listar_corpus()');
  if (tiene('ingesta.lectores-pdf')) mainPy.push('    textos = [extraer_texto(r) for r in rutas]');
  if (tiene('ingesta.scraper')) mainPy.push('    textos = [scrapear(u) for u in paginas_semilla()]');
  if (tiene('limpieza.normalizacion')) mainPy.push('    textos = [normalizar(t) for t in textos]');
  if (tiene('limpieza.deduplicacion')) mainPy.push('    textos = deduplicar(textos)');
  if (tiene('formato.a-markdown')) mainPy.push('    docs = [a_markdown(t, r.stem) for t, r in zip(textos, rutas)]');
  if (tiene('chunking.fijo') || tiene('chunking.semantico')) mainPy.push('    chunks = [c for d in docs for c in trocear(d)]');
  if (tiene('metaetiquetado.por-carpetas')) mainPy.push('    metas = [metadatos_por_carpetas(r) for r in rutas]');
  if (tiene('embedding.bge-m3') || tiene('embedding.openai-3-small')) mainPy.push('    vectores = embeber(chunks)');
  if (tiene('almacenamiento.chroma')) mainPy.push('    guardar(chunks, vectores, metas)');
  if (tiene('almacenamiento.pgvector')) mainPy.push('    init_pgvector(); guardar_pg(chunks, vectores, metas)');
  if (tiene('almacenamiento.qdrant')) mainPy.push('    guardar_qdrant(chunks, vectores, metas)');
  if (tiene('recuperacion.densa')) mainPy.push('    candidatos = recuperar(input("Pregunta: "))');
  if (tiene('reranking.cross-encoder')) mainPy.push('    candidatos = rerank(input("Pregunta: "), candidatos)');
  if (tiene('generacion.plantilla-citas') || tiene('generacion.llm-generador')) mainPy.push('    print(responder_con_citas(input("Pregunta: "), candidatos))');
  const mainCuerpo = mainPy.join('\n') + '\n';
  const files: { name: string; content: string }[] = [];
  files.push({ name: 'README.md', content: `# ${receta.name}

Esqueleto generado por **ragcooking.info** el ${new Date().toISOString().slice(0, 10)} — lenguaje: Python.

## La receta
${pasos}

## Puesta en marcha
\`\`\`bash
python -m venv .venv && . .venv/bin/activate  # (Windows: .venv\\Scripts\\activate)
pip install -r requirements.txt
cp .env.example .env   # y rellena tus claves
python pipeline.py
\`\`\`

> Esqueleto para empezar: las secciones TODO marcan donde falta tu criterio.
` });
  files.push({ name: 'requirements.txt', content: [...deps].sort().map((d) => `${d}>=1` ).join('\n') + '\n' });
  files.push({ name: '.env.example', content: [...envs].sort().join('\n') + '\n' });
  files.push({
    name: 'pipeline.py',
    content: `"""${receta.name} — esqueleto generado por ragcooking.info (Python).

Orden del pipeline según tu receta. Cada sección viene de una pieza del
catálogo; los TODO son tuyos.
"""
import os
from pathlib import Path
${secciones.join('\n')}
${mainCuerpo}`,
  });
  return files;
}

/* ---------- generador dotnet (vía ragkit) ---------- */
function generarDotnet(receta: Receta): { name: string; content: string }[] {
  const pasos = receta.fasesActivas.filter((f) => receta.bloques.some((b) => b.fase === f)).map((f) => `- **${faseById(f)?.nombre}**: ${receta.bloques.filter((b) => b.fase === f).map((b) => (b.pieza ? piezaById(b.pieza)?.nombre : b.grupoId ? 'conjunto ' + (grupoById(b.grupoId)?.nombre || '') : 'custom')).join(', ')}`).join('\n');
  return [
    { name: 'README.md', content: `# ${receta.name}

Esqueleto generado por **ragcooking.info** — lenguaje: C# · .NET vía **ragkit**
(github.com/JavierFrauca/Ragkit, MIT).

## La receta
${pasos}

## Puesta en marcha
\`\`\`bash
export OPENAI_API_KEY=...        # tier-1/tier-2 (o apunta a Ollama compatible)
dotnet restore && dotnet run -- ./corpus
\`\`\`

ragkit cubre ingesta idempotente, clasificación por dominios (tier-2),
chunking por frontera, embeddings ONNX, store (Qdrant/pgvector/SQL Server/
InMemory), híbrida BM25+densa con RRF, rerank y generación con citas.
` },
    { name: 'RagkitStarter.csproj', content: STARTER_RAGKIT.csproj },
    { name: 'Program.cs', content: STARTER_RAGKIT.program(receta) },
  ];
}

export function generarCodigo(receta: Receta, lang: string): { name: string; content: string }[] {
  return lang === 'dotnet' ? generarDotnet(receta) : generarPython(receta);
}

/* ---------- mini-zip (STORE, sin dependencias) ---------- */
const CRC_TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const enc = new TextEncoder();
export function crearZip(files: { name: string; content: string }[]): Blob {
  const datos = files.map((f) => ({ name: enc.encode(f.name), body: enc.encode(f.content) }));
  let total = 0; for (const d of datos) total += 30 + d.name.length + d.body.length + 46 + d.name.length;
  const out = new Uint8Array(total + 22);
  const dv = new DataView(out.buffer);
  let off = 0; const centrales: { name: Uint8Array; crc: number; size: number; off: number }[] = [];
  for (const d of datos) {
    const crc = crc32(d.body);
    dv.setUint32(off, 0x04034b50, true); dv.setUint16(off + 4, 20, true);
    dv.setUint16(off + 8, 0, true); dv.setUint16(off + 10, 0, true); dv.setUint16(off + 12, 0, true);
    dv.setUint32(off + 14, crc, true); dv.setUint32(off + 18, d.body.length, true); dv.setUint32(off + 22, d.body.length, true);
    dv.setUint16(off + 26, d.name.length, true); dv.setUint16(off + 28, 0, true);
    out.set(d.name, off + 30); out.set(d.body, off + 30 + d.name.length);
    centrales.push({ name: d.name, crc, size: d.body.length, off });
    off += 30 + d.name.length + d.body.length;
  }
  const inicioCentral = off;
  for (const c of centrales) {
    dv.setUint32(off, 0x02014b50, true); dv.setUint16(off + 4, 20, true); dv.setUint16(off + 6, 20, true);
    dv.setUint16(off + 10, 0, true); dv.setUint16(off + 12, 0, true); dv.setUint16(off + 14, 0, true);
    dv.setUint32(off + 16, c.crc, true); dv.setUint32(off + 20, c.size, true); dv.setUint32(off + 24, c.size, true);
    dv.setUint16(off + 28, c.name.length, true);
    dv.setUint32(off + 42, c.off, true);
    out.set(c.name, off + 46);
    off += 46 + c.name.length;
  }
  dv.setUint32(off, 0x06054b50, true);
  dv.setUint16(off + 8, centrales.length, true); dv.setUint16(off + 10, centrales.length, true);
  dv.setUint32(off + 12, off - inicioCentral, true); dv.setUint32(off + 16, inicioCentral, true);
  return new Blob([out], { type: 'application/zip' });
}

export const nombreZip = (receta: Receta, lang: string) => `${slug(receta.name)}-${lang}.zip`;
