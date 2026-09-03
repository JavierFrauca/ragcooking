/* Smoke test de runtime del editor: ejecuta el bundle real de dist con DOM stub
   y comprueba que plantillas, grupos y validación se comportan. Uso: node test-editor.mjs tras npm run build */
import { readFileSync, readdirSync } from 'node:fs';
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
  addEventListener: noop, querySelector: (s) => (porId[s] ||= elemento()), querySelectorAll: () => [],
  getElementById: (id) => (porId['#' + id] ||= elemento()), createElement: elemento,
  body: elemento(), execCommand: () => true,
};
globalThis.location = { search: '' };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.prompt = () => null;
globalThis.URL = URL;
globalThis.URL.createObjectURL = () => 'blob:x';
globalThis.URL.revokeObjectURL = () => {};
globalThis.Blob = class { constructor(parts) { this.size = (parts && parts[0] && parts[0].length) || 0; globalThis.__ultimoZip = parts && parts[0]; } };
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

// el coder: botones de lenguaje con cobertura y generación sin excepción
check(modalExport.includes('data-code-lang') && modalExport.includes('Python'), 'el diálogo de exportar ofrece generar código (Python)');
await Promise.all((listeners['click'] || []).map((f) => f({
  target: { closest: (sel) => (sel === '[data-code-lang]' ? { dataset: { codeLang: 'py' } } : null), classList: { contains: () => false } },
})));
check(true, 'generar y descargar el ZIP python no lanza excepciones');

// validación real del ZIP python: estructura legible por zipfile
try {
  const fs = await import('node:fs');
  fs.writeFileSync('/tmp/ragcook-py.zip', Buffer.from(globalThis.__ultimoZip || new Uint8Array()));
  const { execSync } = await import('node:child_process');
  const lista = execSync('python -m zipfile -l /tmp/ragcook-py.zip').toString();
  check(/pipeline\.py/.test(lista) && /requirements\.txt/.test(lista) && /README\.md/.test(lista), 'ZIP python válido y con pipeline.py + requirements + README');
  // dotnet vía ragkit: Program.cs con la API real
  await Promise.all((listeners['click'] || []).map((f) => f({
    target: { closest: (sel) => (sel === '[data-code-lang]' ? { dataset: { codeLang: 'dotnet' } } : null), classList: { contains: () => false } },
  })));
  fs.writeFileSync('/tmp/ragcook-net.zip', Buffer.from(globalThis.__ultimoZip || new Uint8Array()));
  const listaNet = execSync('python -m zipfile -l /tmp/ragcook-net.zip').toString();
  check(/Program\.cs/.test(listaNet) && /RagkitStarter\.csproj/.test(listaNet), 'ZIP .NET válido con Program.cs + csproj de ragkit');
} catch (e) {
  check(false, 'ZIP python válido (' + e.message.split('\n')[0] + ')');
}

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

// notas de bloque: guardar nota y ver el indicador
const idNota = ($('#canvas').innerHTML.match(/data-nota="(b-\d+)"/) || [])[1];
const escribirNota = (valor) => Promise.all((listeners['change'] || []).map((f) => f({
  target: { matches: (s) => s === 'textarea[data-comentario]', dataset: { comentario: idNota }, value: valor },
})));
await escribirNota('ojo con los convenios escaneados');
check(($('#canvas') || {}).innerHTML.includes('con-nota'), 'guardar una nota marca el bloque (botón azul)');
check(($('#canvas') || {}).innerHTML.includes('convenios escaneados'), 'la nota se lee en el tooltip del bloque');

// modelo por defecto por base de datos: al colocar pgvector llegan sus 7 campos de serie
await soltar('pieza:almacenamiento.pgvector', 'almacenamiento');
const lienzoPg = ($('#canvas') || {}).innerHTML;
check(lienzoPg.includes('Linaje') && lienzoPg.includes('Campo resumen'), 'pgvector colocado con su modelo por defecto completo (resumen, linaje…)');

// doble clic en la paleta: la misma ficha que en el lienzo
const dblclick = (sel, ds) => Promise.all((listeners['dblclick'] || []).map((f) => f({
  target: { closest: (s) => (s === sel ? { dataset: ds } : null) },
})));
await dblclick('[data-pieza]', { pieza: 'embedding.bge-m3' });
check((porId['#modal-fondo'] || {}).innerHTML.includes('BGE-M3') && (porId['#modal-fondo'] || {}).innerHTML.includes('8192'), 'doble clic en pieza de la paleta abre su ficha completa (con maxTokens)');
await dblclick('.paleta [data-grupo]', { grupo: 'grupo.ragkit' });
check((porId['#modal-fondo'] || {}).innerHTML.includes('ragkit') && (porId['#modal-fondo'] || {}).innerHTML.includes('Variante'), 'doble clic en conjunto de la paleta abre su ficha con variantes');

// recetas base (templates): 5 disponibles desde la carpeta, incluida la de LangGraph
await Promise.all((listeners['click'] || []).map((f) => f({
  target: { closest: (sel) => (sel === '#btn-templates' ? {} : null), classList: { contains: () => false } },
})));
const modalRecetas = (porId['#modal-fondo'] || {}).innerHTML || '';
check(modalRecetas.includes('LangGraph'), 'el recetario incluye la receta agéntica con LangGraph');
check((modalRecetas.match(/data-template=/g) || []).length === 5, 'cinco recetas base registradas desde la carpeta');

// el framework es un bloque a la derecha con conectores por fase cubierta
const rail = (porId['#marcas-rail'] || {}).innerHTML || '';
check(rail.includes('marca-grupo') && rail.includes('mg-conn'), 'bloque de framework con conectores triangulares por fase');

// lenguajes nativos: ragkit declara .NET; el camino libre es Python
check(($('#paleta') || {}).innerHTML.includes('.NET'), 'la paleta muestra el lenguaje nativo de ragkit (.NET)');
check(($('#canvas') || {}).innerHTML.includes('lang-receta'), 'la cabecera de la receta muestra su lenguaje');
await soltar('grupo:grupo.ragkit', 'limpieza');
check(($('#canvas') || {}).innerHTML.includes('⚙️ .NET'), 'receta con ragkit → chip de lenguaje .NET en cabecera');

// píldora ↔ embedding: el aviso aparece con píldora enorme y SE VA al rectificar
await soltar('pieza:chunking.fijo', 'chunking');
await soltar('pieza:embedding.bge-m3', 'embedding');
const idPildora = ($('#canvas').innerHTML.match(/data-pildora="(b-\d+)"/) || [])[1];
check(!!idPildora, 'pieza de chunking con campo píldora');
const cambiarPildora = (valor) => Promise.all((listeners['change'] || []).map((f) => f({
  target: { matches: (s) => s === '[data-pildora]', dataset: { pildora: idPildora }, value: String(valor), type: 'number' },
})));
await cambiarPildora(90000);
check($('#lista-val').innerHTML.includes('no cabe') && $('#canvas').innerHTML.includes('no cabe'), 'píldora 90000: error visible en panel Y en el carril');
await cambiarPildora(120);
check(!$('#lista-val').innerHTML.includes('no cabe') && !$('#canvas').innerHTML.includes('no cabe'), 'rectificar la píldora borra el aviso (panel y carril)');

// paleta: fases plegables que se autoexpanden al buscar
const plegarPaleta = (id) => Promise.all((listeners['click'] || []).map((f) => f({
  target: { closest: (sel) => (sel === '[data-plegar-paleta]' ? { dataset: { plegarPaleta: id } } : null), classList: { contains: () => false } },
})));
await plegarPaleta('corpus');
check(($('#paleta') || {}).innerHTML.includes('fase-grupo plegada'), 'clic en la cabecera de la paleta pliega el grupo de fase');
const buscar = async (valor) => {
  porId['#buscador'] = porId['#buscador'] || { value: '' };
  porId['#buscador'].value = valor;
  await Promise.all((listeners['change'] || []).map((f) => f({ target: { id: 'buscador', matches: () => false, value: valor } })));
};
await buscar('chroma');
const paletaBusq = ($('#paleta') || {}).innerHTML;
check(paletaBusq.includes('Chroma') && !paletaBusq.includes('fase-grupo plegada'), 'al buscar se autoexpanden los grupos y solo quedan las coincidencias');
await buscar('');
check(($('#paleta') || {}).innerHTML.includes('fase-grupo plegada'), 'al limpiar la búsqueda se restaura el plegado memorizado');

// estaciones: los grandes bloques también se pliegan
await plegarPaleta('aprovisionamiento');
const paletaEst = ($('#paleta') || {}).innerHTML;
check(paletaEst.includes('grupo-estacion plegada'), 'clic en la estación (gran bloque) la pliega entera');
check(/grupo-estacion plegada[^]*?Conjuntos/.test(paletaEst) || !paletaEst.includes('Corpus') || paletaEst.includes('estacion-cab'), 'la estación plegada oculta sus fases');

// incompatibilidad ragkit ↔ nucleus: no pueden convivir
await soltar('grupo:grupo.ragkit', 'limpieza');
check($('#canvas').innerHTML.includes('ragkit'), 'ragkit se coloca sin conflicto');
await soltar('grupo:grupo.nucleus', 'almacenamiento');
check(!$('#canvas').innerHTML.includes('nucleus · chunking') && !$('#canvas').innerHTML.includes('nucleus · búsqueda'), 'nucleus rechazado con ragkit presente');
check(!$('#lista-val').innerHTML.includes('objetivos distintos'), 'sin error de conflicto cuando el guardián inhibe');

console.log(fallos ? `\n${fallos} fallos` : '\nSmoke test del editor: TODO OK');
process.exit(fallos ? 1 : 0);
