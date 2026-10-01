/* ============================================================
   ragcooking — generador de código (el coder)
   Convierte una receta en un esqueleto de proyecto descargable:
   - Python para el camino libre y frameworks py
   - C#/.NET vía ragkit (API real de github.com/JavierFrauca/Ragkit) —
     desactivado de momento (ver src/data/lenguajes.ts)
   Las piezas sin ficha generan secciones TODO honestas.
   Todo es dato: las fichas viven en FICHAS_PY / STARTER_RAGKIT.
   ============================================================ */
import type { Receta } from './tipos';
import { piezaById, grupoById, faseById } from '../data/catalogo';
import { LENGUAJES_ACTIVOS } from '../data/lenguajes';

/* ---------- fichas de código python: un fichero .py por pieza en src/scripts/py ----------
   Convención de cabecera: líneas '# deps:' y '# env:' opcionales; el resto es Python puro.
   El token __PILDORA__ se sustituye por el valor de la receta (o 512). */
interface FichaPy { deps: string[]; env: string[]; body: string; }

const _ficherosPy = import.meta.glob('./py/*.py', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

interface FichaPy { deps: string[]; env: string[]; body: string; }

function _fichaDe(raw: string): FichaPy {
  const deps: string[] = []; const env: string[] = [];
  const lineas = raw.split('\n');
  let i = 0;
  for (; i < lineas.length; i++) {
    const l = lineas[i];
    if (l.startsWith('# deps:')) l.replace('# deps:', '').trim().split(/[\s,]+/).filter(Boolean).forEach((d) => deps.push(d));
    else if (l.startsWith('# env:')) l.replace('# env:', '').trim().split(/\s+/).filter(Boolean).forEach((e) => env.push(e));
    else break;
  }
  return { deps, env, body: lineas.slice(i).join('\n').trim() };
}

const FICHAS_PY: Record<string, FichaPy> = {};
for (const [ruta, raw] of Object.entries(_ficherosPy)) FICHAS_PY[ruta.split('/').pop()!.replace(/\.py$/, '')] = _fichaDe(raw);

/* Fichas de conjuntos: grupo.<framework>.py → ejemplo de integración real,
   no un TODO. Las usa generarPython cuando la receta lleva un bloque de conjunto. */
const _ficherosGrupo = import.meta.glob('./py/grupo.*.py', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const FICHAS_GRUPO: Record<string, FichaPy> = {};
for (const [ruta, raw] of Object.entries(_ficherosGrupo)) {
  FICHAS_GRUPO['grupo.' + ruta.split('/').pop()!.replace(/^grupo\./, '').replace(/\.py$/, '')] = _fichaDe(raw);
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
  const todos = !conGrupos ? (receta.bloques.length ? ['py'] : [])
    : [...new Set([...deGrupos, ...(sueltas ? ['py'] : [])])];
  const activos = todos.filter((l) => LENGUAJES_ACTIVOS.includes(l));
  if (!activos.length && receta.bloques.length) return ['py'];
  return activos;
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

/* ---------- andamiaje demo: datos de ejemplo, demo sin claves, puerta y CI ---------- */
const DEMO_CORPUS: { name: string; content: string }[] = [
  { name: 'datos/corpus/01-convenio.md', content: `# Convenio colectivo (extracto de ejemplo)

## Jornada y descansos

La jornada anual de trabajo es de 1.760 horas de effective prestación, distribuidas de lunes a viernes. El descanso entre jornada y jornada será de doce horas como mínimo.

## Vacaciones

El personal disfrutará de 30 días naturales de vacaciones al año. El calendario de vacaciones se fijará de común acuerdo con la representación de las personas trabajadoras, y podrá fraccionarse en dos periodos como máximo.

## Salario base

El salario base por grupo profesional se recoge en la tabla salarial anexa, y se abonará en catorce pagas.
` },
  { name: 'datos/corpus/02-factura.md', content: `# Facturación y garantías (documento de ejemplo)

## Plazo de reclamación

Toda factura podrá reclamarse dentro del plazo de 30 días naturales desde su recepción. Pasado ese plazo de reclamación, la deuda se entenderá conformada y no admitirá impugnación.

## Garantía

Los bienes entregados cuentan con una garantía de tres años desde la entrega, sin perjuicio de la garantía comercial adicional que pudiera ofrecerse.
` },
  { name: 'datos/corpus/03-politica.md', content: `# Política de protección de datos (documento de ejemplo)

## Conservación de los datos

Los datos personales se conservarán durante el tiempo necesario para atender la finalidad que los justificó. La conservación de datos se revisará anualmente, y se procederá a su supresión cuando dejen de ser necesarios.

## Derechos de las personas interesadas

Se atenderán los derechos de acceso, rectificación y supresión en el plazo legal, mediante solicitud dirigida al responsable.
` },
];

const DEMO_DATASET = JSON.stringify({
  nota: 'Consultas firmadas de la DEMO — sustitúyelas por las tuyas cuando lleves tu corpus.',
  consultas: [
    { consulta: 'plazo de reclamación de la factura', debe_citar: '02-factura' },
    { consulta: 'vacaciones del convenio', debe_citar: '01-convenio' },
    { consulta: 'conservación de datos personales', debe_citar: '03-politica' },
  ],
}, null, 2) + '\n';

const DEMO_PY = `"""Demo punta a punta, sin claves: la película del método sobre datos/ de ejemplo.

El embedding de demostración es un hash determinista de las palabras (stdlib,
cero dependencias): no es un modelo real — sirve para ver el pipeline vivo
antes de cablear las piezas de verdad (pipeline.py).
"""
import hashlib
import json
import math
import re
from pathlib import Path

DIM = 256
DATOS = Path(__file__).resolve().parent / "datos"


def vector_de(texto: str) -> list[float]:
    """Hash de palabras a un vector normalizado: el embedding de juguete."""
    v = [0.0] * DIM
    for palabra in re.findall(r"[a-záéíóúüñ0-9]+", texto.lower()):
        h = int(hashlib.md5(palabra.encode("utf-8")).hexdigest(), 16)
        v[h % DIM] += 1.0 + (h % 7) / 7.0
    norma = math.sqrt(sum(x * x for x in v)) or 1.0
    return [round(x / norma, 6) for x in v]


def pildoras_de(texto: str, maximo: int = 700) -> list[str]:
    """Troceo por párrafos hasta ~maximo caracteres: el chunking de juguete."""
    pildoras, actual = [], []
    for parrafo in re.split(r"\\n\\s*\\n", texto):
        if not parrafo.strip():
            continue
        actual.append(parrafo.strip())
        if sum(len(p) for p in actual) >= maximo:
            pildoras.append("\\n\\n".join(actual))
            actual = []
    if actual:
        pildoras.append("\\n\\n".join(actual))
    return pildoras


def main() -> float:
    """Ingesta → píldoras → embedding → búsqueda → recall. Devuelve el recall@3."""
    print("Demo ragcooking — datos y embedding de demostración, sin claves")
    documentos = sorted((DATOS / "corpus").glob("*.md"))
    corpus = {}
    for ruta in documentos:
        for i, pildora in enumerate(pildoras_de(ruta.read_text(encoding="utf-8"))):
            corpus[f"{ruta.stem}-{i}"] = (ruta.stem, pildora)
    print(f"corpus: {len(documentos)} documentos → {len(corpus)} píldoras")
    vectores = {pid: vector_de(texto) for pid, (_, texto) in corpus.items()}
    print("embedding: 100% (hash de demostración)")

    dataset = json.loads((DATOS / "dataset.json").read_text(encoding="utf-8"))
    k, aciertos = 3, 0
    for caso in dataset["consultas"]:
        qv = vector_de(caso["consulta"])
        ranking = sorted(corpus, key=lambda pid: -sum(a * b for a, b in zip(qv, vectores[pid])))[:k]
        cita = any(corpus[pid][0] == caso["debe_citar"] for pid in ranking)
        aciertos += cita
        print(f"\\n«{caso['consulta']}»")
        for pid in ranking:
            fuente, texto = corpus[pid]
            print(f"  [{fuente}] {texto[:76].replace(chr(10), ' ')}…")
        print(f"  {'✓ cita' if cita else '✗ NO cita'} a {caso['debe_citar']}")
    recall = aciertos / len(dataset["consultas"])
    print(f"\\nrecall@{k} = {recall:.2f} sobre {len(dataset['consultas'])} consultas firmadas")
    print("Números de demostración: el corpus de verdad es el tuyo.")
    return recall


if __name__ == "__main__":
    main()
`;

const TEST_DEMO = `"""Puerta de salida del andamiaje: la demo corre y cita lo que debe."""
import io
from contextlib import redirect_stdout

import demo


def test_la_demo_corre_y_recuerda():
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        recall = demo.main()
    assert recall >= 2 / 3, "la demo debe citar al menos 2 de las 3 consultas firmadas"
    assert "recall@" in buffer.getvalue()
`;

const CI_YML = `# La puerta del andamiaje: la demo corre en cada cambio, sin claves
name: ci
on:
  push:
    branches: [main]
  pull_request:

jobs:
  demo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install pytest
      - run: pytest -q
`;

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
      } else if (b.grupoId && FICHAS_GRUPO[b.grupoId]) {
        const f = FICHAS_GRUPO[b.grupoId];
        f.deps.forEach((d) => deps.add(d));
        f.env.forEach((e) => envs.add(e));
        secciones.push(`\n# [${nombre}]${b.comment ? `  # 📝 ${b.comment}` : ''}`);
        secciones.push(f.body);
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

Ejemplo generado por **ragcooking.info** el ${new Date().toISOString().slice(0, 10)} — lenguaje: Python.

## La receta
${pasos}

## Modo demo — sin claves, en un minuto

\`\`\`bash
python demo.py     # la receta, sobre datos/ de ejemplo, sin API ni dependencias
pytest -q          # la puerta de salida: la demo corre y cita lo que debe
\`\`\`

Los datos y las métricas del demo son **de demostración**: existen para ver el
pipeline vivo de punta a punta. El corpus de verdad es el tuyo — sustituye
datos/corpus/ y firma tu propio datos/dataset.json; entonces los números son
los de tu sistema.

## Tu sistema de verdad

\`\`\`bash
python -m venv .venv && . .venv/bin/activate  # (Windows: .venv\\Scripts\\activate)
pip install -r requirements.txt
cp .env.example .env   # y rellena tus claves
python pipeline.py
\`\`\`

> Esqueleto para empezar: las secciones TODO marcan donde falta tu criterio.
` });
  const MINIMOS: Record<string, string> = {
    'pypdf': '4.2', 'markdown': '3.5', 'beautifulsoup4': '4.12', 'requests': '2.31',
    'pytesseract': '0.3', 'pillow': '10.3', 'chromadb': '0.5', 'pgvector': '0.3',
    'qdrant-client': '1.11', 'sentence-transformers': '3.0', 'openai': '1.35',
    'llama-index': '0.11', 'langchain': '0.2', 'langchain-community': '0.2',
    'langchain-openai': '0.1', 'langchain-text-splitters': '0.2', 'haystack-ai': '2.3',
    'azure-search-documents': '11.5', 'azure-identity': '1.16', 'elasticsearch': '8.14',
  };
  files.push({ name: 'requirements.txt', content: [...deps].sort().map((d) => `${d}>=${MINIMOS[d] || '1'}`).join('\n') + '\n' });
  files.push({ name: 'requirements-dev.txt', content: 'pytest>=8\n' });
  files.push({ name: '.env.example', content: [...envs].sort().join('\n') + '\n' });
  files.push({ name: 'demo.py', content: DEMO_PY });
  files.push({ name: 'datos/dataset.json', content: DEMO_DATASET });
  for (const doc of DEMO_CORPUS) files.push(doc);
  files.push({ name: 'tests/test_demo.py', content: TEST_DEMO });
  files.push({ name: '.github/workflows/ci.yml', content: CI_YML });
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

/* ---------- mini-zip (STORE, sin dependencias) ---------- */const CRC_TABLA = (() => {
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
export function crearZipBytes(files: { name: string; content: string }[]): Uint8Array<ArrayBuffer> {
  const datos = files.map((f) => ({ name: enc.encode(f.name), body: enc.encode(f.content) }));
  let total = 0; for (const d of datos) total += 30 + d.name.length + d.body.length + 46 + d.name.length;
  const out = new Uint8Array(new ArrayBuffer(total + 22));
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
  return out;
}

export function crearZip(files: { name: string; content: string }[]): Blob {
  return new Blob([crearZipBytes(files)], { type: 'application/zip' });
}

export const nombreZip = (receta: Receta, lang: string) => `${slug(receta.name)}-${lang}.zip`;
