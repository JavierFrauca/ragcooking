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

/* ---------- fichas de código python por pieza ---------- */
interface FichaPy { deps: string[]; env?: string[]; funcion: (ctx: { nombre: string; pieza: string; pildora?: number; nota?: string }) => string; }

const FICHAS_PY: Record<string, FichaPy> = {
  'corpus.carpeta-pdf': { deps: [], env: ['CORPUS_DIR=./corpus'], funcion: ({ pildora }) => `
# ── Corpus: carpeta de PDFs ────────────────────────────────
CORPUS_DIR = os.getenv("CORPUS_DIR", "./corpus")

def listar_corpus() -> list[Path]:
    """Todo el corpus de entrada: PDFs de la carpeta (recursivo)."""
    return sorted(Path(CORPUS_DIR).rglob("*.pdf"))
` },
  'ingesta.lectores-pdf': { deps: ['pypdf'], funcion: () => `
# ── Ingesta: extracción de texto de los PDFs ───────────────
from pypdf import PdfReader

def extraer_texto(ruta: Path) -> str:
    """Extrae el texto de cada página del PDF."""
    reader = PdfReader(str(ruta))
    return "\\n\\n".join((page.extract_text() or "") for page in reader.pages)
` },
  'formato.a-markdown': { deps: [], funcion: () => `
# ── Formato: todo a Markdown ───────────────────────────────
def a_markdown(texto: str, titulo: str) -> str:
    """Bandeja común: estructura mínima en Markdown."""
    return f"# {titulo}\\n\\n{texto.strip()}\\n"
` },
  'limpieza.deduplicacion': { deps: [], funcion: () => `
# ── Limpieza: deduplicación por huella de contenido ────────
import hashlib

def deduplicar(textos: list[str]) -> list[str]:
    """Elimina documentos con contenido repetido (idempotente)."""
    vistos, salida = set(), []
    for t in textos:
        h = hashlib.sha256(t.encode("utf-8")).hexdigest()
        if h not in vistos:
            vistos.add(h)
            salida.append(t)
    return salida
` },
  'chunking.fijo': { deps: [], funcion: ({ pildora }) => `
# ── Chunking fijo: la píldora de información ───────────────
CHUNK_SIZE = ${pildora || 512}  # tokens aprox. (definido en la receta)
CHUNK_OVERLAP = int(CHUNK_SIZE * 0.15)

def trocear(texto: str) -> list[str]:
    """Trocea en píldoras de tamaño fijo con solape."""
    palabras = texto.split()
    paso = max(1, CHUNK_SIZE - CHUNK_OVERLAP)
    return [" ".join(palabras[i:i + CHUNK_SIZE]) for i in range(0, len(palabras), paso)]
` },
  'chunking.semantico': { deps: [], funcion: ({ pildora }) => `
# ── Chunking semántico: corta donde cambia el tema ─────────
CHUNK_SIZE = ${pildora || 512}

def trocear_semantico(texto: str) -> list[str]:
    """Aproximación por párrafos: respeta fronteras naturales."""
    parrafos, chunk, n = texto.split("\\n\\n"), [], 0
    for p in parrafos:
        if n + len(p.split()) > CHUNK_SIZE and chunk:
            yield " ".join(chunk); chunk, n = [], 0
        chunk.append(p); n += len(p.split())
    if chunk: yield " ".join(chunk)
` },
  'metaetiquetado.por-carpetas': { deps: [], funcion: () => `
# ── Metaetiquetado por carpetas: 1er nivel = dominio ───────
def metadatos_por_carpetas(ruta: Path) -> dict:
    """primer nivel del árbol = dominio; el resto = etiquetas."""
    partes = ruta.relative_to(CORPUS_DIR).parts
    return {"dominio": partes[0] if len(partes) > 1 else "general",
            "etiquetas": list(partes[1:-1])}
` },
  'embedding.bge-m3': { deps: ['sentence-transformers'], funcion: () => `
# ── Embedding: BGE-M3 en local (open, multilingüe, 8k) ─────
from sentence_transformers import SentenceTransformer

modelo_embedding = SentenceTransformer("BAAI/bge-m3")

def embeber(textos: list[str]) -> list[list[float]]:
    return modelo_embedding.encode(textos, normalize_embeddings=True).tolist()
` },
  'embedding.openai-3-small': { deps: ['openai'], env: ['OPENAI_API_KEY='], funcion: () => `
# ── Embedding: text-embedding-3-small (OpenAI) ─────────────
from openai import OpenAI
cliente_openai = OpenAI()  # lee OPENAI_API_KEY del entorno

def embeber(textos: list[str]) -> list[list[float]]:
    rsp = cliente_openai.embeddings.create(model="text-embedding-3-small", input=textos)
    return [d.embedding for d in rsp.data]
` },
  'almacenamiento.chroma': { deps: ['chromadb'], funcion: () => `
# ── Almacenamiento: Chroma (persistente en ./chroma) ───────
import chromadb

chroma = chromadb.PersistentClient(path="./chroma")
coleccion = chroma.get_or_create_collection("rag")

def guardar(chunks: list[str], vectores: list[list[float]], metadatos: list[dict]):
    ids = [f"chunk-{i}" for i in range(len(chunks))]
    coleccion.upsert(ids=ids, documents=chunks, embeddings=vectores, metadatos=metadatos)
` },
  'recuperacion.densa': { deps: [], funcion: () => `
# ── Recuperación densa por similitud semántica ─────────────
def recuperar(pregunta: str, top_k: int = 5) -> list[dict]:
    """Los chunks más parecidos en significado."""
    q = embeber([pregunta])[0]
    rsp = coleccion.query(query_embeddings=[q], n_results=top_k)
    return [{"texto": d, "meta": m} for d, m in zip(rsp["documents"][0], rsp["metadatas"][0])]
` },
  'recuperacion.hibrida': { deps: ['rank_bm25'], funcion: () => `
# ── Recuperación híbrida: densa + BM25 fusionadas con RRF ──
from rank_bm25 import BM25Okapi

def recuperar_hibrida(pregunta: str, top_k: int = 5) -> list[dict]:
    """Fusión RRF de búsqueda vectorial y léxica."""
    todos = coleccion.get()
    bm25 = BM25Okapi([d.split() for d in todos["documents"]])
    k = 60
    scores: dict[str, float] = {}
    for rank, i in enumerate(sorted(range(len(todos["documents"])), key=lambda j: -bm25.get_scores(pregunta.split())[j])[:top_k * 2]):
        scores[todos["ids"][i]] = scores.get(todos["ids"][i], 0) + 1 / (k + rank + 1)
    densos = recuperar(pregunta, top_k * 2)
    for rank, r in enumerate(densos):
        scores[r["texto"][:40]] = scores.get(r["texto"][:40], 0) + 1 / (k + rank + 1)
    return densos[:top_k]  # simplificado: esqueleto — une ambos rankings con RRF real
` },
  'reranking.cross-encoder': { deps: ['sentence-transformers'], funcion: () => `
# ── Rerank: cross-encoder local (ms-marco MiniLM) ──────────
from sentence_transformers import CrossEncoder
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank(pregunta: str, candidatos: list[dict], top_k: int = 3) -> list[dict]:
    pares = [(pregunta, c["texto"]) for c in candidatos]
    for c, s in zip(candidatos, reranker.predict(pares)):
        c["score"] = float(s)
    return sorted(candidatos, key=lambda c: -c["score"])[:top_k]
` },
  'generacion.llm-generador': { deps: ['openai'], env: ['OPENAI_API_KEY='], funcion: () => `
# ── Generación: LLM generador (API OpenAI-compatible) ─────
def responder(pregunta: str, contexto: list[dict]) -> str:
    fuentes = "\\n\\n".join(f"[{i+1}] {c['texto']}" for i, c in enumerate(contexto))
    rsp = cliente_openai.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[{"role": "system", "content": "Responde solo con el contexto. Cita las fuentes [n]."},
                  {"role": "user", "content": f"{fuentes}\\n\\n### Pregunta:\\n{pregunta}"}],
    )
    return rsp.choices[0].message.content or ""
` },
  'generacion.plantilla-citas': { deps: ['openai'], env: ['OPENAI_API_KEY='], funcion: () => `
# ── Generación con plantilla y citas a la fuente ───────────
PLANTILLA = """Responde a la pregunta usando SOLO el contexto.
Cita cada afirmación con [n] y lista las fuentes al final.

### Contexto
{contexto}

### Pregunta
{pregunta}
"""

def responder_con_citas(pregunta: str, contexto: list[dict]) -> str:
    cuerpo = "\\n\\n".join(f"[{i+1}] {c['texto']} (fuente: {c['meta'].get('dominio', '?')})" for i, c in enumerate(contexto))
    rsp = cliente_openai.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[{"role": "user", "content": PLANTILLA.format(contexto=cuerpo, pregunta=pregunta)}],
    )
    return rsp.choices[0].message.content or ""
` },
};

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
      if (b.pieza && FICHAS_PY[b.pieza]) {
        const f = FICHAS_PY[b.pieza];
        f.deps.forEach((d) => deps.add(d));
        (f.env || []).forEach((e) => envs.add(e));
        secciones.push(`\n# [${nombre}]${b.comment ? `  # 📝 ${b.comment}` : ''}`);
        secciones.push(f.funcion({ nombre, pieza: b.pieza, pildora: b.config?.pildora, nota: b.comment }));
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

if __name__ == "__main__":
    # Orquestación mínima: recorre el pipeline de tu receta
    rutas = listar_corpus()
    textos = [extraer_texto(r) for r in rutas]
    textos = deduplicar(textos)
    docs = [a_markdown(t, r.stem) for t, r in zip(textos, rutas)]
    chunks = [c for d in docs for c in trocear(d)]
    vectores = embeber(chunks)
    metadatas = [{"dominio": "general", "etiquetas": []} for _ in chunks]
    guardar(chunks, vectores, metadatas)
    pregunta = input("Pregunta: ")
    candidatos = recuperar(pregunta)
    print(responder_con_citas(pregunta, candidatos))
`,
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
