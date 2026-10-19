import json
from pathlib import Path

import pytest

from app.taxonomy import BREAKING_HOURS, DEFAULT_DISTRICT, DEFAULT_STATE, DISTRICTS, PRIORITIES, SCOPE_KEYS, SECTION_DEFS, STATES

CONTRACT = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "contracts.json"


@pytest.mark.skipif(not CONTRACT.exists(), reason="monorepo contracts not present (API-only checkout)")
def test_sections_match_shared_contract():
    shared = json.loads(CONTRACT.read_text("utf-8"))
    assert [
        (s["key"], s["en"], s["hi"], s["color"], s["about"], s["aboutHi"]) for s in shared["sections"]
    ] == [(d.key, d.name, d.name_hi, d.color, d.about, d.about_hi) for d in SECTION_DEFS]
    assert [s["key"] for s in shared["scopes"]] == list(SCOPE_KEYS)


@pytest.mark.skipif(not CONTRACT.exists(), reason="monorepo contracts not present (API-only checkout)")
def test_places_match_shared_contract():
    shared = json.loads(CONTRACT.read_text("utf-8"))
    assert [(s["code"], s["en"], s["hi"]) for s in shared["states"]] == list(STATES)
    assert {
        state: [(d["key"], d["en"], d["hi"], d.get("city", "")) for d in rows] for state, rows in shared["districts"].items()
    } == {state: list(rows) for state, rows in DISTRICTS.items()}
    assert shared["defaultLocation"] == {"state": DEFAULT_STATE, "district": DEFAULT_DISTRICT}
    assert [p["key"] for p in shared["priorities"]] == list(PRIORITIES)
    assert shared["breakingHours"] == BREAKING_HOURS


def test_category_names_stay_plain_and_positive():
    names = {d.key: d.name for d in SECTION_DEFS}
    assert names["safety"] == "Safety" and names["justice"] == "Justice" and names["health"] == "Health"
    assert not {"crime", "law", "accidents"} & {n.lower() for n in names.values()}
