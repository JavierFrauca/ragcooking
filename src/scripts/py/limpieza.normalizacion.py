# deps:
# ── Limpieza: normalización de texto ───────────────────────
import re
import unicodedata

def normalizar(texto: str) -> str:
    """Unicode NFC, espacios y líneas repetidas fuera."""
    texto = unicodedata.normalize("NFC", texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    return re.sub(r"\n{3,}", "\n\n", texto).strip()
