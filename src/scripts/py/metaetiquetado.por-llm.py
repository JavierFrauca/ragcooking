# deps: openai
# env: OPENAI_API_KEY=
# ── Metaetiquetado: clasificador LLM (tier-2) con umbral ──
def clasificar_por_llm(texto: str, dominios: list[str], umbral: float = 0.8) -> dict:
    """Un LLM barato asigna dominio+etiquetas; por debajo del umbral, rechaza."""
    rsp = cliente_openai.chat.completions.create(
        model=os.getenv("LLM_TIER2", "gpt-4o-mini"),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": f'Devuelve {{"dominio": str, "etiquetas": [str], "confianza": float}}. '
                                           f"Dominios válidos: {', '.join(dominios)}. Confianza < {umbral} → dominio RECHAZADO."},
            {"role": "user", "content": texto[:4000]},
        ],
    )
    import json
    return json.loads(rsp.choices[0].message.content or "{}")
