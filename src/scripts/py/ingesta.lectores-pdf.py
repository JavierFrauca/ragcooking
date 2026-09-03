# deps: pypdf
# ── Ingesta: extracción de texto de los PDFs ───────────────
from pypdf import PdfReader

def extraer_texto(ruta: Path) -> str:
    """Extrae el texto de cada página del PDF."""
    reader = PdfReader(str(ruta))
    return "\n\n".join((page.extract_text() or "") for page in reader.pages)
