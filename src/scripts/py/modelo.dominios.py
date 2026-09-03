# deps:
# ── Modelo de conocimiento: la lista ACOTADA de dominios ──
DOMINIOS = {
    "laboral": {"desc": "convenios, contratos, despido, IRPF de nóminas"},
    "fiscal": {"desc": "impuestos, IVA, declaraciones"},
    # REGLA: acota la lista ANTES de automatizar la asignación
}

def dominios_validos() -> list[str]:
    return list(DOMINIOS.keys())
