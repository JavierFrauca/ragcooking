# deps:
# ── Metaetiquetado: dominio + etiquetas por chunk ──────────
def etiquetar(chunks: list[str], dominio: str, etiquetas: list[str]) -> list[dict]:
    """Cada chunk sale con su dominio y etiquetas (para prefiltro)."""
    return [{"texto": c, "dominio": dominio, "etiquetas": etiquetas} for c in chunks]
