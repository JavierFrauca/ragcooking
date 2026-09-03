# deps:
# ── Metaetiquetado: metadatos de seguridad (antes de ingestar) ──
def metadatos_seguridad(tenant: str, nivel_acceso: str = "interno", **extra) -> dict:
    """Tenant, nivel de acceso, país… para el filtro determinista."""
    return {"tenant": tenant, "nivel_acceso": nivel_acceso, **extra}
