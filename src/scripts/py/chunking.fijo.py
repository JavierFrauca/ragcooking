# deps:
# ── Chunking fijo: la píldora de información ───────────────
CHUNK_SIZE = __PILDORA__  # tokens aprox. (definido en la receta)
CHUNK_OVERLAP = int(CHUNK_SIZE * 0.15)

def trocear(texto: str) -> list[str]:
    """Trocea en píldoras de tamaño fijo con solape."""
    palabras = texto.split()
    paso = max(1, CHUNK_SIZE - CHUNK_OVERLAP)
    return [" ".join(palabras[i:i + CHUNK_SIZE]) for i in range(0, len(palabras), paso)]
