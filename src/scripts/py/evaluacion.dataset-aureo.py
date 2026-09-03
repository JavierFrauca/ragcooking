# deps:
# ── Evaluación: dataset áureo (Recall ≥ 90% o cero) ────────
import json
from pathlib import Path

AUREO = Path("golden.json")  # [{"pregunta": str, "respuesta_correcta": str, "fuente": str}]
UMBRAL_RECALL = 0.90

def evaluar_recall() -> float:
    """Recall@5 sobre el dataset áureo: sin él, cada cambio es un acto de fe."""
    if not AUREO.exists():
        print("⚠ Crea golden.json con tus preguntas patrón"); return 0.0
    casos = json.loads(AUREO.read_text(encoding="utf-8"))
    aciertos = sum(1 for c in casos if any(c["respuesta_correcta"][:80].lower() in r["texto"].lower()
                                           for r in recuperar(c["pregunta"])))
    recall = aciertos / max(1, len(casos))
    print(f"Recall@5 = {recall:.0%} {'✓ despliega' if recall >= UMBRAL_RECALL else '✗ NO-DEPLOYMENT (umbral 90%)'}")
    return recall
