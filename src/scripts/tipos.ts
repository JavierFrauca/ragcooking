// Tipos compartidos del editor (importa las interfaces del catálogo)
import type { Pieza, Grupo, Fase } from '../data/catalogo';

export type { Pieza, Grupo, Fase };

export interface Bloque {
  id: string;
  fase: string;
  /** pieza atómica del catálogo */
  pieza?: string;
  /** pieza custom del usuario: solo descripción, sin validación */
  custom?: string;
  /** si el bloque pertenece a un conjunto (framework/grupo) */
  grupoId?: string;
  variante?: string;
  comment?: string;
  config?: {
    /** tamaño de píldora en tokens (fase chunking) */
    pildora?: number;
    /** campos del diseñador de modelo de datos (almacenes) */
    modeloDatos?: Record<string, boolean | string>;
  };
}

export interface Receta {
  name: string;
  template: string;
  fasesActivas: string[];
  bloques: Bloque[];
  /** grupos expandidos (mostrando sus bloques) */
  expandidos: string[];
  /** fases plegadas en el lienzo (solo estado de UI, no se exporta) */
  fasesColapsadas: string[];
}
