# deps: pytesseract pdf2image
# env: TESSERACT_CMD=
# ── Ingesta: OCR para documentos escaneados ────────────────
import pytesseract
from pdf2image import convert_from_path

def ocr_pdf(ruta: Path) -> str:
    """Texto de un PDF escaneado vía OCR (requiere tesseract instalado)."""
    if os.getenv("TESSERACT_CMD"):
        pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
    paginas = convert_from_path(str(ruta), dpi=200)
    return "\n\n".join(pytesseract.image_to_string(p, lang="spa+eng") for p in paginas)
