# deps: python-frontmatter
# ── Metaetiquetado por frontmatter YAML del documento ──────
import frontmatter

def metadatos_por_frontmatter(ruta_md: Path) -> dict:
    """El documento se describe a sí mismo: dominio/etiquetas en cabecera."""
    doc = frontmatter.load(str(ruta_md))
    return {"dominio": doc.metadata.get("dominio", "general"),
            "etiquetas": doc.metadata.get("etiquetas", [])}
