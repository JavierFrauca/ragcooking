# deps:
# ── Medición de ruido: test de colisiones entre dominios ──
QUERIES_PRUEBA = [  # dataset mínimo: pregunta → dominio esperado
    {"q": "¿Cuánto es la indemnización por despido?", "dominio": "laboral"},
    {"q": "¿Cómo se calcula el IRPF de la nómina?", "dominio": "fiscal"},
]

def medir_colisiones() -> list[dict]:
    """¿Mi chunk asoma en preguntas de dominios ajenos? Ruido detectado."""
    colisiones = []
    for t in QUERIES_PRUEBA:
        for r in recuperar(t["q"], top_k=5):
            if r["meta"].get("dominio") not in (t["dominio"], "general"):
                colisiones.append({"q": t["q"], "intruso": r["meta"].get("dominio"), "texto": r["texto"][:60]})
    return colisiones  # TODO: ampliar el dataset con tu caso real
