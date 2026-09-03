/**
 * ragcooking-proxy — Cloudflare Worker
 * Proxy OpenAI-compatible para el cocinador IA de ragcooking.info.
 * La clave del LLM vive AQUÍ (en el entorno del worker), nunca en el
 * navegador ni en git. El usuario NO necesita API key.
 *
 * Deploy:
 *   cd worker && npm i -g wrangler && wrangler login
 *   wrangler secret put GLM_KEY     (pega tu clave de bigmodel.cn)
 *   wrangler deploy
 *   → te da la URL: https://ragcooking-proxy.<tu-subdominio>.workers.dev
 *   → esa URL se pone como preset en el editor de ragcooking
 *
 * Seguridad:
 *   - CORS: solo ragcooking.info (y localhost para dev)
 *   - Rate limit: MAX_REQUESTS_PER_HOUR por IP (KV, sin coste)
 *   - La clave SOLO existe como secret de Cloudflare (env.GLM_KEY)
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    // Solo POST
    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405, env);
    }

    // CORS: solo nuestros orígenes
    const origin = request.headers.get("Origin") || "";
    if (origin !== env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN_DEV) {
      return json({ error: "origin not allowed" }, 403, env);
    }

    // Rate limit por IP (simple, en memoria del worker — se resetea por isolado)
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rateKey = `rate:${ip}:${new Date().getISOString().slice(0, 13)}`; // por hora
    let count = parseInt((await env.RATE_KV?.get(rateKey)) || "0", 10);
    if (count >= parseInt(env.MAX_REQUESTS_PER_HOUR || "20", 10)) {
      return json({ error: `rate limit: máx ${env.MAX_REQUESTS_PER_HOUR} cocinadas/hora` }, 429, env);
    }
    await env.RATE_KV?.put(rateKey, String(count + 1), { expirationTtl: 3600 });

    // Leer el cuerpo (chat/completions del cocinador)
    const body = await request.text();

    // Validar tamaño (evitar payloads gigantes)
    if (body.length > 50_000) {
      return json({ error: "payload demasiado grande" }, 413, env);
    }

    // Proxy al upstream (GLM bigmodel) con NUESTRA clave
    const upstream = env.UPSTREAM || "https://open.bigmodel.cn/api/paas/v4";
    const rsp = await fetch(upstream + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GLM_KEY}`,
      },
      body: body,
    });

    // Devolver la respuesta con CORS
    return new Response(rsp.body, {
      status: rsp.status,
      headers: {
        ...corsHeaders(request, env),
        "Content-Type": "application/json",
      },
    });
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin === env.ALLOWED_ORIGIN || origin === env.ALLOWED_ORIGIN_DEV;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders({ headers: { get: () => "" } }, env) },
  });
}
