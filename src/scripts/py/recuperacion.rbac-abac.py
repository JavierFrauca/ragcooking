# deps:
# ── Recuperación: RBAC/ABAC — identidad → reglas → filtro ─
def where_para_usuario(usuario: dict) -> dict:
    """Nunca el LLM decide quién accede a qué: aquí se fabrica el filtro."""
    reglas = [{"tenant": usuario["tenant"]}]
    if usuario.get("rol") != "admin":
        reglas.append({"nivel_acceso": {"$ne": "confidencial"}})
    return {"$and": reglas}
