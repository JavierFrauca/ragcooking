# deps: openai
# env: OPENAI_API_KEY=
# ── Síntesis: doble campo, resumen firmado + original ─────
def resumir(texto: str) -> str:
    """Resumen compacto: se recupera por él, se responde con el original."""
    rsp = cliente_openai.chat.completions.create(
        model=os.getenv("LLM_TIER2", "gpt-4o-mini"),
        messages=[{"role": "user", "content": f"Resume en 2-3 frases fieles:\n\n{texto[:6000]}"}],
    )
    return rsp.choices[0].message.content or texto[:300]
