# deps:
# ── Metaetiquetado por carpetas: 1er nivel = dominio ───────
def metadatos_por_carpetas(ruta: Path) -> dict:
    """Primer nivel del árbol = dominio; el resto = etiquetas."""
    partes = ruta.relative_to(CORPUS_DIR).parts
    return {"dominio": partes[0] if len(partes) > 1 else "general",
            "etiquetas": list(partes[1:-1])}
