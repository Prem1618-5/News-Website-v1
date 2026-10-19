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

# Coverage level, narrowest first. Local stories carry a state and a district, state stories a state.
SCOPE_KEYS: tuple[str, ...] = ("local", "state", "india", "world")
# Older rows used place names as scopes; they are rewritten on start (see database.migrate_columns).
LEGACY_SCOPES: dict[str, tuple[str, str, str]] = {"ranchi": ("local", "JH", "ranchi"), "jharkhand": ("state", "JH", "")}

PRIORITIES: tuple[str, ...] = ("normal", "breaking")
BREAKING_HOURS = 6

# States and union territories: (code, English, Hindi).
STATES: tuple[tuple[str, str, str], ...] = (
    ("AP", "Andhra Pradesh", "आंध्र प्रदेश"),
    ("AR", "Arunachal Pradesh", "अरुणाचल प्रदेश"),
    ("AS", "Assam", "असम"),
    ("BR", "Bihar", "बिहार"),
    ("CG", "Chhattisgarh", "छत्तीसगढ़"),
    ("GA", "Goa", "गोवा"),
    ("GJ", "Gujarat", "गुजरात"),
    ("HR", "Haryana", "हरियाणा"),
    ("HP", "Himachal Pradesh", "हिमाचल प्रदेश"),
    ("JH", "Jharkhand", "झारखंड"),
    ("KA", "Karnataka", "कर्नाटक"),
    ("KL", "Kerala", "केरल"),
    ("MP", "Madhya Pradesh", "मध्य प्रदेश"),
    ("MH", "Maharashtra", "महाराष्ट्र"),
    ("MN", "Manipur", "मणिपुर"),
    ("ML", "Meghalaya", "मेघालय"),
    ("MZ", "Mizoram", "मिज़ोरम"),
    ("NL", "Nagaland", "नागालैंड"),
    ("OD", "Odisha", "ओडिशा"),
    ("PB", "Punjab", "पंजाब"),
    ("RJ", "Rajasthan", "राजस्थान"),
    ("SK", "Sikkim", "सिक्किम"),
    ("TN", "Tamil Nadu", "तमिलनाडु"),
    ("TS", "Telangana", "तेलंगाना"),
    ("TR", "Tripura", "त्रिपुरा"),
    ("UP", "Uttar Pradesh", "उत्तर प्रदेश"),
    ("UK", "Uttarakhand", "उत्तराखंड"),
    ("WB", "West Bengal", "पश्चिम बंगाल"),
    ("AN", "Andaman and Nicobar Islands", "अंडमान और निकोबार द्वीपसमूह"),
    ("CH", "Chandigarh", "चंडीगढ़"),
    ("DH", "Dadra and Nagar Haveli and Daman and Diu", "दादरा और नगर हवेली और दमन और दीव"),
    ("DL", "Delhi", "दिल्ली"),
    ("JK", "Jammu and Kashmir", "जम्मू और कश्मीर"),
    ("LA", "Ladakh", "लद्दाख"),
    ("LD", "Lakshadweep", "लक्षद्वीप"),
    ("PY", "Puducherry", "पुडुचेरी"),
)
STATE_CODES: frozenset[str] = frozenset(code for code, _en, _hi in STATES)

# Districts per state: (key, English, Hindi, best-known city). Only Jharkhand is listed so far.
DISTRICTS: dict[str, tuple[tuple[str, str, str, str], ...]] = {
    "JH": (
        ("bokaro", "Bokaro", "बोकारो", ""),
        ("chatra", "Chatra", "चतरा", ""),
        ("deoghar", "Deoghar", "देवघर", ""),
        ("dhanbad", "Dhanbad", "धनबाद", ""),
        ("dumka", "Dumka", "दुमका", ""),
        ("east-singhbhum", "East Singhbhum", "पूर्वी सिंहभूम", "Jamshedpur"),
        ("garhwa", "Garhwa", "गढ़वा", ""),
        ("giridih", "Giridih", "गिरिडीह", ""),
        ("godda", "Godda", "गोड्डा", ""),
        ("gumla", "Gumla", "गुमला", ""),
        ("hazaribagh", "Hazaribagh", "हज़ारीबाग", ""),
        ("jamtara", "Jamtara", "जामताड़ा", ""),
        ("khunti", "Khunti", "खूंटी", ""),
        ("koderma", "Koderma", "कोडरमा", ""),
        ("latehar", "Latehar", "लातेहार", ""),
        ("lohardaga", "Lohardaga", "लोहरदगा", ""),
        ("pakur", "Pakur", "पाकुड़", ""),
        ("palamu", "Palamu", "पलामू", "Daltonganj"),
        ("ramgarh", "Ramgarh", "रामगढ़", ""),
        ("ranchi", "Ranchi", "रांची", ""),
        ("sahibganj", "Sahibganj", "साहिबगंज", ""),
        ("seraikela-kharsawan", "Seraikela Kharsawan", "सरायकेला खरसावां", ""),
        ("simdega", "Simdega", "सिमडेगा", ""),
        ("west-singhbhum", "West Singhbhum", "पश्चिमी सिंहभूम", "Chaibasa"),
    ),
}

DEFAULT_STATE, DEFAULT_DISTRICT = "JH", "ranchi"


def is_district(state: str, district: str) -> bool:
    return any(key == district for key, *_ in DISTRICTS.get(state, ()))


def state_name(code: str) -> str:
    return next((en for c, en, _hi in STATES if c == code), "")


def district_name(state: str, key: str) -> str:
    return next((en for k, en, _hi, _city in DISTRICTS.get(state, ()) if k == key), "")
