# deps:
# ── Metaetiquetado por sidecar JSON (doc.pdf → doc.json) ───
import json

def metadatos_por_sidecar(ruta_doc: Path) -> dict:
    """Los metadatos viajan en un JSON con el mismo nombre."""
    sidecar = ruta_doc.with_suffix(".json")
    if sidecar.exists():
        return json.loads(sidecar.read_text(encoding="utf-8"))
    return {"dominio": "general", "etiquetas": []}
