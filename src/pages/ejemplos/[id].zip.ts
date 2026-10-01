/* El ejemplo completo de cada receta, prerenderizado en build:
   mismo generador que el constructor, mismo andamiaje con modo demo. */
import type { APIRoute } from 'astro';
import { TEMPLATES } from '../../data/templates';
import { piezaById, grupoById } from '../../data/catalogo';
import { generarCodigo, crearZipBytes, nombreZip } from '../../scripts/codegen';
import type { Receta } from '../../scripts/tipos';

export const prerender = true;

export function getStaticPaths() {
  return TEMPLATES.map((t) => ({ params: { id: t.id } }));
}

export const GET: APIRoute = ({ params }) => {
  const t = TEMPLATES.find((x) => x.id === params.id)!;
  const bloques = t.bloques.map((b, i) => ({
    id: `b-${i + 1}`,
    fase: b.pieza
      ? piezaById(b.pieza)?.fase || t.fasesActivas[0]
      : grupoById(b.grupo || '')?.faseAncla || t.fasesActivas[0],
    ...(b.pieza ? { pieza: b.pieza } : { grupoId: b.grupo }),
  }));
  const receta = { name: t.nombre, fasesActivas: [...t.fasesActivas], bloques } as unknown as Receta;
  const zip = new Blob([crearZipBytes(generarCodigo(receta, 'py'))], { type: 'application/zip' });
  return new Response(zip, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${nombreZip(receta, 'py')}"`,
    },
  });
};
