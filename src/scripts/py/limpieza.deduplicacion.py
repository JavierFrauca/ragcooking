# deps:
# ── Limpieza: deduplicación por huella de contenido ────────
import hashlib

def deduplicar(textos: list[str]) -> list[str]:
    """Elimina documentos con contenido repetido (idempotente)."""
    vistos, salida = set(), []
    for t in textos:
        h = hashlib.sha256(t.encode("utf-8")).hexdigest()
        if h not in vistos:
            vistos.add(h)
            salida.append(t)
    return salida
