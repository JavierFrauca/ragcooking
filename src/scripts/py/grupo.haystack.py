# deps: haystack-ai
# env: OPENAI_API_KEY
# ── Haystack 2.x: pipelines explícitos, componente a componente ──
# Dos grafos: uno indexa (convertir → trocear → embeber → guardar),
# otro responde (embeber → recuperar → plantilla → generar).

from pathlib import Path

from haystack import Pipeline
from haystack.components.builders import PromptBuilder
from haystack.components.converters import TextFileToDocument
from haystack.components.embedders import OpenAIDocumentEmbedder, OpenAITextEmbedder
from haystack.components.generators import OpenAIGenerator
from haystack.components.preprocessors import DocumentSplitter
from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever
from haystack.components.writers import DocumentWriter
from haystack.document_stores.in_memory import InMemoryDocumentStore


def indice(ruta_corpus: str = "./corpus", pildora: int = 512):
    """El grafo de indexación: de ficheros a store embebido."""
    store = InMemoryDocumentStore()
    indexar = Pipeline()
    indexar.add_component("docs", TextFileToDocument())
    indexar.add_component("trocear", DocumentSplitter(split_by="word", split_length=pildora))
    indexar.add_component("embeber", OpenAIDocumentEmbedder())
    indexar.add_component("guardar", DocumentWriter(document_store=store))
    indexar.connect("docs", "trocear")
    indexar.connect("trocear", "embeber")
    indexar.connect("embeber", "guardar")
    indexar.run({"docs": {"sources": [str(p) for p in Path(ruta_corpus).glob("**/*.txt")]}})
    return store


def preguntar(store, pregunta: str, tope: int = 5) -> str:
    """El grafo de respuesta: recuperar y responder con la plantilla delante."""
    rag = Pipeline()
    rag.add_component("embeber", OpenAITextEmbedder())
    rag.add_component("recuperar", InMemoryEmbeddingRetriever(document_store=store, top_k=tope))
    rag.add_component("plantilla", PromptBuilder(template=(
        "Responde solo con el contexto:\n"
        "{% for d in documentos %}{{ d.content }}\n{% endfor %}\n"
        "Pregunta: {{ pregunta }}"
    )))
    rag.add_component("responder", OpenAIGenerator())
    rag.connect("embeber.embedding", "recuperar.query_embedding")
    rag.connect("recuperar.documents", "plantilla.documentos")
    rag.connect("plantilla.prompt", "responder.prompt")
    salida = rag.run({"embeber": {"text": pregunta}, "plantilla": {"pregunta": pregunta}})
    return salida["responder"]["replies"][0]


if __name__ == "__main__":
    print(preguntar(indice(), "¿Qué dice el corpus sobre el tema que te interesa?"))
