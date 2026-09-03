# deps: requests
# env: SEMILLA_URL=https://ejemplo.com
# ── Corpus: páginas web (semilla) ──────────────────────────
import requests

SEMILLA = os.getenv("SEMILLA_URL", "https://ejemplo.com")

def paginas_semilla() -> list[str]:
    """URLs del corpus web: siembra aquí tu sitemap o lista."""
    return [SEMILLA]  # TODO: siembra tu lista de URLs o sitemap
