# deps: openai
# env: OPENAI_API_KEY=
# ── Generación con plantilla y citas a la fuente ───────────
PLANTILLA = """Responde a la pregunta usando SOLO el contexto.
Cita cada afirmación con [n] y lista las fuentes al final.

### Contexto
{contexto}

### Pregunta
{pregunta}
"""

def responder_con_citas(pregunta: str, contexto: list[dict]) -> str:
    cuerpo = "\n\n".join(f"[{i+1}] {c['texto']} (fuente: {c['meta'].get('dominio', '?')})" for i, c in enumerate(contexto))
    rsp = cliente_openai.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[{"role": "user", "content": PLANTILLA.format(contexto=cuerpo, pregunta=pregunta)}],
    )
    return rsp.choices[0].message.content or ""
