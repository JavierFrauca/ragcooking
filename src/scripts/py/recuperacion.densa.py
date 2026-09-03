# deps:
# ── Recuperación densa por similitud semántica ─────────────
def recuperar(pregunta: str, top_k: int = 5) -> list[dict]:
    """Los chunks más parecidos en significado."""
    q = embeber([pregunta])[0]
    rsp = coleccion.query(query_embeddings=[q], n_results=top_k)
    return [{"texto": d, "meta": m} for d, m in zip(rsp["documents"][0], rsp["metadatas"][0])]
