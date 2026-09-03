# deps: sentence-transformers
# ── Embedding: BGE-M3 en local (open, multilingüe, 8k) ─────
from sentence_transformers import SentenceTransformer

modelo_embedding = SentenceTransformer("BAAI/bge-m3")

def embeber(textos: list[str]) -> list[list[float]]:
    return modelo_embedding.encode(textos, normalize_embeddings=True).tolist()
