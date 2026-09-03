# deps: chromadb
# ── Almacenamiento: Chroma (persistente en ./chroma) ───────
import chromadb

chroma = chromadb.PersistentClient(path="./chroma")
coleccion = chroma.get_or_create_collection("rag")

def guardar(chunks, vectores, metadatos):
    ids = [f"chunk-{i}-{hash(c) & 0xffffff:x}" for i, c in enumerate(chunks)]
    coleccion.upsert(ids=ids, documents=list(chunks), embeddings=list(vectores), metadatos=list(metadatos))
