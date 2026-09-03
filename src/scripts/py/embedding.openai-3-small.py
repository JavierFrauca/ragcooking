# deps: openai
# env: OPENAI_API_KEY=
# ── Embedding: text-embedding-3-small (OpenAI) ─────────────
from openai import OpenAI
cliente_openai = OpenAI()  # lee OPENAI_API_KEY del entorno

def embeber(textos: list[str]) -> list[list[float]]:
    rsp = cliente_openai.embeddings.create(model="text-embedding-3-small", input=textos)
    return [d.embedding for d in rsp.data]
