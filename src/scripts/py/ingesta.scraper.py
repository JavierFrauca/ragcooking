# deps: requests beautifulsoup4
# ── Ingesta: scraper web ───────────────────────────────────
import requests
from bs4 import BeautifulSoup

def scrapear(url: str) -> str:
    """Descarga una página y extrae su texto limpio."""
    html = requests.get(url, timeout=20, headers={"User-Agent": "ragcooking/0.1"}).text
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()
    return soup.get_text("\n", strip=True)
