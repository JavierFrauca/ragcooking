# deps: psycopg[binary] pgvector
# env: PG_DSN=postgresql://postgres:postgres@localhost:5432/rag
# ── Almacenamiento: PostgreSQL + pgvector (prefiltro SQL) ──
import psycopg

PG_DSN = os.getenv("PG_DSN", "postgresql://postgres:postgres@localhost:5432/rag")

DDL = """
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS chunks (
  id bigserial PRIMARY KEY,
  texto text NOT NULL,
  embedding vector(1024),
  dominio text, etiquetas text[], tenant text,
  vigente_hasta date, nivel_acceso text DEFAULT 'interno'
);
"""

def init_pgvector():
    with psycopg.connect(PG_DSN) as con, con.cursor() as cur:
        cur.execute(DDL)
        # índice para el prefiltro determinista ANTES de la distancia
        cur.execute("CREATE INDEX IF NOT EXISTS ix_chunks_dominio ON chunks (dominio)")

def guardar_pg(chunks, vectores, metadatos):
    with psycopg.connect(PG_DSN) as con, con.cursor() as cur:
        from pgvector.psycopg import register_vector
        register_vector(cur)
        cur.executemany("INSERT INTO chunks (texto, embedding, dominio) VALUES (%s, %s, %s)",
                        [(c, v, m.get("dominio")) for c, v, m in zip(chunks, vectores, metadatos)])
