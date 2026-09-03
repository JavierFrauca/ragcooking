# deps: openai
# env: OPENAI_API_KEY=
# ── Generación: LLM generador (API OpenAI-compatible) ─────
def responder(pregunta: str, contexto: list[dict]) -> str:
    fuentes = "\n\n".join(f"[{i+1}] {c['texto']}" for i, c in enumerate(contexto))
    rsp = cliente_openai.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[{"role": "system", "content": "Responde solo con el contexto. Cita las fuentes [n]."},
                  {"role": "user", "content": f"{fuentes}\n\n### Pregunta:\n{pregunta}"}],
    )
    return rsp.choices[0].message.content or ""
