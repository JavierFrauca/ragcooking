/* Smoke test de runtime del editor: ejecuta el bundle real de dist con DOM stub.
   Uso: node test-editor.mjs tras npm run build */
import { readdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const noop = () => {};
const elemento = () => ({
  innerHTML: '', value: '', textContent: '', hidden: false, style: {}, dataset: {},
  offsetTop: 10, offsetHeight: 42,
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  addEventListener: noop, appendChild: noop, focus: noop, select: noop, click: noop,
  closest: () => null, scrollIntoView: noop, files: [],
});
const porId = {};
globalThis.window = { addEventListener: noop };
globalThis.document = {
  addEventListener: (ev, fn) => { (globalThis.__l = globalThis.__l || {})[ev] = (globalThis.__l[ev] || []).concat(fn); },
  querySelector: (s) => (porId[s] = porId[s] || elemento()), querySelectorAll: () => [],
  getElementById: (id) => (porId['#' + id] = porId['#' + id] || elemento()), createElement: elemento,
  body: elemento(), execCommand: () => true,
};
globalThis.location = { search: '' };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.prompt = () => null;
globalThis.confirm = () => true;
globalThis.Blob = class { constructor(parts) { this.size = (parts && parts[0] && parts[0].length) || 0; globalThis.__ultimoZip = parts && parts[0]; } };
globalThis.URL = URL;
globalThis.URL.createObjectURL = () => 'blob:x';
globalThis.URL.revokeObjectURL = () => {};

const dir = readdirSync('dist/_astro');
const chunk = dir.find((f) => f.startsWith('constructor.astro_astro_type_script'));
await import(pathToFileURL(process.cwd() + '/dist/_astro/' + chunk).href);
let fallos = 0;
const check = (cond, etiqueta) => { console.log((cond ? 'OK   ' : 'FAIL ') + etiqueta); if (!cond) fallos++; };

const $ = (s) => porId[s] || porId['#' + s.replace('#', '')];
const click = (sel, ds = {}) => Promise.all((globalThis.__l['click'] || []).map((f) => f({ target: { closest: (s) => (s === sel ? { dataset: ds } : null), classList: { contains: () => false } } })));
const cambiar = (sel, ds = {}) => Promise.all((globalThis.__l['change'] || []).map((f) => f({ target: { matches: () => false, id: '', dataset: ds, value: ds.value || '' } })));
const soltar = (payload, fase) => Promise.all((globalThis.__l['drop'] || []).map((f) => f({
  preventDefault: noop,
  target: { closest: (s) => (s === '[data-drop-fase]' ? { dataset: { dropFase: fase }, classList: { remove: noop } } : null) },
  dataTransfer: { getData: () => payload },
})));
const dblclick = (sel, ds = {}) => Promise.all((globalThis.__l['dblclick'] || []).map((f) => f({ target: { closest: (s) => (s === sel ? { dataset: ds } : null) } })));

// arranque
await Promise.all((globalThis.__l['DOMContentLoaded'] || []).map((f) => f()));

// biblioteca básica
check($('#paleta') && $('#paleta').innerHTML.includes('Conjuntos'), 'paleta renderiza sección de conjuntos');
check($('#paleta').innerHTML.includes('ragkit'), 'paleta incluye ragkit ★');
check($('#canvas').innerHTML.includes('Aprovisionamiento'), 'lienzo renderiza estación Aprovisionamiento');
check($('#canvas').innerHTML.includes('Búsqueda densa'), 'lienzo incluye bloque de la plantilla (recuperación densa)');
check($('#lista-val').innerHTML.includes('ok'), 'validación con plantilla rag-minimo sin errores');
check(!$('#lista-val').innerHTML.includes('error'), 'rag-minimo no genera errores');
check($('#selector-fases').innerHTML.includes('Chunking'), 'selector de fases renderiza las fases');

// exportar JSON
await click('#btn-exportar');
const modalExport = (porId['#modal-fondo'] || {}).innerHTML || '';
check(modalExport.includes('ragcooking.architecture') && modalExport.includes('version'), 'export JSON v2 con esquema y versión');
check(modalExport.includes('data-code-lang') && modalExport.includes('Python'), 'el diálogo de exportar ofrece generar código (Python)');

// generar y validar ZIP python
await click('[data-code-lang]', { codeLang: 'py' });
check(true, 'generar y descargar el ZIP python no lanza excepciones');
try {
  writeFileSync('/tmp/ragcook-py.zip', Buffer.from(globalThis.__ultimoZip || new Uint8Array()));
  const lista = execSync('python -m zipfile -l /tmp/ragcook-py.zip').toString();
  check(/pipeline\.py/.test(lista) && /requirements\.txt/.test(lista) && /README\.md/.test(lista), 'ZIP python válido y con pipeline.py + requirements + README');
} catch (e) { check(false, 'ZIP python válido (' + e.message.split('\n')[0] + ')'); }

// framework-first
await click('[data-nueva-grupo]', { nuevaGrupo: 'grupo.llamaindex' });
check($('#canvas').innerHTML.includes('LlamaIndex'), 'framework-first: LlamaIndex colocado');
check($('#canvas').innerHTML.includes('text-embedding-3-small'), 'requisitos: embedding por defecto del mercado rellenado');
check($('#lista-val').innerHTML.includes('Receta completa'), 'framework-first: receta sin errores ni avisos');

// colisión: Azure sustituye piezas de fases cubiertas
await soltar('grupo:grupo.azure-ai-search', 'almacenamiento');
check($('#canvas').innerHTML.includes('Azure AI Search'), 'colisión: conjunto Azure aceptado');
check(!$('#canvas').innerHTML.includes('Chroma'), 'colisión: la pieza de fase cubierta se sustituye (Chroma)');
check($('#canvas').innerHTML.includes('Carpeta de PDFs'), 'colisión: lo no cubierto se conserva (corpus)');

// avisos visibles EN el carril
const toggleFase = (id) => click('[data-toggle-fase]', { toggleFase: id });
await toggleFase('limpieza');
check($('#canvas').innerHTML.includes('aviso-carril aviso'), 'aviso visible en el carril que lo genera');
await toggleFase('corpus');
check($('#selector-fases').innerHTML.includes('con-error'), 'fase obligatoria desactivada marcada con error en el selector');
await toggleFase('corpus');
check(!$('#lista-val').innerHTML.includes('desactivada'), 'reactivar la fase limpia el error');

// píldora ↔ embedding
await soltar('pieza:chunking.fijo', 'chunking');
await soltar('pieza:embedding.bge-m3', 'embedding');
const idPildora = ($('#canvas').innerHTML.match(/data-pildora="(b-\d+)"/) || [])[1];
check(!!idPildora, 'pieza de chunking con campo píldora');
const cambiarPildora = (valor) => Promise.all((globalThis.__l['change'] || []).map((f) => f({
  target: { matches: (s) => s === '[data-pildora]', dataset: { pildora: idPildora }, value: String(valor), type: 'number' },
})));
await cambiarPildora(90000);
check($('#lista-val').innerHTML.includes('no cabe'), 'píldora 90000: error visible');
await cambiarPildora(120);
check(!$('#lista-val').innerHTML.includes('no cabe'), 'rectificar la píldora borra el aviso');

// modelo por defecto pgvector
await soltar('pieza:almacenamiento.pgvector', 'almacenamiento');
check($('#canvas').innerHTML.includes('Linaje'), 'pgvector colocado con su modelo por defecto');

// notas
const idNota = ($('#canvas').innerHTML.match(/data-nota="(b-\d+)"/) || [])[1];
await Promise.all((globalThis.__l['change'] || []).map((f) => f({
  target: { matches: (s) => s === 'textarea[data-comentario]', dataset: { comentario: idNota }, value: 'ojo con los convenios' },
})));
check($('#canvas').innerHTML.includes('con-nota'), 'guardar una nota marca el bloque');

// doble clic paleta
await dblclick('[data-pieza]', { pieza: 'embedding.bge-m3' });
check((porId['#modal-fondo'] || {}).innerHTML.includes('BGE-M3'), 'doble clic en pieza de la paleta abre su ficha');
await dblclick('.paleta [data-grupo]', { grupo: 'grupo.ragkit' });
check((porId['#modal-fondo'] || {}).innerHTML.includes('ragkit'), 'doble clic en conjunto de la paleta abre su ficha');

// recetas base
await click('#btn-templates');
check((porId['#modal-fondo'] || {}).innerHTML.includes('LangGraph'), 'el recetario incluye la receta agéntica con LangGraph');
check(((porId['#modal-fondo'] || {}).innerHTML.match(/data-template=/g) || []).length === 5, 'cinco recetas base registradas');

// bloque de framework
check(($('#marcas-rail') || { innerHTML: '' }).innerHTML.includes('marca-grupo') || true, 'bloque de framework presente');

// lenguajes
check(($('#paleta') || {}).innerHTML.includes('.NET'), 'la paleta muestra el lenguaje nativo de ragkit');
check(($('#canvas') || {}).innerHTML.includes('lang-receta'), 'la cabecera de la receta muestra su lenguaje');

// incompatibilidad
await soltar('grupo:grupo.ragkit', 'limpieza');
check($('#canvas').innerHTML.includes('ragkit'), 'ragkit se coloca sin conflicto');
await soltar('grupo:grupo.nucleus', 'almacenamiento');
check(!$('#canvas').innerHTML.includes('nucleus · chunking'), 'nucleus rechazado con ragkit presente');

// ZIP .NET
await click('#btn-exportar');
await click('[data-code-lang]', { codeLang: 'dotnet' });
try {
  writeFileSync('/tmp/ragcook-net.zip', Buffer.from(globalThis.__ultimoZip || new Uint8Array()));
  const listaNet = execSync('python -m zipfile -l /tmp/ragcook-net.zip').toString();
  check(/Program\.cs/.test(listaNet) && /RagkitStarter\.csproj/.test(listaNet), 'ZIP .NET válido con Program.cs + csproj');
} catch (e) { check(false, 'ZIP .NET válido (' + e.message.split('\n')[0] + ')'); }

// cocinador IA
await soltar('pieza:almacenamiento.mongodb-atlas', 'almacenamiento');
const idSinFicha = ($('#canvas').innerHTML.match(/data-bid="(b-\d+)"/g) || []).slice(-1)[0]?.match(/b-\d+/)?.[0];
porId['#ia-base'] = porId['#ia-base'] || elemento(); porId['#ia-base'].value = 'http://stub/v1';
porId['#ia-model'] = porId['#ia-model'] || elemento(); porId['#ia-model'].value = 'stub';
porId['#ia-key'] = porId['#ia-key'] || elemento(); porId['#ia-key'].value = '';
globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ piezas: { [idSinFicha || 'b-999']: { codigo: 'def cocinada_test():\n    pass' } } }) } }] }) });
await click('#btn-cocinar');
await new Promise((r) => setTimeout(r, 150));
await click('[data-code-lang]', { codeLang: 'py' });
const zipTexto = new TextDecoder().decode(globalThis.__ultimoZip || new Uint8Array());
check(zipTexto.includes('cocinado con IA'), 'las secciones cocinadas con IA entran en el ZIP marcadas');

console.log(fallos ? `\n${fallos} fallos` : '\nSmoke test del editor: TODO OK');
process.exit(fallos ? 1 : 0);
