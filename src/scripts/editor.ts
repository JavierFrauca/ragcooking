/* ============================================================
   ragcooking — editor "Cocina tu RAG"
   - Fases seleccionables: eliges qué carriles quieres
   - Grupos (frameworks = conjuntos de bloques) expandibles con variantes
   - Validación por cobertura + píldora↔embedding + embedding externo
   - Diseñador de modelo de datos para almacenes
   - localStorage, export/import JSON v2
   Todo renderiza desde catalogo.json (fuente única de verdad).
   ============================================================ */
import {
  FASES, PIEZAS, GRUPOS, MODELO_DATOS, TERMINOS, ESTACIONES,
  faseById, piezaById, grupoById, estacionById, NIVEL_LABEL, NIVEL_CLS, colorDeGrupo,
} from '../data/catalogo';
import { TEMPLATES } from '../data/templates';
import { lenguajesDisponibles, generarCodigo, crearZip, nombreZip } from './codegen';
import type { Pieza, Grupo, Fase, Bloque, Receta } from './tipos';

/* ---------- runtime mínimo (iconos, toast, tooltip diccionario) ---------- */
const icono = (n: string) => `<i data-lucide="${n}"></i>`;

/* lenguajes nativos: los conjuntos declaran; el camino libre (piezas sueltas) es Python */
const LANG_LABEL: Record<string, string> = { py: 'Python', dotnet: 'C# · .NET' };
const langBadge = (l: string) => l === 'py' ? '🐍 PY' : l === 'dotnet' ? '⚙️ .NET' : l;
const langsDeGrupo = (g: Grupo | undefined) => (g?.langs || []).map((l) => langBadge(l));
function lenguajesReceta(): string[] {
  const conGrupos = receta.bloques.some((b) => b.grupoId);
  const sueltas = receta.bloques.some((b) => !b.grupoId);
  const deGrupos = [...new Set(receta.bloques.filter((b) => b.grupoId).map((b) => grupoById(b.grupoId!)).filter((g): g is Grupo => !!g).flatMap((g) => g.langs || []))];
  if (!conGrupos) return receta.bloques.length ? ['py'] : [];
  return [...new Set([...deGrupos, ...(sueltas ? ['py'] : [])])].map((l) => langBadge(l));
}
function initIconos() { (window as any).lucide?.createIcons(); }
let toastTimer: any;
function toast(msg: string, err = false) {
  let t = document.getElementById('toast-rc');
  if (!t) { t = document.createElement('div'); t.id = 'toast-rc'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.toggle('error', err); t.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2600);
}
function initTooltips() {
  const tt = document.createElement('div'); tt.className = 'tt'; document.body.appendChild(tt);
  document.addEventListener('mouseover', (e) => {
    const el = (e.target as HTMLElement).closest('[data-term]') as HTMLElement | null;
    if (!el || !TERMINOS[el.dataset.term!]) { tt.classList.remove('visible'); return; }
    const term = el.dataset.term!;
    tt.innerHTML = `<span class="tt-t">${term}</span>${TERMINOS[term]}`;
    tt.classList.add('visible');
    const r = el.getBoundingClientRect();
    tt.style.left = Math.min(Math.max(10, r.left), window.innerWidth - 340) + 'px';
    tt.style.top = (r.bottom + 8 + window.scrollY > window.scrollY + window.innerHeight - 10
      ? r.top + window.scrollY - tt.offsetHeight - 8 : r.bottom + window.scrollY + 8) + 'px';
  });
}

/* ---------- estado ---------- */
let receta: Receta = { name: '', template: '', fasesActivas: [], bloques: [], expandidos: [], fasesColapsadas: [] };
let secuencia = 0;
const nuevoId = () => 'b-' + String(++secuencia).padStart(3, '0');
const STORE = 'ragcooking-receta-v2';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const $ = (sel: string) => document.querySelector(sel);
const piezaDe = (b: Bloque): Pieza | undefined => (b.pieza ? piezaById(b.pieza) : undefined);
const grupoDe = (b: Bloque): Grupo | undefined => (b.grupoId ? grupoById(b.grupoId) : undefined);

const AVISOS: Record<string, string> = {
  formato: 'Sin formato común: convierte todo a Markdown (u otro estándar) antes de curar — o te pelearás con cada PDF en cada fase.',
  modelo: 'Sin modelo de conocimiento (dominios y etiquetas) tendrás que re-catalogar después de ingestar: caro.',
  limpieza: 'Sin limpieza, el corpus crudo contamina los embeddings.',
  metaetiquetado: 'Sin metadatos no hay prefiltro: la semántica competirá contra todo el corpus.',
  ruido: 'Un RAG con ruido es una shit — mide las colisiones entre dominios.',
  reranking: 'Sin rerank, los transversales no destacan y el orden depende solo de la similitud.',
  evaluacion: 'Sin evaluación no sabrás si funciona: dataset áureo o cero.',
};

/* ---------- persistencia ---------- */
function guardar() {
  const el = $('#savestate');
  try { localStorage.setItem(STORE, JSON.stringify(receta)); if (el) el.textContent = '✓ guardado ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
  catch { if (el) el.textContent = '⚠ sin localStorage'; }
}
function normalizar(data: any): Receta {
  const fasesActivas = (data.fasesActivas || []).filter((f: string) => faseById(f));
  const bloques: Bloque[] = (data.bloques || []).filter(Boolean).map((b: any) => {
    const piezaValida = b.pieza && piezaById(b.pieza);
    const grupoValido = b.grupoId && grupoById(b.grupoId);
    const fase = faseById(b.fase) ? b.fase : (piezaValida ? piezaById(b.pieza)!.fase : (grupoValido ? grupoById(b.grupoId)!.faseAncla : 'corpus'));
    if (b.id && /^b-\d+$/.test(b.id)) secuencia = Math.max(secuencia, parseInt(b.id.slice(2), 10));
    return {
      id: b.id && /^b-\d+$/.test(b.id) ? b.id : nuevoId(),
      fase,
      pieza: piezaValida ? b.pieza : undefined,
      custom: !piezaValida && b.custom ? b.custom : (!piezaValida && !grupoValido && b.pieza ? 'fuera de catálogo: ' + b.pieza : (b.custom || '')),
      grupoId: grupoValido ? b.grupoId : undefined,
      variante: grupoValido ? b.variante : undefined,
      comment: b.comment || '',
      config: b.config || {},
    } as Bloque;
  });
  return { name: data.name || 'Mi RAG', template: data.template || '', fasesActivas, bloques, expandidos: data.expandidos || [], fasesColapsadas: data.fasesColapsadas || [] };
}
function cargar() {
  const qs = new URLSearchParams(location.search).get('template');
  if (qs && TEMPLATES.some((p) => p.id === qs)) return cargarTemplate(qs, true);
  let s: any = null;
  try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { /* noop */ }
  if (s && Array.isArray(s.bloques) && s.bloques.length) { receta = normalizar(s); renderTodo(); toast('Receta restaurada del navegador'); return; }
  cargarTemplate('rag-minimo', true);
}
function cargarTemplate(id: string, inicial = false) {
  const t = TEMPLATES.find((p) => p.id === id); if (!t) return;
  receta = { name: t.arranque ? 'Mi RAG (nueva receta)' : t.nombre, template: t.id, fasesActivas: [...t.fasesActivas], bloques: [], expandidos: [], fasesColapsadas: [] };
  for (const b of t.bloques) {
    if (b.pieza && piezaById(b.pieza)) receta.bloques.push({ id: nuevoId(), fase: piezaById(b.pieza)!.fase, pieza: b.pieza, comment: '', config: {} });
    else if (b.grupo && grupoById(b.grupo)) colocarGrupo(b.grupo, b.variante || grupoById(b.grupo)!.variantes[0].id, true);
  }
  renderTodo(); guardar();
  if (!inicial) toast('Receta cargada: ' + t.nombre);
}

/* ---------- grupos (conjuntos de bloques) ---------- */
function conflictoCon(gid: string): Grupo | undefined {
  const g = grupoById(gid); if (!g) return undefined;
  const presentes = [...new Set(receta.bloques.filter((b) => b.grupoId).map((b) => b.grupoId!))];
  for (const p of presentes) {
    if (p === gid) continue;
    const otro = grupoById(p);
    if (!otro) continue;
    if (g.conflicts?.includes(p) || otro.conflicts?.includes(gid)) return otro;
  }
  return undefined;
}
function colocarGrupo(grupoId: string, varianteId: string, silencioso = false): boolean {
  const g = grupoById(grupoId); if (!g) return false;
  const rival = conflictoCon(grupoId);
  if (rival) {
    toast(`${g.nombre} y ${rival.nombre} persiguen objetivos distintos y no pueden convivir en la misma receta`, true);
    return false;
  }
  const v = g.variantes.find((x) => x.id === varianteId) || g.variantes[0];
  // el conjunto activa su fase ancla y las fases que necesita por encima y por debajo
  if (!receta.fasesActivas.includes(g.faseAncla)) receta.fasesActivas.push(g.faseAncla);
  for (const a of v.atomos) if (!receta.fasesActivas.includes(a.fase)) receta.fasesActivas.push(a.fase);
  for (const r of g.requisitos || []) if (!receta.fasesActivas.includes(r.fase)) receta.fasesActivas.push(r.fase);
  // coloca sus átomos como bloques reales (trazabilidad); el modelo por defecto del conjunto cae en su almacén
  for (const a of v.atomos) {
    receta.bloques.push({
      id: nuevoId(), fase: a.fase,
      pieza: a.pieza && piezaById(a.pieza) ? a.pieza : undefined,
      custom: a.propio ? a.propio.nombre + (a.propio.desc ? ' — ' + a.propio.desc : '') : undefined,
      grupoId: g.id, variante: v.id, comment: '',
      config: a.fase === 'almacenamiento' && g.modeloDefecto ? { modeloDatos: { ...g.modeloDefecto } } : {},
    });
  }
  // y completa lo mínimo que aún no está cubierto, con las piezas por defecto del mercado (y su modelo por defecto)
  const rellenados: string[] = [];
  for (const r of g.requisitos || []) {
    if (cubierta(r.fase)) continue;
    const rp = piezaById(r.pieza); if (!rp) continue;
    receta.bloques.push({ id: nuevoId(), fase: r.fase, pieza: r.pieza, comment: '', config: rp.modeloDefecto ? { modeloDatos: { ...rp.modeloDefecto } } : {} });
    rellenados.push(faseById(r.fase)!.nombre);
  }
  if (!silencioso && rellenados.length) toast(`${g.nombre}: completadas por ti → ${rellenados.join(', ')}`);
  return true;
}
function construirDesdeGrupo(grupoId: string, varianteId: string) {
  const g = grupoById(grupoId); if (!g) return;
  receta = { name: 'Mi RAG (' + g.nombre + ')', template: '', fasesActivas: [], bloques: [], expandidos: [g.id], fasesColapsadas: [] };
  colocarGrupo(g.id, varianteId, true);
  trasCambio(); irAFase(g.faseAncla);
  toast('Receta creada sobre ' + g.nombre + ' — ahora añade lo que precise tu caso');
}
function cambiarVariante(grupoId: string, varianteId: string) {
  const bloquesGrupo = receta.bloques.filter((b) => b.grupoId === grupoId);
  const guardados = bloquesGrupo.filter((b) => b.comment || Object.keys(b.config || {}).length);
  receta.bloques = receta.bloques.filter((b) => b.grupoId !== grupoId);
  colocarGrupo(grupoId, varianteId, true);
  for (const nuevo of receta.bloques.filter((b) => b.grupoId === grupoId)) {
    const g = guardados.find((gb) => gb.fase === nuevo.fase);
    if (g) { nuevo.comment = g.comment; nuevo.config = g.config; }
  }
  trasCambio();
}
function quitarGrupo(grupoId: string) {
  const g = grupoById(grupoId);
  receta.bloques = receta.bloques.filter((b) => b.grupoId !== grupoId);
  receta.expandidos = receta.expandidos.filter((id) => id !== grupoId);
  trasCambio();
  if (g) toast(`Conjunto «${g.nombre}» retirado`);
}

/* ---------- cobertura y validación ---------- */
function cubierta(faseId: string): string[] | false {
  const bloques = receta.bloques.filter((b) => b.fase === faseId);
  const grupos = [...new Set(receta.bloques.filter((b) => b.grupoId).map((b) => b.grupoId!))]
    .map((gid) => grupoById(gid)!)
    .filter((g) => g && g.faseAncla === faseId);
  if (!bloques.length && !grupos.length) return false;
  return [
    ...bloques.map((b) => piezaDe(b)?.nombre || 'Custom'),
    ...grupos.map((g) => g.nombre),
  ];
}
function validar() {
  const items: { sev: string; fase?: string; msg: string }[] = [];
  for (const f of FASES) {
    const activa = receta.fasesActivas.includes(f.id);
    const cub = cubierta(f.id);
    if (!activa && f.nivel === 'obligatoria') items.push({ sev: 'error', fase: f.id, msg: `Fase obligatoria <b>desactivada</b>: ${f.nombre}. Sin ella el RAG no funciona.` });
    else if (activa && !cub) {
      if (f.nivel === 'obligatoria') items.push({ sev: 'error', fase: f.id, msg: `Fase obligatoria sin cubrir: <b>${f.nombre}</b>. Añade una pieza o un conjunto que la incluya.` });
      else if (f.nivel === 'recomendada') items.push({ sev: 'aviso', fase: f.id, msg: AVISOS[f.id] || `Fase recomendada vacía: <b>${f.nombre}</b>.` });
    }
  }
  // R3 · la píldora debe caber en el embedding
  const chunkBloque = receta.bloques.find((b) => b.fase === 'chunking' && b.config?.pildora);
  const embBloque = receta.bloques.find((b) => b.fase === 'embedding' && piezaDe(b)?.maxTokens);
  if (chunkBloque && embBloque) {
    const pildora = Number(chunkBloque.config!.pildora);
    const max = piezaDe(embBloque)!.maxTokens!;
    if (pildora > max) items.push({ sev: 'error', fase: 'chunking', msg: `La píldora (${pildora} tokens) <b>no cabe</b> en el embedding elegido (${max} tokens): reduce la píldora o cambia de modelo.` });
  }
  // R4 · grupos que requieren embedding externo
  for (const g of GRUPOS) {
    if (!g.embeddingExterno) continue;
    const presente = receta.bloques.some((b) => b.grupoId === g.id);
    if (presente && receta.fasesActivas.includes('embedding') && !receta.bloques.some((b) => b.fase === 'embedding'))
      items.push({ sev: 'aviso', fase: 'embedding', msg: `<b>${g.nombre}</b> necesita un modelo de embedding externo: elige uno en la fase Embedding.` });
  }
  // R4 · conjuntos incompatibles entre sí (p. ej. objetivos distintos: multitenant vs no)
  const conflictosVistos = new Set<string>();
  for (const g of GRUPOS) {
    if (!g.conflicts || !receta.bloques.some((b) => b.grupoId === g.id)) continue;
    const rival = g.conflicts.map(grupoById).find((r) => r && receta.bloques.some((b) => b.grupoId === r.id));
    if (!rival) continue;
    const clave = [g.id, rival.id].sort().join('|');
    if (conflictosVistos.has(clave)) continue;
    conflictosVistos.add(clave);
    items.push({ sev: 'error', msg: `<b>${g.nombre}</b> y <b>${rival.nombre}</b> persiguen objetivos distintos y no pueden convivir: quita uno de los dos.` });
  }
  // R7 · integraciones aprovechables
  const tiene = (pid: string) => receta.bloques.some((b) => b.pieza === pid);
  if ((tiene('almacenamiento.weaviate') || tiene('almacenamiento.pinecone')) && receta.bloques.some((b) => b.fase === 'embedding'))
    items.push({ sev: 'info', fase: 'embedding', msg: '<b>Integración aprovechable:</b> tu almacén integra embedding como módulo; podrías ahorrarte la pieza dedicada.' });
  if (receta.bloques.length && !items.some((i) => i.sev === 'error')) items.push({ sev: 'ok', msg: 'Receta completa: todas las fases obligatorias activas están cubiertas.' });
  return items;
}

/* ---------- render ---------- */
let itemsValidacion: { sev: string; fase?: string; msg: string }[] = [];
function renderTodo() {
  itemsValidacion = validar();
  renderSelector(); renderPaleta(); renderLienzo(); renderPanel(); renderMarcasGrupos(); initIconos();
}

/* marcas laterales: cada conjunto abraza con una llave las fases que cubre */
function renderMarcasGrupos() {
  const rail = document.querySelector('#marcas-rail') as HTMLElement | null;
  if (!rail) return;
  const ids = [...new Set(receta.bloques.filter((b) => b.grupoId).map((b) => b.grupoId!))];
  const marcas: string[] = [];
  for (const gid of ids) {
    const g = grupoById(gid); if (!g) continue;
    const fases = [...new Set(receta.bloques.filter((b) => b.grupoId === gid).map((b) => b.fase))];
    const els = fases.map((f) => document.querySelector(`.carril[data-fase="${f}"]`)).filter(Boolean) as HTMLElement[];
    if (!els.length) continue;
    const top = Math.min(...els.map((el) => el.offsetTop));
    const bottom = Math.max(...els.map((el) => el.offsetTop + el.offsetHeight));
    if (!isFinite(top) || !isFinite(bottom) || bottom <= top) continue;
    // conector triangular por cada fase cubierta: el bloque toca y enchufa la franja
    const conectores = els.map((el) => {
      const cy = el.offsetTop + el.offsetHeight / 2 - top;
      return `<span class="mg-conn" style="top:${cy - 7}px"></span>`;
    }).join('');
    marcas.push(`<div class="marca-grupo" data-grupo="${gid}" style="--c:${colorDeGrupo(gid)};top:${top}px;height:${bottom - top}px" title="${esc(g.nombre)} · cubre ${fases.map((f) => faseById(f)?.nombre || f).join(', ')} — clic: expandir/colapsar · doble clic: ficha">
      ${conectores}<span class="mg-cuerpo">${icono(g.icon)}<span class="mg-nombre">${esc(g.nombre)}</span>${langsDeGrupo(g).length ? `<span class="mg-lang">${langsDeGrupo(g).join(' · ')}</span>` : ''}</span>
    </div>`);
  }
  rail.innerHTML = marcas.join('');
  initIconos();
}

function renderSelector() {
  $('#selector-fases')!.innerHTML = FASES.map((f) => {
    const on = receta.fasesActivas.includes(f.id);
    const conError = itemsValidacion.some((i) => i.sev === 'error' && i.fase === f.id);
    const cls = ['fase-chip', on ? 'on' : '', on ? NIVEL_CLS[f.nivel] : '', !on && f.nivel === 'obligatoria' ? 'ob-off' : '', conError ? 'con-error' : ''].join(' ');
    return `<span class="${cls}" data-toggle-fase="${f.id}" title="${esc(f.desc)}">${conError ? '⛔ ' : ''}${icono(f.icon)} ${f.nombre}</span>`;
  }).join('');
}

/* paleta: fases plegables (memoria propia; al buscar se autoexpanden y se ocultan los grupos sin coincidencias) */
let paletaColapsadas: string[] = (() => { try { return JSON.parse(localStorage.getItem('ragcooking-paleta') || '[]'); } catch { return []; } })();
function guardarPaleta() { try { localStorage.setItem('ragcooking-paleta', JSON.stringify(paletaColapsadas)); } catch { /* noop */ } }

function renderPaleta() {
  const q = (($('#buscador') as HTMLInputElement)?.value || '').toLowerCase();
  const buscando = !!q;
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  const clsPlegada = (id: string) => (!buscando && paletaColapsadas.includes(id) ? 'plegada' : '');
  const grupos = GRUPOS.filter((g) => match(g.nombre) || match(g.tagline));
  const estaciones = ESTACIONES.map((est) => {
    const fasesHtml = FASES.filter((f) => f.est === est.id && receta.fasesActivas.includes(f.id)).map((f) => {
      const piezas = PIEZAS.filter((p) => p.fase === f.id && (match(p.nombre) || match(p.tagline)));
      if (buscando && !piezas.length) return '';
      return `<div class="fase-grupo ${clsPlegada(f.id)}">
        <div class="fase-cab" data-plegar-paleta="${f.id}">${icono('chevron-down')} ${icono(f.icon)} ${f.nombre} <span class="chip nivel-${NIVEL_CLS[f.nivel]}" style="margin-left:auto">${NIVEL_LABEL[f.nivel]}</span></div>
        <div class="cuerpo">
          ${piezas.map((p) => `<span class="pieza-chip pieza-bloque" draggable="true" data-pieza="${p.id}" title="${esc(p.tagline)}" style="--c-fase:${est.color};--c-texto:${textoSobre(est.color)}">${icono(p.icon)} ${p.nombre}${p.origin === 'propio' ? ' <span class="estrella">★</span>' : ''}${p.integrates ? ' 🔌' : ''}</span>`).join('')}
          ${buscando ? '' : `<button class="pieza-chip custom" data-custom="${f.id}">${icono('plus')} custom</button>`}
        </div>
      </div>`;
    }).join('');
    if (buscando && !fasesHtml) return '';
    return `<div class="grupo-estacion ${clsPlegada(est.id)}">
      <div class="cab estacion-cab" data-plegar-paleta="${est.id}" style="--c:${est.color};--ct:${textoSobre(est.color)}">${icono('chevron-down')} ${est.nombre}</div>
      ${fasesHtml}
    </div>`;
  }).join('');
  const conjuntosHtml = !buscando || grupos.length ? `
    <div class="grupo-estacion ${clsPlegada('conjuntos')}">
      <div class="cab estacion-cab" data-plegar-paleta="conjuntos" style="--c:var(--ciruela);--ct:#FFFFFF">${icono('chevron-down')} Conjuntos (frameworks)</div>
      <div class="fase-grupo"><div class="cuerpo">
        ${grupos.map((g) => `<span class="pieza-chip mega" draggable="true" data-grupo="${g.id}" title="${esc(g.tagline)}">${icono(g.icon)} ${g.nombre}${g.origin === 'propio' ? ' <span class="estrella">★</span>' : ''}${langsDeGrupo(g).length ? ` <span class="lang-mini">${langsDeGrupo(g).join(' · ')}</span>` : ''}</span>`).join('')}
      </div></div>
      <p style="font:italic 400 11.5px var(--serif);color:var(--tinta-2);margin:2px 4px">Un conjunto = varias fases empaquetadas. Se expande para no perder trazabilidad.</p>
    </div>` : '';
  $('#paleta')!.innerHTML = conjuntosHtml + estaciones;
  initIconos();
}

function renderLienzo() {
  const plantilla = receta.template ? 'receta base: ' + esc((TEMPLATES.find((t) => t.id === receta.template) || { nombre: '' }).nombre) : '';
  $('#canvas')!.innerHTML = `
    <div class="receta-cabecera">
      <input class="receta-input" id="nombre-receta" value="${esc(receta.name)}" aria-label="Nombre de la receta">
      <span class="plantilla">${plantilla}</span>
      ${lenguajesReceta().length ? `<span class="chip lang-receta" title="Lenguaje(s) de la receta: los conjuntos declaran el suyo; el camino libre es Python">${lenguajesReceta().join(' + ')}</span>` : ''}
      <span class="chip">${receta.fasesActivas.length}/${FASES.length} fases activas</span>
    </div>
    <p class="receta-nota">Activa fases en la columna izquierda y arrastra piezas a su franja · suelta un <b>conjunto</b> donde quieras: activa las fases que necesita, completa lo mínimo por arriba y por abajo, y se expande para no perder trazabilidad. Doble-click = ficha.</p>
    ${ESTACIONES.filter((est) => FASES.some((f) => f.est === est.id && receta.fasesActivas.includes(f.id))).map((est) => `
      <div class="banda-estacion" style="background:${est.color}">${icono(est.icon)} <span class="nombre">${est.nombre}</span> <span class="sub">· ${est.sub}</span> <span class="num">${FASES.filter((f) => f.est === est.id && receta.fasesActivas.includes(f.id)).length} fases</span></div>
      ${FASES.filter((f) => f.est === est.id && receta.fasesActivas.includes(f.id)).map((f) => carrilHTML(f)).join('')}
    `).join('')}
  <div class="marcas-rail" id="marcas-rail"></div>`;
  $('#nombre-receta')!.addEventListener('change', (e) => { receta.name = (e.target as HTMLInputElement).value; guardar(); });
}

function carrilHTML(f: Fase) {
  const cub = cubierta(f.id);
  const bloques = receta.bloques.filter((b) => b.fase === f.id);
  // avisos de validación visibles EN el carril que los genera
  const avisos = itemsValidacion.filter((i) => i.fase === f.id && i.sev !== 'ok');
  const banners = avisos.map((i) => `<div class="aviso-carril ${i.sev}"><span class="marca">${i.sev === 'error' ? '⛔' : i.sev === 'aviso' ? '▲' : 'ℹ'}</span><span>${i.msg}</span></div>`).join('');
  const tocaConjunto = receta.bloques.some((b) => b.grupoId && b.fase === f.id);
  const clsCarril = [
    avisos.some((i) => i.sev === 'error') ? 'con-error' : avisos.length ? 'con-aviso' : '',
    tocaConjunto ? 'cubierta-grupo' : '',
    !cub && f.nivel === 'obligatoria' ? 'falta' : '',
  ].join(' ');
  // el conjunto NO es una tarjeta en el carril: su entidad es la llave derecha que abraza las fases
  let html = banners;
  for (const b of bloques) {
    const g = grupoDe(b);
    if (g) {
      const expandido = receta.expandidos.includes(g.id);
      html += expandido ? bloqueHTML(b, g) : `<button class="por-grupo" data-flash-grupo="${g.id}">${icono('bot')} ${esc(bloqueNombre(b))} · por ${esc(g.nombre)} ${icono('chevrons-up-down')}</button>`;
    } else html += bloqueHTML(b);
  }
  const faltan = !cub && f.nivel === 'obligatoria';
  if (!bloques.length && !banners.length) html += cub
    ? `<div class="vacio cubierta-vacia">✓ cubierta por el conjunto · ${esc(cub.join(', '))}</div>`
    : `<div class="vacio">— vacía —${faltan ? '<span class="sugerido">⚠ fase obligatoria sin cubrir</span>' : ''}</div>`;
  const estColor = (estacionById(f.est) || {}).color || '#2B2620';
  return `<div class="carril ${clsCarril}" data-fase="${f.id}" style="--est:${estColor};--est-texto:${textoSobre(estColor)}">
    <div class="lateral" title="${esc(f.desc)}">
      <div class="titulo">${icono(f.icon)} ${f.nombre}</div>
      <div class="desc">${f.desc}</div>
      <div class="estado"><span class="chip nivel-${NIVEL_CLS[f.nivel]}">${NIVEL_LABEL[f.nivel]}</span>${avisos.length ? `<span class="chip" style="border-color:${avisos.some((i) => i.sev === 'error') ? 'var(--err);color:var(--err)' : 'var(--warn);color:#96700F'}">${avisos.length} aviso${avisos.length > 1 ? 's' : ''}</span>` : ''}${cub && !bloques.length ? `<span class="cubierto-por">✓ ${esc(cub.join(', '))}</span>` : ''}</div>
    </div>
    <div class="zona" data-drop-fase="${f.id}">${html}</div>
  </div>`;
}

function bloqueNombre(b: Bloque) { return piezaDe(b)?.nombre || grupoDe(b)?.nombre || 'Custom'; }

/* texto legible sobre color pleno (luminancia relativa) */
const textoSobre = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#3A2E10' : '#FFFFFF';
};


function bloqueHTML(b: Bloque, g?: Grupo) {
  const p = piezaDe(b);
  const color = g ? colorDeGrupo(g.id) : (estacionById(faseById(b.fase)!.est)?.color || 'var(--tinta-2)');
  const clases = ['bloque', g ? 'miembro' : '', !p ? 'custom' : ''].join(' ');
  const deGrupo = g ? `<span class="de-grupo">${icono('bot')} ${esc(g.nombre)}</span>` : '';
  let cuerpo = '';
  if (!p) cuerpo = `<div class="tagline">${esc(b.custom || 'sin descripción')}</div>`;
  else {
    cuerpo = `<div class="tagline">${esc(p.tagline)}</div>`;
    if (p.fase === 'embedding' && p.maxTokens) cuerpo += `<div class="props">
      <span class="chip" title="licencia">${p.licencia === 'open' ? '🟢 open' : '🔒 propietario'}</span>
      <span class="chip" title="idiomas">🌐 ${esc(p.idiomas || '')}</span>
      <span class="chip" title="máximo de tokens por píldora">📏 ${p.maxTokens} tokens</span>
      <span class="chip" title="dimensiones del vector">${p.dimensiones}d</span></div>`;
    if (p.pildora) cuerpo += `<div class="config-fila">píldora: <input class="pildora-input" type="number" min="50" step="50" value="${b.config?.pildora || ''}" placeholder="tokens" data-pildora="${b.id}"> tokens</div>`;
    if (p.modeloDatos || (g?.modeloDatos && b.fase === 'almacenamiento')) {
      const md = b.config?.modeloDatos || {};
      const activos = Object.entries(md).filter(([k, v]) => MODELO_DATOS.campos.some((c) => c.id === k) && (v === true || (typeof v === 'string' && v)));
      cuerpo += `<div class="config-fila">${icono('table-2')} <button class="btn mini" data-modelo="${b.id}">diseñar modelo</button>
        ${activos.map(([k]) => `<span class="chip">${MODELO_DATOS.campos.find((c) => c.id === k)?.nombre || k}</span>`).join('')}
        ${md.resumen === true ? '<span class="chip" style="border-color:var(--azafran)">embedding sobre el resumen</span>' : ''}</div>`;
    }
  }
  return `<div class="${clases}" draggable="true" data-bid="${b.id}" style="--c-fase:${color};--c-texto:${textoSobre(color)}" title="${esc(p?.tagline || b.custom || '')} — doble clic: ficha">
    <div class="acciones">
      <button data-nota="${b.id}" class="${b.comment ? 'con-nota' : ''}" title="${b.comment ? 'Nota: ' + esc(b.comment) : 'Comentario'}">${icono('message-circle')}</button>
      ${!g ? `<button class="borrar" data-borrar="${b.id}" title="Quitar">${icono('x')}</button>` : ''}
    </div>
    <div class="fila">${icono(p?.icon || 'pen-line')} <span class="nombre">${p ? p.nombre : 'Custom'}</span> ${p?.origin === 'propio' ? '<span class="estrella">★</span>' : ''}${deGrupo}</div>
    ${cuerpo}
    ${b.comment ? `<div class="comentario">${icono('message-circle')} ${esc(b.comment)}</div>` : ''}
    <textarea class="comentario-input" hidden data-comentario="${b.id}" placeholder="Tu nota sobre esta pieza…">${esc(b.comment)}</textarea>
  </div>`;
}

function renderPanel() {
  const items = itemsValidacion;
  const n = (s: string) => items.filter((i) => i.sev === s).length;
  const luz = (cls: string, cant: number, label: string) => {
    const ok = cls !== 'info' && cant === 0;
    return `<div class="luz ${cls} ${ok ? 'ok' : ''}"><span class="n">${ok ? '✓' : cant}</span><span class="t">${label}</span></div>`;
  };
  $('#semaforo')!.innerHTML = luz('err', n('error'), 'errores') + luz('warn', n('aviso'), 'avisos') + luz('info', n('info'), 'infos');
  $('#mapa-fases')!.innerHTML = FASES.map((f) => {
    const activa = receta.fasesActivas.includes(f.id);
    const cub = cubierta(f.id);
    const cls = !activa
      ? (f.nivel === 'obligatoria' ? 'falta-ob' : '')
      : cub ? 'cubierta' : f.nivel === 'obligatoria' ? 'falta-ob' : f.nivel === 'recomendada' ? 'falta-rec' : '';
    return `<div class="c ${cls}" data-ir="${f.id}" title="${f.nombre} — ${!activa ? 'desactivada' + (f.nivel === 'obligatoria' ? ' (obligatoria: error)' : '') : cub ? 'cubierta' : 'activa sin cubrir (' + f.nivel + ')'}">${f.nombre.slice(0, 3)}</div>`;
  }).join('');
  $('#lista-val')!.innerHTML = items.length ? items.map((i) => `
    <div class="item-val ${i.sev}" ${i.fase ? `data-ir="${i.fase}"` : ''}>
      <span class="sev">${i.sev === 'error' ? '● error' : i.sev === 'aviso' ? '▲ aviso' : i.sev === 'info' ? 'ℹ info' : '✓ ok'}</span>${i.msg}
    </div>`).join('') : '<div class="item-val ok"><span class="sev">✓ ok</span>Lienzo vacío: carga una plantilla para empezar.</div>';
}

/* ---------- interacción ---------- */
function irAFase(id: string) {
  const el = document.querySelector(`.carril[data-fase="${id}"]`) || document.querySelector(`.fase-chip[data-toggle-fase="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('destello'); void (el as HTMLElement).offsetWidth; el.classList.add('destello');
}
function trasCambio() { renderTodo(); guardar(); }

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const c = (sel: string) => t.closest(sel) as HTMLElement | null;
  let el: HTMLElement | null;
  if (el = c('.marca-grupo')) {
    const gid = el.dataset.grupo!;
    receta.expandidos = receta.expandidos.includes(gid) ? receta.expandidos.filter((x) => x !== gid) : [...receta.expandidos, gid];
    return trasCambio();
  }
  if (el = c('[data-plegar-paleta]')) {
    const id = el.dataset.plegarPaleta!;
    paletaColapsadas = paletaColapsadas.includes(id) ? paletaColapsadas.filter((x) => x !== id) : [...paletaColapsadas, id];
    guardarPaleta(); renderPaleta();
    return;
  }
  if (el = c('[data-toggle-fase]')) {
    const id = el.dataset.toggleFase!;
    receta.fasesActivas = receta.fasesActivas.includes(id) ? receta.fasesActivas.filter((x) => x !== id) : [...receta.fasesActivas, id];
    return trasCambio();
  }
  if (el = c('[data-ir]')) return irAFase(el.dataset.ir!);
  if (el = c('[data-flash-grupo]')) { const gid = el.dataset.flashGrupo!; receta.expandidos.push(gid); return trasCambio(); }
  if (el = c('[data-borrar]')) { receta.bloques = receta.bloques.filter((b) => b.id !== el!.dataset.borrar); return trasCambio(); }
  if (el = c('[data-quitar-grupo]')) return quitarGrupo(el.dataset.quitarGrupo!);
  if (el = c('[data-expandir]')) {
    const gid = el.dataset.expandir!;
    receta.expandidos = receta.expandidos.includes(gid) ? receta.expandidos.filter((x) => x !== gid) : [...receta.expandidos, gid];
    return trasCambio();
  }
  if (el = c('[data-variante]')) return; // lo maneja change
  if (el = c('[data-nota]')) {
    const ta = document.querySelector(`textarea[data-comentario="${el!.dataset.nota}"]`) as HTMLTextAreaElement | null;
    if (ta) { ta.hidden = !ta.hidden; if (!ta.hidden) ta.focus(); }
    return;
  }
  if (el = c('[data-custom]')) {
    const fase = el.dataset.custom!;
    const desc = prompt('Describe tu pieza custom para «' + faseById(fase)!.nombre + '» (solo descripción, sin validación):');
    if (desc && desc.trim()) { receta.bloques.push({ id: nuevoId(), fase, custom: desc.trim(), comment: '', config: {} }); trasCambio(); irAFase(fase); }
    return;
  }
  if (el = c('[data-modelo]')) return abrirModelo(el.dataset.modelo!);
  if (el = c('[data-modelo-grupo]')) {
    const gid = el.dataset.modeloGrupo!;
    const miembro = receta.bloques.find((b) => b.grupoId === gid && b.fase === 'almacenamiento') || receta.bloques.find((b) => b.grupoId === gid);
    if (miembro) return abrirModelo(miembro.id);
    return;
  }
  if (c('#btn-templates')) return abrirTemplates();
  if (c('#btn-nueva')) return abrirNueva();
  if (c('#btn-exportar')) return abrirExport();
  if (c('#btn-importar')) return abrirImport();
  if (c('#btn-descargar-json')) return descargarJSON();
  if (el = c('[data-code-lang]')) return descargarCodigo(el.dataset.codeLang!);
  if (c('#btn-copiar-json')) return copiarJSON();
  if (c('#btn-cargar-json')) return cargarJSON();
  if (el = c('[data-template]')) { const id = el.dataset.template!; cerrarModales(); return cargarTemplate(id); }
  if (el = c('[data-nueva-grupo]')) {
    const gid = el.dataset.nuevaGrupo!;
    const select = document.querySelector(`select[data-nueva-variante="${gid}"]`) as HTMLSelectElement | null;
    cerrarModales();
    return construirDesdeGrupo(gid, select?.value || grupoById(gid)!.variantes[0].id);
  }
  if (c('[data-nueva-custom]')) { cerrarModales(); cargarTemplate('rag-minimo'); return toast('Lienzo custom: las fases obligatorias y tú'); }
  if (el = c('[data-usar-grupo]')) {
    const gid = el.dataset.usarGrupo!, vid = el.dataset.variante || '';
    cerrarModales();
    if (receta.bloques.some((b) => b.grupoId === gid)) { cambiarVariante(gid, vid); return toast('Variante aplicada'); }
    colocarGrupo(gid, vid);
    return trasCambio();
  }
  if (c('.cerrar') || t.classList.contains('modal-fondo')) return cerrarModales();
});

document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.id === 'buscador') return renderPaleta();
  if (t.matches('[data-variante]')) return cambiarVariante(t.dataset.variante!, t.value);
  if (t.matches('textarea[data-comentario]')) {
    const b = receta.bloques.find((x) => x.id === t.dataset.comentario);
    if (b) { b.comment = (t as unknown as HTMLTextAreaElement).value; renderLienzo(); renderPanel(); initIconos(); guardar(); }
    return;
  }
  if (t.matches('[data-pildora]')) {
    const b = receta.bloques.find((x) => x.id === t.dataset.pildora);
    if (b) { b.config = { ...(b.config || {}), pildora: Number(t.value) || undefined }; trasCambio(); }
    return;
  }
  if (t.matches('[data-md-campo]')) {
    const id = t.dataset.mdCampo!;
    const b = receta.bloques.find((x) => x.id === t.dataset.mdBloque);
    if (b) {
      const md = { ...(b.config?.modeloDatos || {}) };
      if (t.type === 'checkbox') md[id] = t.checked;
      else md[id] = t.value;
      b.config = { ...(b.config || {}), modeloDatos: md };
      trasCambio();
    }
    return;
  }
});

document.addEventListener('dblclick', (e) => {
  const marca = (e.target as HTMLElement).closest('.marca-grupo') as HTMLElement | null;
  if (marca) return abrirFichaGrupo(marca.dataset.grupo!);
  const chipPieza = (e.target as HTMLElement).closest('[data-pieza]') as HTMLElement | null;
  if (chipPieza) return abrirFichaPieza(chipPieza.dataset.pieza!);
  const chipGrupo = (e.target as HTMLElement).closest('.paleta [data-grupo]') as HTMLElement | null;
  if (chipGrupo) return abrirFichaGrupo(chipGrupo.dataset.grupo!);
  const bl = (e.target as HTMLElement).closest('[data-bid]') as HTMLElement | null;
  if (!bl) return;
  const b = receta.bloques.find((x) => x.id === bl.dataset.bid);
  if (b) abrirFicha(b);
});

/* ---------- drag & drop ---------- */
document.addEventListener('dragstart', (e) => {
  const chip = (e.target as HTMLElement).closest('[data-pieza],[data-grupo]') as HTMLElement | null;
  if (chip) {
    if (chip.dataset.pieza) e.dataTransfer!.setData('text/plain', 'pieza:' + chip.dataset.pieza);
    else e.dataTransfer!.setData('text/plain', 'grupo:' + chip.dataset.grupo);
    e.dataTransfer!.effectAllowed = 'copy';
    return;
  }
  const bl = (e.target as HTMLElement).closest('[data-bid]') as HTMLElement | null;
  if (bl) { e.dataTransfer!.setData('text/plain', 'mover:' + bl.dataset.bid); bl.classList.add('dragging'); e.dataTransfer!.effectAllowed = 'move'; }
});
document.addEventListener('dragend', () => document.querySelectorAll('.bloque.dragging').forEach((el) => el.classList.remove('dragging')));
document.addEventListener('dragover', (e) => {
  const zona = (e.target as HTMLElement).closest('[data-drop-fase]');
  if (!zona) return;
  e.preventDefault();
  document.querySelectorAll('.dragover').forEach((el) => el !== zona && el.classList.remove('dragover'));
  zona.classList.add('dragover');
});
document.addEventListener('dragleave', (e) => {
  const zona = (e.target as HTMLElement).closest('[data-drop-fase]');
  if (zona) zona.classList.remove('dragover');
});
document.addEventListener('drop', (e) => {
  const zona = (e.target as HTMLElement).closest('[data-drop-fase]') as HTMLElement | null;
  if (!zona) return;
  e.preventDefault(); zona.classList.remove('dragover');
  const [accion, ref] = (e.dataTransfer!.getData('text/plain') || '').split(':');
  if (accion === 'pieza') {
    const p = piezaById(ref); if (!p) return;
    if (p.fase !== zona.dataset.dropFase) return toast(`Esa pieza vive en la fase «${faseById(p.fase)!.nombre}»`, true);
    receta.bloques.push({ id: nuevoId(), fase: p.fase, pieza: p.id, comment: '', config: p.modeloDefecto ? { modeloDatos: { ...p.modeloDefecto } } : {} });
    trasCambio(); irAFase(p.fase);
  } else if (accion === 'grupo') {
    const g = grupoById(ref); if (!g) return;
    const variante = g.variantes[0];
    // colisión: el conjunto cubre fases que ya tienen piezas sueltas → se ofrece sustituir
    const cubiertas = variante.atomos.map((a) => a.fase);
    const chocan = receta.bloques.filter((b) => cubiertas.includes(b.fase) && !b.grupoId);
    if (chocan.length) {
      const nombres = [...new Set(chocan.map((b) => faseById(b.fase)!.nombre))].join(', ');
      const sustituir = confirm(`«${g.nombre}» cubre fases donde ya tienes piezas (${nombres}).\n\nACEPTAR: sustituye esas piezas por las del conjunto.\nCANCELAR: conviven (podrás quitarlas a mano).`);
      if (sustituir) receta.bloques = receta.bloques.filter((b) => !cubiertas.includes(b.fase) || !!b.grupoId);
    }
    if (!colocarGrupo(g.id, variante.id)) return;
    if (!receta.expandidos.includes(g.id)) receta.expandidos.push(g.id);
    trasCambio(); irAFase(g.faseAncla);
  } else if (accion === 'mover') {
    const b = receta.bloques.find((x) => x.id === ref); if (!b) return;
    if (b.fase !== zona.dataset.dropFase) return toast('Cada pieza permanece en su fase', true);
    const objetivo = (e.target as HTMLElement).closest('[data-bid]') as HTMLElement | null;
    receta.bloques = receta.bloques.filter((x) => x.id !== ref);
    if (objetivo && objetivo.dataset.bid !== ref) {
      const idx = receta.bloques.findIndex((x) => x.id === objetivo.dataset.bid);
      receta.bloques.splice(idx < 0 ? receta.bloques.length : idx, 0, b);
    } else receta.bloques.push(b);
    trasCambio();
  }
});

/* ---------- modales ---------- */
function abrirModal(html: string) {
  let fondo = document.getElementById('modal-fondo');
  if (!fondo) { fondo = document.createElement('div'); fondo.id = 'modal-fondo'; fondo.className = 'modal-fondo'; document.body.appendChild(fondo); }
  fondo.innerHTML = `<div class="modal">${html}</div>`;
  fondo.classList.add('abierto'); initIconos();
}
function cerrarModales() { document.getElementById('modal-fondo')?.classList.remove('abierto'); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModales(); });

function abrirFicha(b: Bloque) {
  const p = piezaDe(b);
  const g = grupoDe(b);
  const f = faseById(b.fase)!;
  if (!p && !g) return abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>Pieza custom — ${f.nombre}</h2>
    <p class="tagline">Pieza propia: solo descripción, sin validación (R6).</p>
    <div class="aviso-caja hierba">${icono('quote')}<div><span class="titulo-caja">Descripción</span>${esc(b.custom)}</div></div>`);
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>${p ? p.nombre : g!.nombre} ${p?.origin === 'propio' || g?.origin === 'propio' ? '★' : ''}</h2>
    <p class="tagline">${esc(p?.tagline || g!.tagline)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      ${g
        ? `<span class="chip mega">conjunto de bloques</span><span class="chip">${icono((faseById(g.faseAncla) || { icon: 'circle' }).icon || 'circle')} ancla: ${g.faseAncla}</span>${(g.langs || []).length ? `<span class="chip">🗣 ${g.langs!.map((l) => LANG_LABEL[l]).join(' · ')} nativo</span>` : ''}`
        : `<span class="chip">${icono(f.icon)} fase: ${f.nombre} · 🐍 Python</span>`}
      ${p?.origin === 'comercial' || g?.origin === 'comercial' ? `<span class="chip">comercial${p?.proveedor || g?.proveedor ? ' · ' + esc(p?.proveedor || g!.proveedor!) : ''}</span>` : ''}
      ${p?.origin === 'propio' || g?.origin === 'propio' ? '<span class="chip propio">★ propio · github.com/JavierFrauca</span>' : ''}
      ${p?.licencia ? `<span class="chip">${p.licencia === 'open' ? '🟢 open' : '🔒 propietario'}</span><span class="chip">🌐 ${esc(p.idiomas || '')}</span><span class="chip">📏 ${p.maxTokens} tokens</span><span class="chip">${p.dimensiones}d</span>` : ''}
      ${g?.embeddingExterno ? '<span class="chip">requiere embedding externo</span>' : ''}
      ${g?.conflicts?.length ? `<span class="chip" style="border-color:var(--err);color:var(--err)">🚫 incompatible con ${g.conflicts.map((x) => grupoById(x)?.nombre || x).join(', ')} — objetivos distintos</span>` : ''}
    </div>
    ${g?.historia ? `<div class="aviso-caja oro" style="margin-top:10px">${icono('history')}<div><span class="titulo-caja">Historia</span>${esc(g.historia)}</div></div>` : ''}
    ${g?.capacidades ? `<div class="aviso-caja hierba" style="margin-top:10px">${icono('list-checks')}<div><span class="titulo-caja">Capacidades</span>${esc(g.capacidades)}</div></div>` : ''}
    ${g ? `<h3>Variantes</h3>${g.variantes.map((v) => `
      <div class="aviso-caja hierba" style="align-items:center">
        ${icono('chef-hat')}
        <div style="flex:1"><span class="titulo-caja">${esc(v.nombre)}${receta.bloques.some((x) => x.grupoId === g.id && x.variante === v.id) ? ' ✓ en uso' : ''}</span>
          <div class="atomos-lista">${v.atomos.map((a) => `<div class="atomo-fila"><span class="a-fase">${faseById(a.fase)?.nombre || a.fase}</span> ${esc(a.propio?.nombre || piezaById(a.pieza || '')?.nombre || '')}</div>`).join('')}</div>
        </div>
        <button class="btn primario mini" data-usar-grupo="${g.id}" data-variante="${v.id}">${receta.bloques.some((x) => x.grupoId === g.id) ? 'Cambiar a esta' : 'Usar'}</button>
      </div>`).join('')}
      ${receta.bloques.some((x) => x.grupoId === g.id) ? `<div class="fila-botones">
        <button class="btn" data-expandir="${g.id}" onclick="document.getElementById('modal-fondo').classList.remove('abierto')">${receta.expandidos.includes(g.id) ? icono('chevrons-up-down') + ' colapsar en el lienzo' : icono('chevrons-down-up') + ' expandir en el lienzo'}</button>
        <button class="btn" data-quitar-grupo="${g.id}" onclick="document.getElementById('modal-fondo').classList.remove('abierto')">${icono('trash-2')} quitar conjunto</button>
      </div>` : ''}` : ''}
    <div class="proscons">
      <div class="pros"><h4>Pros</h4><ul>${(p?.pros || g?.pros || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="cons"><h4>Contras</h4><ul>${(p?.cons || g?.cons || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    <p style="font-size:12.5px;color:var(--tinta-2)">${g ? '' : 'Arrástrala a la franja de su fase del lienzo para usarla. '}En el sitio completo, la ficha incluye pasos y ejemplo de código.</p>`);
}

function abrirFichaGrupo(gid: string) {
  const g = grupoById(gid); if (!g) return;
  const existente = receta.bloques.find((x) => x.grupoId === gid);
  const variante = existente?.variante || g.variantes[0].id;
  abrirFicha(existente || ({ id: 'previa', fase: g.faseAncla, grupoId: gid, variante, comment: '', config: {} } as Bloque));
}
function abrirFichaPieza(pid: string) {
  const p = piezaById(pid); if (!p) return;
  abrirFicha({ id: 'previa', fase: p.fase, pieza: pid, comment: '', config: {} } as Bloque);
}

function abrirModelo(bid: string) {
  const b = receta.bloques.find((x) => x.id === bid); if (!b) return;
  const md = b.config?.modeloDatos || {};
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>${icono('table-2')} ${MODELO_DATOS.titulo}</h2>
    <p class="tagline">${esc(MODELO_DATOS.desc)}</p>
    ${MODELO_DATOS.campos.map((c) => {
      const val = md[c.id];
      const ctl = c.tipo === 'enum'
        ? `<select data-md-campo="${c.id}" data-md-bloque="${b.id}" class="campo-ctl"><option value="">—</option>${c.opciones!.map((o) => `<option ${val === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`
        : c.tipo === 'tag' || c.tipo === 'labels'
          ? `<input type="text" class="campo-ctl" data-md-campo="${c.id}" data-md-bloque="${b.id}" value="${esc(val || '')}" placeholder="valores…">`
          : '';
      const check = c.tipo === 'bool' ? `<input type="checkbox" data-md-campo="${c.id}" data-md-bloque="${b.id}" ${val === true ? 'checked' : ''}>` : `<span class="campo-afecta">${c.afecta}</span>`;
      return `<div class="campo-form">
        ${check}
        <div><span class="campo-nombre">${c.nombre}</span><div class="campo-desc">${esc(c.desc)}</div></div>
        ${ctl}
      </div>`;
    }).join('')}
    <div class="fila-botones"><button class="btn primario cerrar">${icono('check')} Hecho</button></div>`);
}

function abrirNueva() {
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>¿Cómo empiezas?</h2>
    <p class="tagline">Lo más rápido: elige un framework y completamos contigo las fases que necesita por encima y por abajo. También puedes empezar a mano.</p>
    <div class="aviso-caja hierba" style="align-items:center">
      ${icono('wrench')}
      <div style="flex:1"><span class="titulo-caja">Custom, a mano</span>
        El lienzo clásico: fases obligatorias activas y las piezas las eliges tú. Para minds curiosas y control total.</div>
      <button class="btn" data-nueva-custom="1">Empezar a mano</button>
    </div>
    <h3 style="margin:18px 0 4px">Empezar con un framework (conjunto de bloques)</h3>
    ${GRUPOS.map((g) => `
      <div class="aviso-caja hierba" style="align-items:center">
        ${icono(g.icon)}
        <div style="flex:1">
          <span class="titulo-caja">${g.nombre}${g.origin === 'propio' ? ' ★' : ''}${g.origin === 'comercial' ? ' · ' + esc(g.proveedor || 'comercial') : ''}</span>
          ${esc(g.tagline)}
          <div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap;align-items:center">
            <select data-nueva-variante="${g.id}" style="font:500 12px var(--sans);border:1.5px solid var(--linea-2);border-radius:8px;padding:4px 8px">
              ${g.variantes.map((v) => `<option value="${v.id}">${v.nombre} (${v.atomos.length} fases)</option>`).join('')}
            </select>
            ${(g.requisitos || []).length ? `<span class="chip">+ completa ${new Set(g.requisitos!.map((r) => r.fase)).size} fases más</span>` : ''}
            ${g.origin === 'propio' ? '<span class="chip propio">★ nuestro</span>' : ''}
          </div>
        </div>
        <button class="btn primario" data-nueva-grupo="${g.id}">Cocinar con él</button>
      </div>`).join('')}
    <p style="font:italic 400 12.5px var(--serif);color:var(--tinta-2)">Los de mercado primero; los nuestros (★) al final: se ofrecen, no se imponen.</p>`);
}

function abrirTemplates() {
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>Recetas por objetivo</h2>
    <p class="tagline">Toda receta nueva arranca del RAG mínimo; el resto se eligen aquí.</p>
    ${TEMPLATES.map((t) => `
      <div class="aviso-caja hierba" style="align-items:center">
        ${icono('chef-hat')}
        <div style="flex:1"><span class="titulo-caja">${esc(t.nombre)}</span>${esc(t.desc)}
          <div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap">
            <span class="chip">${t.fasesActivas.length} fases</span>
            ${t.bloques.map((b) => `<span class="chip">${esc(piezaById(b.pieza || '')?.nombre || grupoById(b.grupo || '')?.nombre || '?')}</span>`).join('')}
          </div>
        </div>
        <button class="btn primario" data-template="${t.id}">Usar</button>
      </div>`).join('')}`);
}

/* ---------- export / import ---------- */
function JSONactual() {
  return JSON.stringify({
    schema: 'ragcooking.architecture', version: 2,
    meta: { name: receta.name, template: receta.template, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    fasesActivas: receta.fasesActivas,
    bloques: receta.bloques.map((b) => ({
      id: b.id, fase: b.fase,
      ...(b.pieza ? { pieza: b.pieza } : { custom: b.custom || '' }),
      ...(b.grupoId ? { grupoId: b.grupoId, variante: b.variante } : {}),
      comment: b.comment || undefined,
      config: b.config && Object.keys(b.config).length ? b.config : undefined,
    })),
  }, null, 2);
}
function abrirExport() {
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>Exportar receta (JSON v2)</h2>
    <p class="tagline">Fases activas, bloques (con su conjunto y variante), comentarios y configuración: píldora y modelo de datos.</p>
    <textarea id="json-out" readonly>${esc(JSONactual())}</textarea>
    <div class="fila-botones">
      <button class="btn primario" id="btn-copiar-json">${icono('copy')} Copiar</button>
      <button class="btn" id="btn-descargar-json">${icono('download')} Descargar .json</button>
    </div>
    <h3 style="margin-top:18px">Código (esqueleto del proyecto)</h3>
    <p class="tagline">Tu receta convertida en proyecto inicial. Python para el camino libre; C# · .NET vía ragkit. Las piezas sin ficha generan secciones TODO honestas.</p>
    <div class="fila-botones">
      ${lenguajesDisponibles(receta).map((l) => `<button class="btn" data-code-lang="${l.lang}" title="${l.nota}">${l.icono} ${l.label} · ${l.pct}% cubierto</button>`).join('') || '<span class="tagline">Añade piezas a la receta para generar código.</span>'}
    </div>`);
}
function descargarCodigo(lang: string) {
  const files = generarCodigo(receta, lang);
  const blob = crearZip(files);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombreZip(receta, lang);
  a.click(); URL.revokeObjectURL(a.href);
  toast(`Esqueleto ${lang === 'py' ? 'Python' : 'C# · .NET'} descargado (${files.length} ficheros)`);
}
function descargarJSON() {
  const blob = new Blob([JSONactual()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (receta.name || 'receta').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';
  a.click(); URL.revokeObjectURL(a.href); toast('Receta descargada');
}
function copiarJSON() {
  const ta = document.getElementById('json-out') as HTMLTextAreaElement;
  ta.select();
  const ok = () => toast('Copiado al portapapeles');
  (navigator.clipboard?.writeText ? navigator.clipboard.writeText(ta.value).then(ok).catch(() => { document.execCommand('copy'); ok(); }) : (document.execCommand('copy'), ok()));
}
function abrirImport() {
  abrirModal(`
    <button class="cerrar btn mini">${icono('x')} cerrar</button>
    <h2>Importar receta (JSON)</h2>
    <p class="tagline">Pega el JSON o elige el fichero. Las piezas desconocidas quedan como custom sin romper nada.</p>
    <textarea id="json-in" placeholder='{"schema":"ragcooking.architecture", …}'></textarea>
    <div class="fila-botones">
      <button class="btn primario" id="btn-cargar-json">${icono('check')} Cargar</button>
      <label class="btn">${icono('folder-open')} Elegir fichero<input type="file" accept=".json,application/json" hidden id="json-file"></label>
    </div>`);
  document.getElementById('json-file')!.addEventListener('change', (e) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { (document.getElementById('json-in') as HTMLTextAreaElement).value = r.result as string; }; r.readAsText(f);
  });
}
function cargarJSON() {
  try {
    const data = JSON.parse((document.getElementById('json-in') as HTMLTextAreaElement).value);
    if (!Array.isArray(data.bloques)) throw new Error('le falta blocks[]');
    receta = normalizar({ name: data.meta?.name || data.name, template: data.meta?.template, fasesActivas: data.fasesActivas, bloques: data.bloques, expandidos: data.expandidos });
    cerrarModales(); trasCambio(); toast('Receta importada ✓');
  } catch (err: any) { toast('JSON no válido: ' + err.message, true); }
}

/* ---------- arranque ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initTooltips();
  cargar();
  let timer: any;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(renderMarcasGrupos, 150); });
});
