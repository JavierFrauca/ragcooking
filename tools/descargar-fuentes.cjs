// Descarga las tipografías de Google Fonts y las autohospeda en public/fonts.
// Genera src/styles/fuentes.css con las URLs locales. Uso: node tools/descargar-fuentes.cjs
const fs = require('fs');
const path = require('path');

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

(async () => {
  const res = await fetch(CSS_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('no se pudo descargar el CSS de Google Fonts: ' + res.status);
  let css = await res.text();

  const dir = path.join(__dirname, '..', 'public', 'fonts');
  fs.mkdirSync(dir, { recursive: true });

  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g) || [])];
  console.log('ficheros woff2:', urls.length);
  for (const u of urls) {
    const nombre = u.split('/').pop();
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('fallo descargando ' + u);
    fs.writeFileSync(path.join(dir, nombre), Buffer.from(await r.arrayBuffer()));
    css = css.split(u).join('/fonts/' + nombre);
  }
  const destino = path.join(__dirname, '..', 'src', 'styles', 'fuentes.css');
  fs.writeFileSync(destino, '/* Tipografías autohospedadas (RGPD: sin peticiones a terceros).\n   Regenerar con: node tools/descargar-fuentes.cjs */\n' + css);
  console.log('fuentes.css generado con', urls.length, 'ficheros locales');
})();
