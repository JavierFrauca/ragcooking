# deps: llama-index
# env: OPENAI_API_KEY
# ── LlamaIndex: el conjunto entero en su abstracción nativa ──
# Ingesta → píldoras → índice → recuperación → respuesta. LlamaIndex elige
# por ti el embedding por defecto (OpenAI); para BGE-M3 local usa
# HuggingFaceEmbedding(model_name="BAAI/bge-m3") en Settings.embed_model.

from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter


def indice(ruta_corpus: str = "./corpus", pildora: int = 512):
    """De la carpeta al índice: documentos, píldoras y vectores en tres líneas."""
    docs = SimpleDirectoryReader(ruta_corpus).load_data()
    nodos = SentenceSplitter(chunk_size=pildora, chunk_overlap=64).get_nodes_from_documents(docs)
    return VectorStoreIndex(nodes=nodos)


def preguntar(indice, pregunta: str, tope: int = 5) -> str:
    """Recuperación + síntesis: el query_engine es su híbrido con generación."""
    motor = indice.as_query_engine(similarity_top_k=tope)
    return str(motor.query(pregunta))


if __name__ == "__main__":
    print(preguntar(indice(), "¿Qué dice el corpus sobre el tema que te interesa?"))
