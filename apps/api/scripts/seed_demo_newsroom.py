"""Fill a local Newsroom with a believable working day, for demos. Development only.

Signs in as the seeded demo staff (see app/routers/staff_auth.py) and drives the real API, so every story passes the
same rules as in production: reporters write and send, editors review, highlight, return, approve or decline.

    python apps/api/scripts/seed_demo_newsroom.py [http://127.0.0.1:8000]
"""
import sys
import uuid

import httpx

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")
PASSWORD = "Newsroom#2026"
client = httpx.Client(base_url=BASE, timeout=30)


def login(email: str) -> dict:
    r = client.post("/api/staff-auth/login", json={"email": email, "password": PASSWORD})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['token']}"}


def doc(*paragraphs: str) -> dict:
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": p}]} for p in paragraphs]}


def call(method: str, path: str, who: dict, **kw):
    r = client.request(method, f"/api/desk{path}", headers=who, **kw)
    if r.status_code >= 400:
        raise SystemExit(f"{method} {path} -> {r.status_code}: {r.text}")
    return r.json()


def write(who: dict, **fields) -> dict:
    return call("POST", "/articles", who, json=fields)


def send(who: dict, art: dict, **sheet) -> dict:
    return call("POST", f"/articles/{art['id']}/submit", who, json={"version": art["version"], **sheet})


def publish(who: dict, art: dict, **sheet) -> dict:
    return call("POST", f"/articles/{art['id']}/publish", who, json={"version": art["version"], **sheet})


STAFF = {
    "rajiv": "rajiv.ranjan.sinha@newsapp.example", "prabhat": "prabhat.singh@newsapp.example",
    "sunita": "sunita.mahto@newsapp.example", "ananya": "ananya.kumari@newsapp.example",
    "mohit": "mohit.oraon@newsapp.example", "shabnam": "shabnam.ansari@newsapp.example",
    "deepak": "deepak.munda@newsapp.example",
}
who = {k: login(v) for k, v in STAFF.items()}

if call("GET", "/articles", who["rajiv"], params={"view": "all"}).get("items"):
    raise SystemExit("The Newsroom already has stories. Start from an empty database to seed the demo.")

# --- Published: written by reporters, approved by their editor -----------------------------------------------------
a = write(who["ananya"], section="education", headline_en="Ranchi schools reopen with new bus routes for rural students",
          headline_hi="रांची में स्कूल खुले, ग्रामीण विद्यार्थियों के लिए नई बस सेवाएँ",
          standfirst_en="Eleven new routes connect villages around Ranchi to the nearest government schools.",
          body_en=doc("Government schools across Ranchi district reopened on Monday, and eleven new bus routes now connect villages in Ormanjhi, "
                      "Namkum and Bundu to the nearest school.",
                      "District officials said the buses will run twice a day and that girls travelling from distant hamlets will get priority seats."),
          body_hi=doc("रांची ज़िले के सरकारी स्कूल सोमवार को फिर खुल गए। ओरमांझी, नामकुम और बुंडू के गाँवों को नज़दीकी स्कूल से जोड़ने के लिए ग्यारह नई बस सेवाएँ शुरू हुई हैं।"),
          tags=["schools", "ranchi", "transport"])
send(who["ananya"], a, scope="local", priority="normal")
publish(who["prabhat"], call("GET", f"/articles/{a['id']}", who["prabhat"]), message="Good local detail. Approved.")

b = write(who["mohit"], section="sports", headline_en="Jharkhand under-19 side reaches the state cricket final",
          headline_hi="झारखंड की अंडर-19 टीम राज्य क्रिकेट के फ़ाइनल में",
          standfirst_en="A late partnership at the JSCA ground sealed a four-wicket win.",
          body_en=doc("Jharkhand's under-19 team booked a place in the final of the state cricket championship with a four-wicket win at the JSCA International Stadium in Ranchi.",
                      "A fifth-wicket stand of 71 took the hosts home with three overs to spare, and the final will be played on Saturday."),
          tags=["cricket", "ranchi"])
send(who["mohit"], b, scope="state", priority="normal")
publish(who["prabhat"], call("GET", f"/articles/{b['id']}", who["prabhat"]), message="Approved. Add the scorecard in a follow-up.")

c = write(who["shabnam"], section="business", headline_en="Jamshedpur's small suppliers see orders pick up before the festive season",
          headline_hi="त्योहारी सीज़न से पहले जमशेदपुर के छोटे आपूर्तिकर्ताओं को मिल रहे हैं ज़्यादा ऑर्डर",
          standfirst_en="Workshops in Adityapur say demand for parts has risen for the third month in a row.",
          body_en=doc("Small engineering workshops in Adityapur and Sakchi say orders for vehicle parts have risen for the third month running, "
                      "as larger manufacturers stock up ahead of the festive season.",
                      "Owners said the pick-up has allowed several units to bring back second shifts."),
          district="east-singhbhum", tags=["jamshedpur", "industry"])
send(who["shabnam"], c, scope="local", priority="normal", district="east-singhbhum")
publish(who["sunita"], call("GET", f"/articles/{c['id']}", who["sunita"]), message="Approved for the state desk.")

# --- Trusted reporter publishes straight away; an editor confirms afterwards ----------------------------------------
call("PATCH", "/team/mohit", who["prabhat"], json={"trusted": True})
d = write(who["mohit"], section="sports", headline_en="Ranchi hockey academy opens admissions for the new session",
          standfirst_en="Trials will be held at the Mecon hockey ground next month.",
          body_en=doc("A hockey academy in Ranchi has opened admissions for boys and girls aged ten to sixteen, with trials at the Mecon hockey ground next month.",
                      "Coaches said players from rural blocks will be considered for free training."),
          tags=["hockey", "ranchi"])
publish(who["mohit"], d, scope="local", priority="normal")

# --- Waiting for review (Prabhat's and Sunita's queues) -------------------------------------------------------------
e = write(who["ananya"], section="health", headline_en="Free health camp for senior citizens at Ratu Road this Sunday",
          headline_hi="रातू रोड पर रविवार को वरिष्ठ नागरिकों के लिए मुफ़्त स्वास्थ्य शिविर",
          standfirst_en="Eye, blood-pressure and sugar checks will be offered from 9 am.",
          body_en=doc("A free health camp for senior citizens will be held at the community hall on Ratu Road in Ranchi this Sunday from 9 am.",
                      "Doctors will offer eye, blood-pressure and sugar checks, and medicines will be given free to those who need them."),
          tags=["health", "ranchi"])
send(who["ananya"], e, scope="local", priority="normal")

f = write(who["deepak"], section="environment", headline_en="Dhanbad residents plant 2,000 saplings along the Damodar bank",
          standfirst_en="Volunteers from twelve neighbourhoods joined the Sunday drive.",
          body_en=doc("About 400 volunteers from twelve neighbourhoods in Dhanbad planted 2,000 saplings along the Damodar river bank on Sunday.",
                      "Organisers said each family will look after the plants near their home for the first two years."),
          district="dhanbad", tags=["dhanbad", "trees"])
send(who["deepak"], f, scope="local", priority="normal", district="dhanbad")

g = write(who["ananya"], section="safety", headline_en="Ranchi traffic police begin a drive to keep Main Road clear for ambulances",
          headline_hi="एम्बुलेंस के लिए मुख्य सड़क खाली रखने को रांची ट्रैफ़िक पुलिस का अभियान",
          standfirst_en="Parked vehicles will be towed from the stretch between Albert Ekka Chowk and Firayalal.",
          body_en=doc("Ranchi traffic police have begun a drive to keep Main Road clear so that ambulances can reach hospitals quickly.",
                      "Vehicles parked in the stretch between Albert Ekka Chowk and Firayalal Chowk will be towed, officers said."),
          priority="breaking", tags=["traffic", "ranchi"])
send(who["ananya"], g, scope="local", priority="breaking", message="Confirmed with the traffic office this morning.")

# --- Sent back with a highlighted problem ---------------------------------------------------------------------------
h = write(who["deepak"], section="education", headline_en="Dhanbad college adds 300 seats in science courses",
          standfirst_en="The new seats are open from the coming session.",
          body_en=doc("A degree college in Dhanbad will add 300 seats in science courses from the coming session, the principal said.",
                      "Admissions will be based on class twelve marks and the list will be put up on the college notice board."),
          district="dhanbad", tags=["dhanbad", "college"])
send(who["deepak"], h, scope="local", priority="normal", district="dhanbad")
call("POST", f"/articles/{h['id']}/notes", who["sunita"], json={
    "id": f"note-{uuid.uuid4().hex[:8]}", "kind": "problem", "quote": "300 seats",
    "message": "Please confirm the number with the university letter before we publish."})
call("POST", f"/articles/{h['id']}/return", who["sunita"], json={"message": "Good story. Confirm the seat count with the university and send it again."})

# --- Declined, and still in draft -----------------------------------------------------------------------------------
i = write(who["mohit"], section="entertainment", headline_en="Rumours of a film shoot at Hundru Falls", standfirst_en="Locals say a crew was seen.",
          body_en=doc("Some locals say they saw a film crew near Hundru Falls last week, but nobody has confirmed which film it is or who is making it."),
          tags=["rumour"])
call("POST", f"/articles/{i['id']}/submit", who["mohit"], json={"version": i["version"], "scope": "local"})
call("POST", f"/articles/{i['id']}/reject", who["prabhat"], json={"message": "Not confirmed by anyone. Come back when the production house speaks."})

write(who["ananya"], section="culture", headline_en="Sarhul celebrations: what to see in Ranchi this spring",
      standfirst_en="A guide for visitors (draft).", body_en=doc("Notes from the Sarhul procession route are still being typed up."), tags=["sarhul"])

print("Seeded the demo Newsroom: 4 published, 3 waiting for review, 1 sent back, 1 declined, 1 draft.")
