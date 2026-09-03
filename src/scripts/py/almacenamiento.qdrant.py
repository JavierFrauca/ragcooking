# deps: qdrant-client
# env: QDRANT_URL=http://localhost:6333
# ── Almacenamiento: Qdrant (filtros de payload rápidos) ───
from qdrant_client import QdrantClient, models

qdrant = QdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))
DIM = 1024  # ajusta a la dimensión de tu embedding

def guardar_qdrant(chunks, vectores, metadatos):
    if not qdrant.collection_exists("rag"):
        qdrant.create_collection("rag", vectors_config=models.VectorParams(size=DIM, distance=models.Distance.COSINE))
    qdrant.upsert("rag", points=[models.PointStruct(id=i, vector=v, payload={"texto": c, **m})
                                  for i, (c, v, m) in enumerate(zip(chunks, vectores, metadatos))])
