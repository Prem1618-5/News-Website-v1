"""Sections (categories) and coverage scopes.

Mirrors packages/contracts/contracts.json, which is the shared source for the Reader and the Newsroom.
`tests/test_taxonomy.py` fails if the two drift apart. This copy exists because the API is deployed on
its own (Docker context apps/api) and cannot read the monorepo's packages folder.

Names are deliberately plain and positive: "Safety" covers crime and accidents, "Justice" covers courts and law.
"""
from __future__ import annotations

from typing import NamedTuple


class SectionDef(NamedTuple):
    key: str
    name: str
    name_hi: str
    color: str
    about: str
    about_hi: str


SECTION_DEFS: tuple[SectionDef, ...] = (
    SectionDef("world", "World", "दुनिया", "#0b6e78", "News from around the world.", "दुनिया भर की ख़बरें।"),
    SectionDef("politics", "Politics", "राजनीति", "#b42318", "Government, elections and public decisions.", "सरकार, चुनाव और जनहित के फ़ैसले।"),
    SectionDef("business", "Business", "व्यापार", "#17703f", "Jobs, markets, roads and the economy.", "रोज़गार, बाज़ार, सड़कें और अर्थव्यवस्था।"),
    SectionDef("tech", "Tech", "टेक", "#6b3fd6", "Phones, apps, AI and the gadgets we use.", "फ़ोन, ऐप, एआई और हमारे इस्तेमाल के गैजेट।"),
    SectionDef("sports", "Sports", "खेल", "#b83c0a", "Cricket, football and every game that matters.", "क्रिकेट, फ़ुटबॉल और हर बड़ा खेल।"),
    SectionDef("culture", "Culture", "संस्कृति", "#aa2a78", "Festivals, music, art and traditions.", "त्योहार, संगीत, कला और परंपराएँ।"),
    SectionDef("science", "Science", "विज्ञान", "#8a5a00", "Space, nature and new discoveries.", "अंतरिक्ष, प्रकृति और नई खोजें।"),
    SectionDef("health", "Health", "स्वास्थ्य", "#0a7ea4", "Hospitals, wellness and healthy living.", "अस्पताल, सेहत और स्वस्थ जीवन।"),
    SectionDef("safety", "Safety", "सुरक्षा", "#a16207", "Road safety, public safety and staying protected.", "सड़क सुरक्षा, जन सुरक्षा और बचाव की जानकारी।"),
    SectionDef("justice", "Justice", "न्याय", "#475a9e", "Courts, laws and your rights.", "अदालतें, क़ानून और आपके अधिकार।"),
    SectionDef("education", "Education", "शिक्षा", "#1d4ed8", "Schools, colleges, exams and careers.", "स्कूल, कॉलेज, परीक्षाएँ और करियर।"),
    SectionDef("environment", "Environment", "पर्यावरण", "#4d7c0f", "Parks, weather and a greener city.", "पार्क, मौसम और हरा-भरा शहर।"),
    SectionDef("entertainment", "Entertainment", "मनोरंजन", "#a21caf", "Movies, music and TV.", "फ़िल्में, संगीत और टीवी।"),
)

SECTION_KEYS: frozenset[str] = frozenset(s.key for s in SECTION_DEFS)

# Where a story happens, narrowest first. The Reader's Local / State / National / World switch.
SCOPE_KEYS: tuple[str, ...] = ("ranchi", "jharkhand", "india", "world")
