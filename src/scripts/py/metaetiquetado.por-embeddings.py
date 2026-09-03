# deps:
# ── Metaetiquetado: clasificación semántica por embeddings ─
# La lista de dominios DEBE estar bien definida y acotada (fase Modelo)
DOMINIOS = {"laboral": "convenios, contratos, despido, IRPF de nóminas",
            "fiscal": "impuestos, IVA, IRPF declaraciones",
            "general": "documentación general de la empresa"}

def clasificar_por_embeddings(texto: str, umbral: float = 0.35) -> tuple[str, float]:
    """Compara el embedding del texto con cada dominio (coseno)."""
    import math
    def coseno(a, b):
        return sum(x * y for x, y in zip(a, b)) / (math.sqrt(sum(x*x for x in a)) * math.sqrt(sum(y*y for y in b)) + 1e-9)
    v = embeber([texto])[0]
    mejor, score = "general", -1.0
    for dominio, desc in DOMINIOS.items():
        s = coseno(v, embeber([desc])[0])
        if s > score:
            mejor, score = dominio, s
    return (mejor, score) if score >= umbral else ("RECHAZADO", score)
