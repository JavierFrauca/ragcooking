/* Smoke test de runtime del editor: ejecuta el bundle real de dist con DOM stub
   y comprueba que plantillas, grupos y validación se comportan. Uso: node test-editor.mjs tras npm run build */
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const noop = () => {};
const elemento = () => ({
  innerHTML: '', value: '', textContent: '', hidden: false, style: {}, dataset: {},
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  addEventListener: noop, appendChild: noop, focus: noop, select: noop, click: noop,
  closest: () => null, scrollIntoView: noop, files: [],
});
const porId = {};
globalThis.window = { addEventListener: noop };
globalThis.document = {
  addEventListener: noop, querySelector: (s) => (porId[s] ||= elemento()), querySelectorAll: () => [],
  getElementById: (id) => (porId['#' + id] ||= elemento()), createElement: elemento,
  body: elemento(), execCommand: () => true,
};
globalThis.location = { search: '' };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.prompt = () => null;
globalThis.URL = URL;
globalThis.Blob = class {};
const listeners = {};
document.addEventListener = (ev, fn) => { (listeners[ev] ||= []).push(fn); };

const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:');
const ficheros = readdirSync(new URL('./dist/_astro', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:'));
const chunk = ficheros.find((f) => f.startsWith('constructor.astro_astro_type_script'));
if (!chunk) { console.error('FAIL no se encuentra el chunk del editor en dist/_astro'); process.exit(1); }
await import(pathToFileURL(dir.replace(/\/$/, '') + '/dist/_astro/' + chunk).href);

const $ = (s) => porId[s] || porId['#' + s.replace('#', '')];
let fallos = 0;
const check = (cond, etiqueta) => { console.log((cond ? 'OK   ' : 'FAIL ') + etiqueta); if (!cond) fallos++; };

await Promise.all((listeners['DOMContentLoaded'] || []).map((f) => f()));

const paleta = $('#paleta')?.innerHTML || $('#buscador') && '' || '';
check($('#paleta') && $('#paleta').innerHTML.includes('Conjuntos'), 'paleta renderiza sección de conjuntos');
check($('#paleta').innerHTML.includes('ragkit'), 'paleta incluye ragkit ★');
check($('#paleta').innerHTML.includes('nucleus'), 'paleta incluye nucleus ★');
check($('#canvas').innerHTML.includes('Aprovisionamiento'), 'lienzo renderiza estación Aprovisionamiento');
check($('#canvas').innerHTML.includes('Búsqueda densa'), 'lienzo incluye bloque de la plantilla (recuperación densa)');
check($('#lista-val').innerHTML.includes('ok'), 'validación con plantilla rag-minimo sin errores');
check(!$('#lista-val').innerHTML.includes('error'), 'rag-minimo no genera errores');
check($('#selector-fases').innerHTML.includes('Chunking'), 'selector de fases renderiza las 18 fases');

// exportar JSON (el modal guarda el <textarea> como HTML: comprobamos el contenido del modal)
await Promise.all((listeners['click'] || []).map((f) => f({ target: { closest: (sel) => (sel === '#btn-exportar' ? { dataset: {} } : null), classList: { contains: () => false }, id: 'btn-exportar' } })));
const modalExport = (porId['#modal-fondo'] || {}).innerHTML || '';
check(modalExport.includes('ragcooking.architecture') && modalExport.includes('version'), 'export JSON v2 con esquema y versión');

// flujo framework-first: Nueva → cocinar con LlamaIndex
globalThis.confirm = () => true;
const clickNuevaGrupo = (gid) => Promise.all((listeners['click'] || []).map((f) => f({
  target: { closest: (sel) => (sel === '[data-nueva-grupo]' ? { dataset: { nuevaGrupo: gid } } : null), classList: { contains: () => false } },
})));
await clickNuevaGrupo('grupo.llamaindex');
const lienzo = $('#canvas').innerHTML;
check(lienzo.includes('LlamaIndex'), 'framework-first: LlamaIndex colocado');
check(lienzo.includes('text-embedding-3-small'), 'requisitos: embedding por defecto del mercado rellenado');
check(lienzo.includes('Chroma'), 'requisitos: almacenamiento por defecto rellenado');
check($('#lista-val').innerHTML.includes('Receta completa'), 'framework-first: receta sin errores ni avisos');

// colisión: soltar Azure (que cubre chunking/embedding/almacenamiento/recuperación) sustituye las piezas sueltas
const soltar = (payload, fase) => Promise.all((listeners['drop'] || []).map((f) => f({
  preventDefault: noop,
  target: { closest: (sel) => (sel === '[data-drop-fase]' ? { dataset: { dropFase: fase }, classList: { remove: noop } } : null) },
  dataTransfer: { getData: () => payload },
})));
await soltar('grupo:grupo.azure-ai-search', 'almacenamiento');
check($('#canvas').innerHTML.includes('Azure AI Search'), 'colisión: conjunto Azure aceptado');
check(!$('#canvas').innerHTML.includes('Chroma'), 'colisión: la pieza suelta de una fase cubierta se sustituye (Chroma)');
check($('#canvas').innerHTML.includes('Carpeta de PDFs'), 'colisión: lo no cubierto por el conjunto se conserva (corpus)');

// avisos visibles EN el carril que los genera
const toggleFase = (id) => Promise.all((listeners['click'] || []).map((f) => f({
  target: { closest: (sel) => (sel === '[data-toggle-fase]' ? { dataset: { toggleFase: id } } : null), classList: { contains: () => false } },
})));
await toggleFase('limpieza'); // activar una recomendada vacía → su aviso debe verse en su carril
check($('#canvas').innerHTML.includes('aviso-carril aviso'), 'aviso visible en el carril que lo genera');
check($('#canvas').innerHTML.includes('corpus crudo'), 'el mensaje del aviso se lee en el carril');
await toggleFase('corpus'); // desactivar una obligatoria → error marcado en el selector
check($('#selector-fases').innerHTML.includes('con-error'), 'fase obligatoria desactivada marcada con error en el selector');
check($('#lista-val').innerHTML.includes('desactivada'), 'el panel también lista el error de fase desactivada');
await toggleFase('corpus'); // reactivar
check(!$('#lista-val').innerHTML.includes('desactivada'), 'reactivar la fase limpia el error');

// carriles plegables
const plegar = (id) => Promise.all((listeners['click'] || []).map((f) => f({
  target: { closest: (sel) => (sel === '[data-plegar]' ? { dataset: { plegar: id } } : null), classList: { contains: () => false } },
})));
await plegar('embedding');
check($('#canvas').innerHTML.includes('colapsada'), 'clic en la cabecera de la fase la pliega');
check($('#canvas').innerHTML.includes('chevron-right'), 'plegada muestra el chevron hacia la derecha');
await plegar('embedding');
check(!$('#canvas').innerHTML.includes('colapsada'), 'otro clic la despliega');

// incompatibilidad ragkit ↔ nucleus: no pueden convivir
await soltar('grupo:grupo.ragkit', 'limpieza');
check($('#canvas').innerHTML.includes('ragkit'), 'ragkit se coloca sin conflicto');
await soltar('grupo:grupo.nucleus', 'almacenamiento');
check(!$('#canvas').innerHTML.includes('nucleus · chunking') && !$('#canvas').innerHTML.includes('nucleus · búsqueda'), 'nucleus rechazado con ragkit presente');
check(!$('#lista-val').innerHTML.includes('objetivos distintos'), 'sin error de conflicto cuando el guardián inhibe');

console.log(fallos ? `\n${fallos} fallos` : '\nSmoke test del editor: TODO OK');
process.exit(fallos ? 1 : 0);
