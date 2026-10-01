# deps: elasticsearch
# env: ELASTIC_URL, ELASTIC_API_KEY, OPENAI_API_KEY
# ── Elasticsearch: dense_vector + BM25 en el mismo índice ───
# El mapeo declara el campo denso indexado (kNN) junto al texto:
# la búsqueda knn de serie convive con el léxico, híbrido a una
# línea (reciprocal_rank_fusion en el propio DSL).

import os

from elasticsearch import Elasticsearch, helpers
from openai import OpenAI

INDICE = "ragcooking"


def cliente() -> Elasticsearch:
    return Elasticsearch(os.environ["ELASTIC_URL"], api_key=os.environ["ELASTIC_API_KEY"])


def crear_indice(es: Elasticsearch, dimensiones: int = 1536) -> None:
    """El esquema: texto para el BM25 de serie, embedding para el kNN."""
    es.indices.create(
        index=INDICE,
        mappings={
            "properties": {
                "titulo": {"type": "keyword"},
                "texto": {"type": "text"},
                "embedding": {"type": "dense_vector", "dims": dimensiones,
                              "index": True, "similarity": "cosine"},
            }
        },
        ignore=[400],  # ya existe: la ingesta es idempotente
    )


def guardar(es: Elasticsearch, pildoras: list[dict]) -> None:
    """Sube píldoras: [{id, titulo, texto, embedding}, ...]."""
    helpers.bulk(es, ({"_index": INDICE, "_id": p["id"], **p} for p in pildoras))


def preguntar(es: Elasticsearch, pregunta: str, tope: int = 5) -> list[dict]:
    """kNN contra el campo denso; el híbrido completo es añadir 'rank' RRF."""
    vector = OpenAI().embeddings.create(
        input=[pregunta], model="text-embedding-3-small"
    ).data[0].embedding
    salida = es.search(
        index=INDICE,
        knn={"field": "embedding", "query_vector": vector,
             "k": tope, "num_candidates": tope * 10},
        source=["titulo", "texto"],
    )
    return [{"titulo": h["_source"]["titulo"], "texto": h["_source"]["texto"],
             "score": h["_score"]} for h in salida["hits"]["hits"]]


if __name__ == "__main__":
    es = cliente()
    crear_indice(es)
    for hit in preguntar(es, "¿Qué dice el corpus sobre el tema que te interesa?"):
        print(f"{hit['score']:.3f} [{hit['titulo']}] {hit['texto'][:80]}…")
