# deps:
# ── Chunking semántico: corta donde cambia el tema ─────────
CHUNK_SIZE = __PILDORA__

def trocear(texto: str) -> list[str]:
    """Aproximación por párrafos: respeta fronteras naturales."""
    salida, chunk, n = [], [], 0
    for p in texto.split("\n\n"):
        if n + len(p.split()) > CHUNK_SIZE and chunk:
            salida.append(" ".join(chunk)); chunk, n = [], 0
        chunk.append(p); n += len(p.split())
    if chunk:
        salida.append(" ".join(chunk))
    return salida
