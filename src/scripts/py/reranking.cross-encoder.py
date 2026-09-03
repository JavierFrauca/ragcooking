# deps: sentence-transformers
# ── Rerank: cross-encoder local (ms-marco MiniLM) ──────────
from sentence_transformers import CrossEncoder
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank(pregunta: str, candidatos: list[dict], top_k: int = 3) -> list[dict]:
    pares = [(pregunta, c["texto"]) for c in candidatos]
    for c, s in zip(candidatos, reranker.predict(pares)):
        c["score"] = float(s)
    return sorted(candidatos, key=lambda c: -c["score"])[:top_k]
