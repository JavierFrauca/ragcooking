# deps: azure-search-documents azure-identity openai
# env: AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_API_KEY, AZURE_SEARCH_INDICE, OPENAI_API_KEY
# ── Azure AI Search: índice gestionado con vectores + texto ──
# Un índice con campo denso (HNSW) y texto searchable: el híbrido
# lo sirve la plataforma. El embedding aquí es OpenAI (1536d).

import os

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    VectorSearch,
    VectorSearchProfile,
)
from azure.search.documents.models import VectorizedQuery
from openai import OpenAI

ENDPOINT = os.environ["AZURE_SEARCH_ENDPOINT"]
CREDENCIAL = AzureKeyCredential(os.environ["AZURE_SEARCH_API_KEY"])
INDICE = os.environ.get("AZURE_SEARCH_INDICE", "ragcooking")
DIMENSIONES = 1536

CAMPOS = [
    SearchField(name="id", type=SearchFieldDataType.String, key=True),
    SearchField(name="titulo", type=SearchFieldDataType.String, searchable=True),
    SearchField(name="texto", type=SearchFieldDataType.String, searchable=True),
    SearchField(name="embedding", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                searchable=True, vector_search_dimensions=DIMENSIONES,
                vector_search_profile_name="perfil-hnsw"),
]
BUSQUEDA = VectorSearch(
    algorithms=[HnswAlgorithmConfiguration(name="hnsw-config")],
    profiles=[VectorSearchProfile(name="perfil-hnsw", algorithm_configuration_name="hnsw-config")],
)


def crear_indice() -> None:
    """La guardia del esquema: crearlo si no existe es idempotente."""
    SearchIndexClient(ENDPOINT, CREDENCIAL).create_or_update_index(
        SearchIndex(name=INDICE, fields=CAMPOS, vector_search=BUSQUEDA)
    )


def guardar(pildoras: list[dict]) -> None:
    """Sube píldoras ya embebidas: [{id, titulo, texto, embedding}, ...]."""
    SearchClient(ENDPOINT, INDICE, CREDENCIAL).upload_documents(pildoras)


def preguntar(pregunta: str, tope: int = 5) -> list[dict]:
    """Vector search kNN; añade search_text=pregunta para el modo híbrido."""
    vector = OpenAI().embeddings.create(
        input=[pregunta], model="text-embedding-3-small"
    ).data[0].embedding
    cliente = SearchClient(ENDPOINT, INDICE, CREDENCIAL)
    hits = cliente.search(
        search_text=None,
        vector_queries=[VectorizedQuery(vector=vector, k_nearest_neighbors=tope, fields="embedding")],
        select=["titulo", "texto"],
    )
    return [{"titulo": h["titulo"], "texto": h["texto"], "score": h["@search.score"]} for h in hits]


if __name__ == "__main__":
    crear_indice()
    for hit in preguntar("¿Qué dice el corpus sobre el tema que te interesa?"):
        print(f"{hit['score']:.3f} [{hit['titulo']}] {hit['texto'][:80]}…")
