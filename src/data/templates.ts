// Templates (recetas base) — un JSON por fichero en src/data/templates/.
// Internamente SIEMPRE "template"; "receta" es solo la etiqueta visible de UI.
// Añadir una receta = dejar un .json nuevo en la carpeta (se valida en build).
import { FASES, PIEZAS, GRUPOS } from './catalogo';

export interface Template {
  id: string;
  nombre: string;
  arranque?: boolean;
  desc: string;
  fasesActivas: string[];
  bloques: { pieza?: string; grupo?: string; variante?: string }[];
}

const ficheros = import.meta.glob<{ default: Template }>('./templates/*.json', { eager: true });
export const TEMPLATES: Template[] = Object.values(ficheros).map((m) => m.default);

// validación en build: referencias existentes, fases válidas y conflicts respetados
for (const t of TEMPLATES) {
  if (!t.id || !t.nombre || !Array.isArray(t.bloques)) throw new Error(`template inválido: ${t.id || '(sin id)'}`);
  for (const f of t.fasesActivas || []) if (!FASES.some((x) => x.id === f)) throw new Error(`template ${t.id}: fase desconocida «${f}»`);
  const gruposUsados: string[] = [];
  for (const b of t.bloques || []) {
    if (b.pieza && !PIEZAS.some((p) => p.id === b.pieza)) throw new Error(`template ${t.id}: pieza desconocida «${b.pieza}»`);
    if (b.grupo) {
      const g = GRUPOS.find((x) => x.id === b.grupo);
      if (!g) throw new Error(`template ${t.id}: grupo desconocido «${b.grupo}»`);
      gruposUsados.push(g.id);
    }
  }
  for (const gid of gruposUsados) {
    const g = GRUPOS.find((x) => x.id === gid)!;
    const rival = (g.conflicts || []).find((r) => gruposUsados.includes(r));
    if (rival) throw new Error(`template ${t.id}: ${g.id} convive con ${rival} (incompatibles)`);
  }
}
