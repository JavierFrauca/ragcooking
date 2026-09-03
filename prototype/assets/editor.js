/* ============================================================
   ragcooking — motor del editor (prototipo Hito 0)
   Dos variantes (definidas en el HTML mediante window.EDITOR_VARIANTE):
     A) megapiezas en carril propio ("robots de cocina") + tiras de cobertura
     B) megapiezas ancladas en su carril + fantasmas en las fases cubiertas
   Todo el comportamiento se deriva de los datos (data.js).
   ============================================================ */

const VARIANTE = window.EDITOR_VARIANTE || 'A';
const STORE_KEY = 'ragcooking-proto-' + VARIANTE;
const AVISOS_RECOMENDADAS = {
  modelo: 'Sin modelo de conocimiento (dominios y etiquetas) tendrás que re-catalogar después de ingestar: caro.',
  limpieza: 'Sin limpieza, el corpus crudo contamina los embeddings.',
  metaetiquetado: 'Sin metadatos no hay prefiltro: la semántica competirá contra todo el corpus.',
  ruido: 'Un RAG con ruido es una shit — mide las colisiones entre dominios.',
  reranking: 'Sin rerank, los transversales no destacan y el orden depende solo de la similitud.',
  evaluacion: 'Sin evaluación no sabrás si funciona: dataset áureo o cero.',
};

let state = { name: '', template: '', blocks: [] };
let secuencia = 0;
let storageOk = true;
try { localStorage.setItem('rc-test', '1'); localStorage.removeItem('rc-test'); } catch (e) { storageOk = false; }

const $ = (sel, raiz) => (raiz || document).querySelector(sel);
const $$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nuevoId = () => 'b-' + String(++secuencia).padStart(3, '0');
const icono = (n) => `<i data-lucide="${n}"></i>`;
const piezaDe = (b) => b.pieza === 'custom' ? null : piezaById(b.pieza);
const esMega = (b) => { const p = piezaDe(b); return !!(p && (p.mega || (p.covers && p.covers.length > 1))); };
const coversDe = (b) => { const p = piezaDe(b); return p ? p.covers : [b.fase]; };

/* ---------------- estado / persistencia ---------------- */
function guardar() {
  const el = $('#savestate');
  if (!storageOk) { if (el) el.textContent = '⚠ sin localStorage (file://) — sirve con un servidor local'; return; }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if (el) el.textContent = '✓ guardado ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { storageOk = false; }
}
function normalizar(s) {
  const bloques = (s.blocks || []).filter(Boolean).map(b => {
    const conocida = b.piece === 'custom' || piezaById(b.piece) !== undefined;
    const p = conocida && b.piece !== 'custom' ? piezaById(b.piece) : null;
    const fase = faseById(b.phase || b.fase) ? (b.phase || b.fase) : (p ? p.fase : 'corpus');
    const id = b.id && /^b-\d+$/.test(b.id) ? b.id : nuevoId();
    secuencia = Math.max(secuencia, parseInt(id.slice(2), 10));
    return {
      id, fase,
      pieza: conocida ? b.piece : 'custom',
      comment: b.comment || '',
      description: conocida ? (b.description || '') : 'fuera de catálogo: ' + b.piece,
    };
  });
  return { name: s.name || 'Mi RAG', template: s.template || '', blocks: bloques };
}
function cargar() {
  const qs = new URLSearchParams(location.search).get('template');
  if (qs && PLANTILLAS.some(p => p.id === qs)) return cargarPlantilla(qs, true);
  let s = null;
  if (storageOk) { try { s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {} }
  if (s && Array.isArray(s.blocks) && s.blocks.length) {
    state = normalizar(s); renderTodo();
    toast('Receta restaurada del navegador'); return;
  }
  cargarPlantilla('rag-minimo', true);
}
function cargarPlantilla(id, inicial) {
  const t = PLANTILLAS.find(p => p.id === id); if (!t) return;
  state = {
    name: t.id === 'rag-minimo' ? 'Mi RAG (nueva receta)' : t.nombre,
    template: t.id,
    blocks: t.blocks.map(pid => { const p = piezaById(pid); return p ? { id: nuevoId(), fase: p.fase, pieza: pid, comment: '', description: '' } : null; }).filter(Boolean),
  };
  renderTodo(); guardar();
  if (!inicial) toast('Plantilla cargada: ' + t.nombre);
}

/* ---------------- cobertura y validación ---------------- */
function cobertura() {
  const map = {}; FASES.forEach(f => map[f.id] = { propios: [], megas: [] });
  state.blocks.forEach(b => {
    const p = piezaDe(b);
    if (p && (p.mega || p.covers.length > 1)) {
      p.covers.forEach(f => { if (map[f]) map[f].megas.push(b); });
      if (map[b.fase] && !p.covers.includes(b.fase)) map[b.fase].propios.push(b);
    } else if (map[b.fase]) {
      map[b.fase].propios.push(b);
    }
  });
  return map;
}
function cubiertaPor(faseId, cob) {
  const c = cob[faseId];
  if (!c) return false;
  if (c.megas.length) return c.megas.map(b => piezaDe(b).nombre);
  const propios = c.propios.filter(b => coversDe(b).includes(faseId));
  return propios.length ? propios.map(b => (piezaDe(b) || { nombre: 'Custom' }).nombre) : false;
}
function validar() {
  const cob = cobertura(); const items = [];
  FASES.forEach(f => {
    if (!cubiertaPor(f.id, cob)) {
      if (f.nivel === 'obligatoria') items.push({ sev: 'error', fase: f.id, msg: `Fase obligatoria sin cubrir: <b>${f.nombre}</b>. Añade una pieza o una megapieza que la cubra.` });
      else if (f.nivel === 'recomendada') items.push({ sev: 'aviso', fase: f.id, msg: AVISOS_RECOMENDADAS[f.id] || `Fase recomendada vacía: <b>${f.nombre}</b>.` });
    }
  });
  const tiene = (pid) => state.blocks.some(b => b.pieza === pid);
  const bloquePropioEn = (fase) => cob[fase].propios.length > 0;
  if ((tiene('almacenamiento.weaviate') || tiene('almacenamiento.pinecone')) && bloquePropioEn('embedding'))
    items.push({ sev: 'info', fase: 'embedding', msg: '<b>Integración aprovechable:</b> tu BD integra embedding como módulo; podrías ahorrarte la pieza dedicada.' });
  if (tiene('almacenamiento.azure-ai-search') && (bloquePropioEn('chunking', cob) || bloquePropioEn('embedding', cob)))
    items.push({ sev: 'info', fase: 'chunking', msg: '<b>Integración aprovechable:</b> Azure AI Search ya trocea y embebe; revisa si necesitas piezas dedicadas.' });
  if (state.blocks.length && !items.some(i => i.sev === 'error'))
    items.push({ sev: 'ok', msg: 'Receta completa: todas las fases obligatorias están cubiertas.' });
  return items;
}

/* ---------------- render ---------------- */
function renderTodo() { renderLienzo(); renderPanel(); renderMegaRail(); initIconos(); }

function renderPaleta() {
  const cont = $('#paleta');
  const q = ($('#buscador').value || '').toLowerCase();
  cont.innerHTML = ESTACIONES.map(est => `
    <div class="grupo-estacion">
      <div class="cab"><span class="punto" style="background:${est.color}"></span>${est.nombre}</div>
      ${FASES.filter(f => f.est === est.id).map(f => {
        const piezas = PIEZAS.filter(p => p.fase === f.id && (!q || p.nombre.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q)));
        return `<div class="fase-grupo">
          <div class="fase-cab">${icono(f.icon)} ${f.nombre} <span class="chip nivel-${NIVEL_CLS[f.nivel]}" style="margin-left:auto">${NIVEL_LABEL[f.nivel]}</span></div>
          <div class="cuerpo">
            ${piezas.map(chipPieza).join('')}
            <button class="pieza-chip custom" data-custom="${f.id}">${icono('plus')} custom</button>
          </div>
        </div>`;
      }).join('')}
    </div>`).join('');
  initIconos();
}
function chipPieza(p) {
  const cls = [p.mega || p.covers.length > 1 ? 'mega' : '', p.origin === 'propio' ? 'propio' : ''].join(' ');
  return `<span class="pieza-chip ${cls}" draggable="true" data-pieza="${p.id}" title="${esc(p.tagline)}">
    ${icono(p.icon)} ${p.nombre} ${p.origin === 'propio' ? '<span class="estrella">★</span>' : ''}
  </span>`;
}

function renderLienzo() {
  const cob = cobertura();
  const plantilla = state.template ? 'plantilla: ' + esc((PLANTILLAS.find(t => t.id === state.template) || {}).nombre || '') : '';
  $('#canvas').innerHTML = `
    <div class="receta-cabecera">
      <input class="receta-input" value="${esc(state.name)}" aria-label="Nombre de la receta">
      <span class="plantilla">${plantilla}</span>
    </div>
    <p class="receta-nota">${VARIANTE === 'A'
      ? 'Arrastra piezas de la paleta a su carril. Las <b>megapiezas</b> viven en el carril de la izquierda y cubren varias fases a la vez. Doble-click en un bloque abre su ficha.'
      : 'Arrastra piezas de la paleta a su carril. Las <b>megapiezas</b> se anclan en su fase y dejan un <b>fantasma</b> en cada fase que cubren. Doble-click en un bloque abre su ficha.'}</p>
    ${ESTACIONES.map(est => `
      <div class="banda-estacion" style="background:${est.color}">${icono(est.icon)} <span class="nombre">${est.nombre}</span> <span class="sub">· ${est.sub}</span> <span class="num">${FASES.filter(f => f.est === est.id).length} fases</span></div>
      ${FASES.filter(f => f.est === est.id).map(f => carrilHTML(f, cob)).join('')}
    `).join('')}`;
  const input = $('#canvas .receta-input');
  input.addEventListener('change', () => { state.name = input.value; guardar(); });
  initIconos();
}

function carrilHTML(f, cob) {
  const cub = cubiertaPor(f.id, cob);
  const propios = state.blocks.filter(b => b.fase === f.id && !(VARIANTE === 'A' && esMega(b)));
  const fantasmas = VARIANTE === 'B' ? cob[f.id].megas.filter(b => b.fase !== f.id) : [];
  const tira = VARIANTE === 'A' && cob[f.id].megas.length
    ? `<button class="tira-cobertura" data-flash="${cob[f.id].megas[0].id}">${icono('bot')} cubierto por ${esc(piezaDe(cob[f.id].megas[0]).nombre)}</button>` : '';
  const faltan = !cub && f.nivel === 'obligatoria';
  let contenido = fantasmas.map(fantasmaHTML).join('') + tira + propios.map(bloqueHTML).join('');
  if (!contenido) {
    contenido = cub
      ? `<div class="vacio" style="border-color:var(--albahaba);color:var(--albahaba);opacity:.9">✓ cubierta por una megapieza</div>`
      : `<div class="vacio">— vacía —${faltan ? '<span class="sugerido">⚠ fase obligatoria sin cubrir</span>' : ''}</div>`;
  }
  return `<div class="carril ${cub && !propios.length ? 'cubierto' : ''} ${faltan ? 'falta' : ''}" data-fase="${f.id}">
    <div class="lateral">
      <div class="titulo">${icono(f.icon)} ${f.nombre}</div>
      <div class="desc">${f.desc}</div>
      <div class="estado">
        <span class="chip nivel-${NIVEL_CLS[f.nivel]}">${NIVEL_LABEL[f.nivel]}</span>
        ${cub && VARIANTE === 'A' && !propios.length ? `<span class="cubierto-por">✓ ${esc(cub.join(', '))}</span>` : ''}
      </div>
    </div>
    <div class="zona" data-drop-fase="${f.id}">${contenido}</div>
  </div>`;
}

function bloqueHTML(b) {
  const p = piezaDe(b);
  const mega = esMega(b);
  const color = mega ? '' : `style="border-left-color:${(estacionById(faseById(b.fase).est) || {}).color}"`;
  if (!p) return `<div class="bloque custom" draggable="true" data-bid="${b.id}" ${color}>
    <div class="acciones"><button class="borrar" data-borrar="${b.id}" title="Quitar">${icono('x')}</button></div>
    <div class="fila">${icono('pen-line')} <span class="nombre">Custom</span> <span class="chip custom" style="margin-left:auto">${faseById(b.fase).nombre}</span></div>
    <div class="tagline">${esc(b.description || 'sin descripción')}</div>
    ${b.comment ? `<div class="comentario">${icono('message-circle')} ${esc(b.comment)}</div>` : ''}
    <textarea class="comentario-input" hidden data-comentario="${b.id}" placeholder="Tu nota sobre esta pieza…">${esc(b.comment)}</textarea>
  </div>`;
  return `<div class="bloque ${mega ? 'mega' : ''}" draggable="true" data-bid="${b.id}" ${color}>
    <div class="acciones">
      <button data-nota="${b.id}" title="Comentario">${icono('message-circle')}</button>
      <button class="borrar" data-borrar="${b.id}" title="Quitar">${icono('x')}</button>
    </div>
    <div class="fila">${icono(p.icon)} <span class="nombre">${p.nombre}</span>${p.origin === 'propio' ? '<span class="estrella">★</span>' : ''}
      ${p.origin === 'comercial' ? '<span class="chip">comercial</span>' : ''}</div>
    <div class="tagline">${esc(p.tagline)}</div>
    ${mega ? `<div class="coberturas"><span class="chip" style="background:rgba(217,160,43,.18);border-color:rgba(217,160,43,.5);color:var(--azafran)">cubre ${p.covers.length} fases</span>${p.covers.map(cf => `<span class="chip">${esc((faseById(cf) || {}).nombre || cf)}</span>`).join('')}</div>` : ''}
    ${b.comment ? `<div class="comentario">${icono('message-circle')} ${esc(b.comment)}</div>` : ''}
    <textarea class="comentario-input" hidden data-comentario="${b.id}" placeholder="Tu nota sobre esta pieza…">${esc(b.comment)}</textarea>
  </div>`;
}

function fantasmaHTML(b) {
  const p = piezaDe(b); if (!p) return '';
  return `<div class="fantasma" data-flash="${b.id}" title="Esta fase la cubre una megapieza anclada en ${faseById(b.fase).nombre}">
    ${icono('bot')} cubierto por <span class="quien">${esc(p.nombre)}</span> ${icono('external-link')}
  </div>`;
}

function renderMegaRail() {
  const drop = $('#mega-drop'); if (!drop) return;
  const megas = state.blocks.filter(esMega);
  drop.innerHTML = megas.length ? megas.map(bloqueHTML).join('') : '<span>Suelta aquí una megapieza 🤖<br>(frameworks y BDs que cubren varias fases)</span>';
  drop.classList.toggle('vacio', !megas.length);
}

function renderPanel() {
  const items = validar(); const cob = cobertura();
  const n = (s) => items.filter(i => i.sev === s).length;
  const luz = (cls, cant, label) => {
    const ok = cls !== 'info' && cant === 0;
    return `<div class="luz ${cls} ${ok ? 'ok' : ''}"><span class="n">${ok ? '✓' : cant}</span><span class="t">${label}</span></div>`;
  };
  $('#semaforo').innerHTML = luz('err', n('error'), 'errores') + luz('warn', n('aviso'), 'avisos') + luz('info', n('info'), 'infos');
  $('#mapa-fases').innerHTML = FASES.map(f => {
    const cub = cubiertaPor(f.id, cob);
    const cls = cub ? 'cubierta' : (f.nivel === 'obligatoria' ? 'falta-ob' : f.nivel === 'recomendada' ? 'falta-rec' : '');
    return `<div class="c ${cls}" data-ir="${f.id}" title="${f.nombre} — ${cub ? 'cubierta' : 'sin cubrir (' + f.nivel + ')'}">${f.nombre.slice(0, 3)}</div>`;
  }).join('');
  $('#lista-val').innerHTML = items.length ? items.map(i => `
    <div class="item-val ${i.sev}" ${i.fase ? `data-ir="${i.fase}"` : ''}>
      <span class="sev">${i.sev === 'error' ? '● error' : i.sev === 'aviso' ? '▲ aviso' : i.sev === 'info' ? 'ℹ info' : '✓ ok'}</span>${i.msg}
    </div>`).join('')
    : '<div class="item-val ok"><span class="sev">✓ ok</span>Lienzo vacío: carga una plantilla para empezar.</div>';
}

/* ---------------- interacción ---------------- */
function irAFase(faseId) {
  const el = document.querySelector(`.carril[data-fase="${faseId}"]`); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('destello'); void el.offsetWidth; el.classList.add('destello');
}
function flashBloque(bid) {
  const el = document.querySelector(`[data-bid="${bid}"]`); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('destello'); void el.offsetWidth; el.classList.add('destello');
}
function addBlock(piezaId) {
  const p = piezaById(piezaId); if (!p) return;
  state.blocks.push({ id: nuevoId(), fase: p.fase, pieza: piezaId, comment: '', description: '' });
  trasCambio(); irAFase(p.fase);
}
function trasCambio() { renderLienzo(); renderPanel(); renderMegaRail(); initIconos(); guardar(); }

document.addEventListener('click', (e) => {
  const t = e.target;
  const cerca = (sel) => t.closest(sel);
  let el;
  if (el = cerca('[data-ir]')) return irAFase(el.dataset.ir);
  if (el = cerca('[data-flash]')) return flashBloque(el.dataset.flash);
  if (el = cerca('[data-borrar]')) { state.blocks = state.blocks.filter(b => b.id !== el.dataset.borrar); return trasCambio(); }
  if (el = cerca('[data-nota]')) {
    const ta = document.querySelector(`textarea[data-comentario="${el.dataset.nota}"]`);
    if (ta) { ta.hidden = !ta.hidden; if (!ta.hidden) ta.focus(); }
    return;
  }
  if (el = cerca('[data-custom]')) {
    const fase = el.dataset.custom;
    const desc = prompt('Describe tu pieza custom para la fase «' + faseById(fase).nombre + '» (solo descripción, sin validación):');
    if (desc && desc.trim()) {
      state.blocks.push({ id: nuevoId(), fase, pieza: 'custom', comment: '', description: desc.trim() });
      trasCambio(); irAFase(fase);
    }
    return;
  }
  if (cerca('#btn-plantillas')) return abrirPlantillas();
  if (cerca('#btn-nueva')) { cargarPlantilla('rag-minimo'); return toast('Receta nueva desde la plantilla RAG mínimo'); }
  if (cerca('#btn-exportar')) return abrirExport();
  if (cerca('#btn-importar')) return abrirImport();
  if (cerca('#btn-descargar-json')) return descargarJSON();
  if (cerca('#btn-copiar-json')) return copiarJSON();
  if (cerca('#btn-cargar-json')) return cargarJSON();
  if (el = cerca('[data-plantilla]')) { const id = el.dataset.plantilla; cerrarModales(); return cargarPlantilla(id); }
  if (cerca('.cerrar') || t.classList.contains('modal-fondo')) return cerrarModales();
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'buscador') renderPaleta();
  if (e.target.matches('textarea[data-comentario]')) {
    const b = state.blocks.find(x => x.id === e.target.dataset.comentario);
    if (b) { b.comment = e.target.value; renderLienzo(); renderPanel(); initIconos(); guardar(); }
  }
});

document.addEventListener('dblclick', (e) => {
  const bl = e.target.closest('[data-bid]'); if (!bl) return;
  const b = state.blocks.find(x => x.id === bl.dataset.bid);
  if (b) abrirFicha(b);
});

/* ---------------- drag & drop ---------------- */
document.addEventListener('dragstart', (e) => {
  const chip = e.target.closest('[data-pieza]');
  if (chip) { e.dataTransfer.setData('text/plain', 'nuevo:' + chip.dataset.pieza); e.dataTransfer.effectAllowed = 'copy'; return; }
  const bl = e.target.closest('[data-bid]');
  if (bl) { e.dataTransfer.setData('text/plain', 'mover:' + bl.dataset.bid); bl.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; }
});
document.addEventListener('dragend', () => $$('.bloque.dragging').forEach(el => el.classList.remove('dragging')));
document.addEventListener('dragover', (e) => {
  const zona = e.target.closest('[data-drop-fase], #mega-drop'); if (!zona) return;
  e.preventDefault();
  $$('.dragover').forEach(el => el !== zona && el.classList.remove('dragover'));
  zona.classList.add('dragover');
});
document.addEventListener('dragleave', (e) => {
  const zona = e.target.closest('[data-drop-fase], #mega-drop'); if (zona) zona.classList.remove('dragover');
});
document.addEventListener('drop', (e) => {
  const zona = e.target.closest('[data-drop-fase], #mega-drop'); if (!zona) return;
  e.preventDefault(); zona.classList.remove('dragover');
  const datos = e.dataTransfer.getData('text/plain') || '';
  const [accion, ref] = datos.split(':');
  if (accion === 'nuevo') {
    const p = piezaById(ref); if (!p) return;
    const esMegaPieza = p.mega || p.covers.length > 1;
    if (zona.id === 'mega-drop') {
      if (!esMegaPieza) return toast('Esa pieza no es megapieza: suéltala en su carril', true);
      return addBlock(ref);
    }
    if (esMegaPieza && VARIANTE === 'A') return toast('Las megapiezas viven en el carril 🤖 de megapiezas', true);
    if (p.fase !== zona.dataset.dropFase) return toast(`Esa pieza vive en la fase «${faseById(p.fase).nombre}» (R5)`, true);
    addBlock(ref);
  } else if (accion === 'mover') {
    const b = state.blocks.find(x => x.id === ref); if (!b) return;
    if (zona.id === 'mega-drop' && !esMega(b)) return toast('Solo megapiezas en este carril', true);
    if (zona.dataset.dropFase && b.fase !== zona.dataset.dropFase) return toast('Cada pieza permanece en su fase (R5)', true);
    const objetivo = e.target.closest('[data-bid]');
    state.blocks = state.blocks.filter(x => x.id !== ref);
    if (objetivo && objetivo.dataset.bid !== ref) {
      const idx = state.blocks.findIndex(x => x.id === objetivo.dataset.bid);
      state.blocks.splice(idx < 0 ? state.blocks.length : idx, 0, b);
    } else state.blocks.push(b);
    trasCambio();
  }
});

/* ---------------- modales ---------------- */
function abrirModal(html) {
  let fondo = $('#modal-fondo');
  if (!fondo) { fondo = document.createElement('div'); fondo.id = 'modal-fondo'; fondo.className = 'modal-fondo'; document.body.appendChild(fondo); }
  fondo.innerHTML = `<div class="modal">${html}</div>`;
  fondo.classList.add('abierto'); initIconos();
}
function cerrarModales() { const m = $('#modal-fondo'); if (m) m.classList.remove('abierto'); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModales(); });

function abrirFicha(b) {
  const p = piezaDe(b); const f = faseById(b.fase);
  if (!p) return abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>Pieza custom — ${f.nombre}</h2>
    <p class="tagline">Pieza propia del usuario: solo descripción, sin validación de compatibilidad (R6).</p>
    <div class="aviso-caja hierba">${icono('quote')}<div><span class="titulo-caja">Descripción</span>${esc(b.description)}</div></div>
    ${b.comment ? `<p><b>Tu nota:</b> ${esc(b.comment)}</p>` : ''}`);
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>${p.nombre} ${p.origin === 'propio' ? '★' : ''}</h2>
    <p class="tagline">${esc(p.tagline)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <span class="chip">${icono(f.icon)} fase: ${f.nombre}</span>
      ${p.origin === 'comercial' ? `<span class="chip">comercial${p.vendor ? ' · ' + esc(p.vendor) : ''}</span>` : ''}
      ${p.origin === 'propio' ? '<span class="chip propio">★ propio</span>' : ''}
      ${esMega(b) ? '<span class="chip mega">megapieza</span>' : ''}
      ${p.integrates ? `<span class="chip">integra: ${p.integrates.map(i => (faseById(i) || { nombre: i }).nombre).join(', ')}</span>` : ''}
    </div>
    ${esMega(b) ? `<h3>Cubre estas fases</h3><div class="covers-visual">${p.covers.map(cf => `<span class="cover-chip ${cf === p.fase ? 'ancla' : ''}" style="background:${(estacionById((faseById(cf) || { est: 'servicio' }).est) || { color: '#2B2620' }).color}">${esc((faseById(cf) || { nombre: cf }).nombre)}</span>`).join('')}</div>` : ''}
    <div class="proscons">
      <div class="pros"><h4>Pros</h4><ul>${(p.pros || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="cons"><h4>Contras</h4><ul>${(p.cons || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    <p style="font-size:12.5px;color:var(--tinta-2)">En el sitio real, esta ficha incluye pasos, ejemplo de código y piezas relacionadas.</p>`);
}

function abrirPlantillas() {
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>Plantillas por objetivo</h2>
    <p class="tagline">Toda receta nueva arranca del RAG mínimo; el resto se eligen aquí.</p>
    ${PLANTILLAS.map(t => `
      <div class="aviso-caja hierba" style="align-items:center">
        ${icono('chef-hat')}
        <div style="flex:1"><span class="titulo-caja">${esc(t.nombre)}</span>${esc(t.desc)}
          <div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap">${t.blocks.map(pid => `<span class="chip">${esc((piezaById(pid) || { nombre: pid }).nombre)}</span>`).join('')}</div>
        </div>
        <button class="btn primario" data-plantilla="${t.id}">Usar</button>
      </div>`).join('')}`);
}

function JSONactual() {
  return JSON.stringify({
    schema: 'ragcooking.architecture', version: 1,
    meta: { name: state.name, template: state.template, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    blocks: state.blocks.map(b => ({
      id: b.id, phase: b.fase, piece: b.pieza,
      comment: b.comment || undefined,
      ...(b.pieza === 'custom' ? { description: b.description } : {}),
      config: {}, children: [],
    })),
  }, null, 2);
}
function abrirExport() {
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>Exportar receta (JSON)</h2>
    <p class="tagline">Arquitectura anidada: piezas, comentarios, customs; la cobertura se deriva del catálogo.</p>
    <textarea id="json-out" readonly>${esc(JSONactual())}</textarea>
    <div class="fila-botones">
      <button class="btn primario" id="btn-copiar-json">${icono('copy')} Copiar</button>
      <button class="btn" id="btn-descargar-json">${icono('download')} Descargar .json</button>
    </div>`);
}
function descargarJSON() {
  const blob = new Blob([JSONactual()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (state.name || 'receta').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';
  a.click(); URL.revokeObjectURL(a.href); toast('Receta descargada');
}
function copiarJSON() {
  const ta = $('#json-out'); ta.select();
  const hacer = () => toast('Copiado al portapapeles');
  navigator.clipboard && navigator.clipboard.writeText
    ? navigator.clipboard.writeText(ta.value).then(hacer).catch(() => { document.execCommand('copy'); hacer(); })
    : (document.execCommand('copy'), hacer());
}
function abrirImport() {
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>Importar receta (JSON)</h2>
    <p class="tagline">Pega el JSON exportado o elige el fichero. Las piezas desconocidas se avisan sin romper la carga.</p>
    <textarea id="json-in" placeholder='{"schema":"ragcooking.architecture", …}'></textarea>
    <div class="fila-botones">
      <button class="btn primario" id="btn-cargar-json">${icono('check')} Cargar</button>
      <label class="btn">${icono('folder-open')} Elegir fichero<input type="file" accept=".json,application/json" hidden id="json-file"></label>
    </div>`);
  $('#json-file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { $('#json-in').value = r.result; }; r.readAsText(f);
  });
}
function cargarJSON() {
  try {
    const data = JSON.parse($('#json-in').value);
    if (!Array.isArray(data.blocks)) throw new Error('le falta blocks[]');
    const fuera = data.blocks.filter(b => b.piece !== 'custom' && !piezaById(b.piece)).length;
    state = normalizar({ name: (data.meta && data.meta.name) || data.name || 'Receta importada', template: (data.meta && data.meta.template) || '', blocks: data.blocks });
    cerrarModales(); trasCambio();
    toast(fuera ? `Importada; ${fuera} pieza(s) fuera de catálogo quedaron como custom` : 'Receta importada ✓');
  } catch (err) { toast('JSON no válido: ' + err.message, true); }
}

/* ---------------- arranque ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderPaleta();
  cargar();
});
