/* Harness de pruebas del prototipo — se ejecuta con: node test-prototype.js (desde prototype/ con ../test-prototype.js) */
const fs = require('fs');
const noop = () => {};
global.window = {};
const elemDummy = () => ({ innerHTML: '', value: '', textContent: '', hidden: false, style: {},
  classList: { add: noop, remove: noop, toggle: noop },
  addEventListener: noop, appendChild: noop, focus: noop, select: noop, dataset: {} });
global.document = { addEventListener: noop, querySelector: () => elemDummy(), querySelectorAll: () => [],
  getElementById: () => null, createElement: elemDummy, body: elemDummy() };
global.location = { search: '' };
global.prompt = () => null;

const cargar = (ruta, nombres) => {
  // 'let state =' → 'var state =' para que la referencia global no quede rancia al reasignar
  const src = fs.readFileSync(ruta, 'utf8').replace('let state =', 'var state =') + `\n;Object.assign(globalThis,{${nombres.join(',')}});`;
  (0, eval)(src);
};
cargar('prototype/assets/app.js', ['initIconos', 'initTooltips', 'toast']);
cargar('prototype/assets/data.js', ['ESTACIONES', 'FASES', 'PIEZAS', 'PLANTILLAS', 'TERMINOS', 'faseById', 'piezaById', 'estacionById', 'NIVEL_LABEL', 'NIVEL_CLS']);
cargar('prototype/assets/editor.js', ['state', 'cargarPlantilla', 'validar', 'normalizar', 'JSONactual']);

let fallos = 0;
const comprobar = (cond, etiqueta, extra) => {
  console.log((cond ? 'OK   ' : 'FAIL ') + etiqueta + (extra ? ' → ' + extra : ''));
  if (!cond) fallos++;
};

/* integridad del catálogo */
const idsFases = new Set(FASES.map(f => f.id));
const idsPiezas = new Set(PIEZAS.map(p => p.id));
PIEZAS.forEach(p => {
  comprobar(idsFases.has(p.fase), `pieza ${p.id} fase válida (${p.fase})`);
  (p.covers || []).forEach(c => comprobar(idsFases.has(c), `pieza ${p.id} cover válido (${c})`));
  comprobar(p.covers && p.covers.includes(p.fase), `pieza ${p.id} cubre su ancla`);
  (p.integrates || []).forEach(c => comprobar(idsFases.has(c), `pieza ${p.id} integrate válido (${c})`));
});
PLANTILLAS.forEach(t => t.blocks.forEach(pid =>
  comprobar(idsPiezas.has(pid), `plantilla ${t.id} → pieza ${pid} existe`)));
FASES.forEach(f => comprobar(PIEZAS.filter(p => p.fase === f.id).length >= 2, `fase ${f.id} tiene ≥2 piezas`));

/* validación por plantilla */
const probar = (id, espErr, espAviso) => {
  cargarPlantilla(id, true);
  const items = validar();
  const e = items.filter(i => i.sev === 'error').length, a = items.filter(i => i.sev === 'aviso').length;
  comprobar(e === espErr && a === espAviso, `plantilla ${id}: ${e} err / ${a} avisos (esperado ${espErr}/${espAviso})`,
    e === espErr && a === espAviso ? '' : items.map(i => i.sev + ': ' + i.msg.replace(/<[^>]+>/g, '')).join(' | '));
};

probar('rag-minimo', 0, 6);        // faltan las 6 recomendadas
probar('empresarial-segura', 0, 0); // todo lo recomendado cubierto
probar('megapiezas', 0, 2);         // faltan metaetiquetado y ruido

/* R1: sin embedding → error */
cargarPlantilla('rag-minimo', true);
state.blocks = state.blocks.filter(b => b.pieza !== 'embedding.bge-m3');
comprobar(validar().some(i => i.sev === 'error' && i.msg.includes('Embedding')), 'R1: falta Embedding → error');

/* R7: integración aprovechable */
cargarPlantilla('rag-minimo', true);
state.blocks.push({ id: 'b-900', fase: 'almacenamiento', pieza: 'almacenamiento.weaviate', comment: '', description: '' });
comprobar(validar().some(i => i.sev === 'info' && i.msg.includes('Integración')), 'R7: weaviate + embedding dedicado → info');

/* roundtrip JSON */
cargarPlantilla('megapiezas', true);
state.blocks[0].comment = 'prueba de comentario';
const json = JSON.parse(JSONactual());
const reimport = normalizar({ meta: json.meta, blocks: json.blocks });
comprobar(reimport.blocks.length === state.blocks.length && reimport.blocks.some(b => b.comment === 'prueba de comentario'), 'roundtrip export→import conserva bloques y comentarios');

/* pieza desconocida tolerada (queda como custom, no rompe el import) */
const raro = JSON.parse(JSONactual());
raro.blocks.push({ id: 'b-999', phase: 'limpieza', piece: 'framework.futuro-x' });
const norm = normalizar({ blocks: raro.blocks });
comprobar(norm.blocks.some(b => b.pieza === 'custom' && /futuro-x/.test(b.description)), 'pieza desconocida tolerada como custom');

console.log(`\nCatálogo: ${PIEZAS.length} piezas · ${FASES.length} fases · ${PLANTILLAS.length} plantillas · ${Object.keys(TERMINOS).length} términos`);
process.exit(fallos ? 1 : 0);
