# deps:
# ── Formato: todo a Markdown ───────────────────────────────
def a_markdown(texto: str, titulo: str) -> str:
    """Bandeja común: estructura mínima en Markdown."""
    return f"# {titulo}\n\n{texto.strip()}\n"
