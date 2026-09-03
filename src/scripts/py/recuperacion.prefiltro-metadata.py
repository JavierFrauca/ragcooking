# deps:
# ── Recuperación: prefiltro determinista por metadatos ────
def recuperar_prefiltrado(pregunta: str, where: dict, top_k: int = 5) -> list[dict]:
    """La semántica encuentra lo parecido; el filtro decide qué puede competir."""
    q = embeber([pregunta])[0]
    rsp = coleccion.query(query_embeddings=[q], n_results=top_k, where=where)
    return [{"texto": d, "meta": m} for d, m in zip(rsp["documents"][0], rsp["metadatas"][0])]

# Ejemplos de where (Chroma): {"dominio": "laboral"} / {"$and": [{"tenant": "acme"}, {"nivel_acceso": {"$ne": "confidencial"}}]}
