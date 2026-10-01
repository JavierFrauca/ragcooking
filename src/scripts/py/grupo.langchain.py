# deps: langchain langchain-community langchain-openai chromadb
# env: OPENAI_API_KEY
# ── LangChain / LangGraph: el RAG clásico encadenado ────────
# Ingesta → píldoras → Chroma → recuperación → respuesta con fuentes.
# Para el modo agéntico (decidir CUÁNDO recuperar), crea el grafo con
# langgraph y usa `indice.as_retriever()` como herramienta del nodo
# que investiga.

from langchain.chains import RetrievalQA
from langchain_community.document_loaders import DirectoryLoader
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


def indice(ruta_corpus: str = "./corpus", pildora: int = 512):
    """Ingesta + troceo + índice vectorial persistente en ./chroma."""
    docs = DirectoryLoader(ruta_corpus).load()
    pildoras = RecursiveCharacterTextSplitter(
        chunk_size=pildora, chunk_overlap=64
    ).split_documents(docs)
    return Chroma.from_documents(pildoras, OpenAIEmbeddings())


def preguntar(db, pregunta: str, tope: int = 5):
    """Cadena de recuperación con fuentes declaradas (return_source_documents)."""
    cadena = RetrievalQA.from_chain_type(
        ChatOpenAI(), retriever=db.as_retriever(search_kwargs={"k": tope}),
        return_source_documents=True,
    )
    salida = cadena.invoke({"query": pregunta})
    fuentes = [d.metadata.get("source", "?") for d in salida["source_documents"]]
    return salida["result"], fuentes


if __name__ == "__main__":
    respuesta, fuentes = preguntar(indice(), "¿Qué dice el corpus sobre el tema que te interesa?")
    print(respuesta)
    for f in fuentes:
        print("·", f)
