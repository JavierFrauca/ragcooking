// Fuente única de verdad: catalogo.json. Todo el sitio (biblioteca, diccionario,
// editor, validador) renderiza desde aquí. Actualizando el JSON se actualiza todo.
import catalogo from './catalogo.json';

export type Nivel = 'obligatoria' | 'recomendada' | 'opcional';
export type Origen = 'comunidad' | 'comercial' | 'propio';

export interface Estacion { id: string; nombre: string; sub: string; color: string; icon: string }
export interface Fase { id: string; est: string; nivel: Nivel; icon: string; nombre: string; desc: string }

export interface Pieza {
  id: string; fase: string; nombre: string; icon: string;
  level: 'core' | 'avanzada' | 'especializada';
  origin: Origen;
  tagline: string;
  pros: string[]; cons: string[];
  /** propiedades de modelos de embedding */
  proveedor?: string; licencia?: 'open' | 'propietario'; idiomas?: string; maxTokens?: number; dimensiones?: number;
  /** la pieza define/configura el tamaño de píldora (chunking) */
  pildora?: boolean;
  /** la pieza admite diseñador de modelo de datos (almacenes) */
  modeloDatos?: boolean;
  /** capacidades integradas opcionales (p. ej. embedding en Weaviate) */
  integrates?: string[];
}

export interface Atomo { fase: string; pieza?: string; propio?: { nombre: string; desc: string } }
export interface Variante { id: string; nombre: string; atomos: Atomo[] }
export interface Grupo {
  id: string; nombre: string; icon: string; origin: Origen; faseAncla: string;
  tagline: string; proveedor?: string;
  embeddingExterno?: boolean; modeloDatos?: boolean;
  /** fases mínimas que el conjunto necesita por arriba y por abajo, con pieza por defecto (tendencia de mercado) */
  requisitos?: { fase: string; pieza: string }[];
  /** conjuntos incompatibles con este (objetivos distintos); el editor impide combinarlos */
  conflicts?: string[];
  /** lenguajes nativos del conjunto ('py' Python · 'dotnet' C#/.NET); las piezas sueltas (camino libre) son Python por defecto */
  langs?: ('py' | 'dotnet')[];
  pros: string[]; cons: string[];
  variantes: Variante[];
}

export interface Plantilla {
  id: string; nombre: string; arranque?: boolean; desc: string;
  fasesActivas: string[];
  bloques: { pieza?: string; grupo?: string; variante?: string }[];
}

export interface CampoModelo {
  id: string; tipo: 'bool' | 'tag' | 'labels' | 'enum';
  nombre: string; desc: string; afecta: string; opciones?: string[];
}

export interface Termino { t: string; def: string; mas?: string }
export interface SeccionDiccionario { id: string; nombre: string; icon: string; desc: string; terminos: Termino[] }

export const ESTACIONES = catalogo.estaciones as Estacion[];
export const FASES = catalogo.fases as Fase[];
export const PIEZAS = catalogo.piezas as Pieza[];
export const GRUPOS = catalogo.grupos as Grupo[];
export const PLANTILLAS = catalogo.plantillas as Plantilla[];
export const DICCIONARIO = (catalogo.diccionario as { secciones: SeccionDiccionario[] }).secciones;
/** mapa plano término → definición, para tooltips de todo el sitio */
export const TERMINOS = Object.fromEntries(DICCIONARIO.flatMap((s) => s.terminos.map((t) => [t.t, t.def]))) as Record<string, string>;
export const MODELO_DATOS = catalogo.modeloDatos as { titulo: string; desc: string; campos: CampoModelo[] };

export const faseById = (id: string) => FASES.find((f) => f.id === id);
export const piezaById = (id: string) => PIEZAS.find((p) => p.id === id);
export const grupoById = (id: string) => GRUPOS.find((g) => g.id === id);
export const estacionById = (id: string) => ESTACIONES.find((e) => e.id === id);

export const NIVEL_LABEL: Record<Nivel, string> = { obligatoria: 'Obligat.', recomendada: 'Recom.', opcional: 'Opcional' };
export const NIVEL_CLS: Record<Nivel, string> = { obligatoria: 'ob', recomendada: 'rec', opcional: 'opc' };
