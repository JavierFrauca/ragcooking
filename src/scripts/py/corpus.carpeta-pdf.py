# deps:
# env: CORPUS_DIR=./corpus
# ── Corpus: carpeta de PDFs ────────────────────────────────
CORPUS_DIR = os.getenv("CORPUS_DIR", "./corpus")

def listar_corpus() -> list[Path]:
    """Todo el corpus de entrada: PDFs de la carpeta (recursivo)."""
    return sorted(Path(CORPUS_DIR).rglob("*.pdf"))
