"""Seeds a project whose last turn is an UNANSWERED question round.

Used as a fixture for the question-panel checks so verifying it costs no AI budget.
Idempotent: re-running replaces the same project.
    cd /app/backend && python seed.py
"""

import asyncio
import uuid
from datetime import datetime, timezone

from lib.db import db, ensure_indexes

PROJECT_ID = "seed-questions-fixture"

QUESTIONS = [
    ("Quel est le nom de votre restaurant et son quartier ?", False,
     ["Le Comptoir du Marche", "Chez Amina", "La Table Bleue", "Je vous le donne plus tard"]),
    ("Quels services voulez-vous mettre en avant ?", True,
     ["Menu du jour", "Reservation de table", "Livraison", "Brunch du week-end", "Privatisation"]),
    ("Quel est l'objectif principal du site ?", False,
     ["Plus de reservations", "Paraitre professionnel", "Vendre en ligne", "Faire connaitre la carte"]),
    ("Quelle ambiance visuelle vous ressemble ?", False,
     ["Chaleureuse et artisanale", "Minimaliste et chic", "Colore et vivant", "Sombre et gastronomique"]),
    ("Que devrait contenir un compte client ?", True,
     ["Historique des reservations", "Favoris", "Offres fidelite", "Aucun compte"]),
]


def _q(label: str, multi: bool, options: list[str]) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "label": label,
        "options": [{"id": str(uuid.uuid4()), "label": o} for o in options],
        "multi": multi,
        "allow_custom": True,
    }


async def main() -> None:
    now = datetime.now(timezone.utc)
    project = {
        "id": PROJECT_ID,
        "title": "Restaurant Fixture",
        "style": None,
        "html": None,
        "generating": False,
        "progress": None,
        "progress_step": 0,
        "share_token": None,
        "share_expires_at": None,
        "created_at": now,
        "updated_at": now,
        "messages": [
            {
                "id": str(uuid.uuid4()),
                "role": "user",
                "kind": "text",
                "text": "Project type: Restaurant & cafe.\nJe veux un site pour mon restaurant a Toulouse",
                "questions": [],
                "attachments": [],
                "site_name": None,
                "site_style": None,
                "html": None,
                "created_at": now,
            },
            {
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "kind": "questions",
                "text": "Parfait. Quelques questions et je lance la conception.",
                "questions": [_q(*q) for q in QUESTIONS],
                "attachments": [],
                "site_name": None,
                "site_style": None,
                "html": None,
                "created_at": now,
            },
        ],
    }
    await db.projects.replace_one({"id": PROJECT_ID}, project, upsert=True)
    await ensure_indexes()
    print(f"seeded project {PROJECT_ID} with {len(QUESTIONS)} unanswered questions")


if __name__ == "__main__":
    asyncio.run(main())
