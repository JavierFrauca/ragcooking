# deps:
# ── Metaetiquetado: vigencia y versionado ──────────────────
from datetime import date

def metadatos_vigencia(desde: str, hasta: str | None = None, version: int = 1) -> dict:
    """Los chunks caducados no compiten en la búsqueda."""
    return {"vigente_desde": desde, "vigente_hasta": hasta, "version": version,
            "_caducado": hasta is not None and hasta < date.today().isoformat()}
