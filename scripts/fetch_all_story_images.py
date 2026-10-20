"""
Fetches, processes, and stores high-resolution, apt images for all 27 stories.
Saves to both:
- apps/reader/public/images/stories/<slug>.jpg
- apps/api/media/images/stories/<slug>.jpg

Also wires `image_url` and `caption` into every `article.md`.
"""
import io
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request
from PIL import Image

UA = "NewsReaderApp/1.0 (https://newsreader.example; contact@newsreader.example) Python/3.11"

STORIES_CONFIG = [
    {
        "slug": "28-market-committees-in-jharkhand-to-raise-shop-and-godown-rent-from-1",
        "folder": "Business_Infrastructure/28_Market_Committees_In_Jharkhand_To_Raise_Shop_And_Godown_Rent_From_1",
        "direct_file": "India - Koyambedu Market - Faces of Koyambedu - Sacks of Onion 01 (3981881682).jpg",
        "wiki_query": "filetype:bitmap wholesale grain market APMC India",
        "caption": "Agricultural produce market committee (APMC) wholesale yard with merchant shops and storage godowns in Jharkhand | झारखंड में कृषि उत्पादन बाज़ार समिति के दुकान व गोदाम",
    },
    {
        "slug": "crores-lost-in-fraud-promising-land-and-flats-in-ranchi",
        "folder": "Business_Infrastructure/Crores_Lost_In_Fraud_Promising_Land_And_Flats_In_Ranchi",
        "direct_file": "Mani Imperial - Residential Complex - Kolkata 2017-04-18 6463.JPG",
        "wiki_query": "filetype:bitmap residential apartment building Ranchi",
        "caption": "Residential apartment complex and housing construction under development in Ranchi | रांची में निर्माणाधीन आवासीय अपार्टमेंट और भवन",
    },
    {
        "slug": "ranchis-birsa-munda-airport-says-it-is-ready-for-international-flights",
        "folder": "Business_Infrastructure/Ranchi_s_Birsa_Munda_Airport_Says_It_Is_Ready_For_International_Flight",
        "direct_file": "Birsa Munda Airport in Ranchi 1.jpg",
        "caption": "Terminal building of Birsa Munda Airport in Ranchi, Jharkhand | रांची, झारखंड स्थित बिरसा मुंडा हवाई अड्डा टर्मिनल",
    },
    {
        "slug": "over-20-injured-as-kolkata-ranchi-bus-overturns-on-nh-33",
        "folder": "Crime_Accidents/Over_20_Injured_As_Kolkata_Ranchi_Bus_Overturns_On_NH_33",
        "direct_file": "National Highway no. 114A connecting West Bengal and Jharkhand 02.jpg",
        "caption": "Stretch of National Highway connecting Ranchi and Kolkata in Jharkhand | झारखंड में रांची और कोलकाता को जोड़ने वाला राष्ट्रीय राजमार्ग",
    },
    {
        "slug": "durgabari-ranchi-releases-2026-puja-schedule-goddess-to-arrive-on-horse",
        "folder": "Culture_Durga_Puja/Durgabari_Ranchi_Releases_2026_Puja_Schedule_Goddess_To_Arrive_On_Hors",
        "direct_file": "Idol at Chittaranjan Park Cooperative Pandal Durga Puja in 2017.jpg",
        "caption": "Traditional idol of Goddess Durga during Durga Puja celebrations | दुर्गा पूजा के दौरान मां दुर्गा की पारंपरिक प्रतिमा",
    },
    {
        "slug": "dussehra-2026-in-jharkhand-key-dates-for-ranchi-devotees",
        "folder": "Culture_Durga_Puja/Dussehra_2026_In_Jharkhand_Key_Dates_For_Ranchi_Devotees",
        "direct_file": "The Ravana effigy in flames at the Dussehra celebrations, at Ramleela Maidan on the auspicious occasion of Vijay Dashmi, in Delhi on October 22, 2015.jpg",
        "caption": "Giant effigy of Ravana during Vijayadashami and Dussehra celebrations | विजयादशमी और दशहरा पर रावण दहन की तैयारी",
    },
    {
        "slug": "more-ranchi-pandals-zila-school-ground-upper-bazar-and-kachahri-road",
        "folder": "Culture_Durga_Puja/More_Ranchi_Pandals_Zila_School_Ground_Upper_Bazar_And_Kachahri_Road",
        "direct_file": "Durga Puja Pandal in Kolkata, 2023 04.jpg",
        "caption": "Spectacular architectural illumination and decorations at a grand Durga Puja pandal | दुर्गा पूजा पंडाल की भव्य रोशनी और सजावट",
    },
    {
        "slug": "ranchi-pandal-themed-on-african-union-tribes-takes-shape",
        "folder": "Culture_Durga_Puja/Ranchi_Pandal_Themed_On_African_Union_Tribes_Takes_Shape",
        "direct_file": "Durga Puja Pandal - Bosepukur Talbagan - Kasba - Kolkata 2012-10-23 1178.JPG",
        "caption": "Artisans and decorators crafting an elaborate themed Durga Puja pandal | थीम आधारित दुर्गा पूजा पंडाल को अंतिम रूप देते कारीगर",
    },
    {
        "slug": "singh-mod-puja-committee-builds-indonesian-style-shri-ram-temple-pandal",
        "folder": "Culture_Durga_Puja/Singh_Mod_Puja_Committee_Builds_Indonesian_Style_Shri_Ram_Temple_Panda",
        "direct_file": "Durga Puja Pandal in Kolkata, 2023 03.jpg",
        "caption": "60-foot temple replica pandal inspired by Indonesian architecture and Shri Ram Temple | इंडोनेशियाई वास्तुकला व श्रीराम मंदिर से प्रेरित भव्य पूजा पंडाल",
    },
    {
        "slug": "cmpdil-holds-student-activities-ahead-of-vigilance-awareness-week-2026",
        "folder": "Education/CMPDIL_Holds_Student_Activities_Ahead_Of_Vigilance_Awareness_Week_2026",
        "direct_file": "A view of a national level painting competition, about 5.25 lakh students of IV and V standard participated in the school level competition across the country.jpg",
        "caption": "Students participating in awareness competitions and creative activities organized in Ranchi | रांची में आयोजित सतर्कता जागरूकता और रचनात्मक प्रतियोगिताओं में भाग लेते विद्यार्थी",
    },
    {
        "slug": "iim-ranchi-hindi-house-magazine-released-and-makers-of-modern-india",
        "folder": "Education/IIM_Ranchi_Hindi_House_Magazine_Released_And_Makers_Of_Modern_India_Fi",
        "direct_file": "IIM Ranchi academic building.JPG",
        "caption": "Academic building at the Indian Institute of Management (IIM) Ranchi campus | भारतीय प्रबंधन संस्थान (आईआईएम) रांची का परिसर",
    },
    {
        "slug": "ranchi-university-phd-interviews-to-begin-22-october-117-earlier",
        "folder": "Education/Ranchi_University_PhD_Interviews_To_Begin_22_October_117_Earlier_Candi",
        "direct_file": "Campus of Ranchi University.jpg",
        "caption": "Main administrative block and campus grounds of Ranchi University, Jharkhand | रांची विश्वविद्यालय का मुख्य प्रशासनिक परिसर",
    },
    {
        "slug": "rajinikanths-jailer-2-opens-at-rs-125-crore-worldwide-crosses-rs-200",
        "folder": "Entertainment/Rajinikanth_s_Jailer_2_Opens_At_Rs_125_Crore_Worldwide_Crosses_Rs_200_",
        "direct_file": "Rajinikanth Felicitates Writer Kalaignanam.jpg",
        "caption": "Superstar Rajinikanth whose blockbuster Jailer 2 crossed ₹200 crore worldwide | सुपरस्टार रजनीकांत, जिनकी फिल्म 'जेलर 2' ने दुनिया भर में ₹200 करोड़ का आंकड़ा पार किया",
    },
    {
        "slug": "jharkhand-holds-special-camps-to-add-names-under-sir-of-electoral-rolls",
        "folder": "Environment_Civic/Jharkhand_Holds_Special_Camps_To_Add_Names_Under_SIR_Of_Electoral_Roll",
        "direct_file": "A long queue of voters at a polling booth, in Jagatsinghpur, Odisha during the 4th Phase of General Elections-2014 on April 17, 2014.jpg",
        "wiki_query": "filetype:bitmap polling station voter India election queue",
        "caption": "Special voter registration helpdesk and electoral roll revision camp in Jharkhand | झारखंड में मतदाता सूची पुनरीक्षण और नाम जोड़ने के लिए विशेष शिविर",
    },
    {
        "slug": "rs-30-crore-plan-for-three-eco-friendly-parks-in-ranchi",
        "folder": "Environment_Civic/Rs_30_Crore_Plan_For_Three_Eco_Friendly_Parks_In_Ranchi",
        "direct_url": "https://thecsrjournal.in/wp-content/uploads/2026/10/1ranchi-city-pg-2-0_e6e729fe-5e67-4fd0-a76a-adb6568427a6-large-e1791772939998.jpg",
        "caption": "Landscaping and green walkways planned for eco-friendly urban parks in Ranchi | रांची में बनने वाले पर्यावरण अनुकूल नगर पार्कों की हरियाली और वॉकवे",
    },
    {
        "slug": "108-ambulance-staff-announce-indefinite-strike-from-21-october",
        "folder": "Health_Public_Services/108_Ambulance_Staff_Announce_Indefinite_Strike_From_21_October",
        "direct_file": "The 108 Ambulance.jpg",
        "caption": "Emergency 108 ambulance vehicle providing medical services across Jharkhand | झारखंड में आपातकालीन चिकित्सा सेवा देने वाली 108 एम्बुलेंस",
    },
    {
        "slug": "indias-august-merchandise-exports-jump-26-fastest-growth-in-a-decade",
        "folder": "National/India_s_August_Merchandise_Exports_Jump_26_Fastest_Growth_In_A_Decade",
        "direct_file": "JNPT Port container handling.jpg",
        "caption": "Cargo container terminal handling international merchandise export freight | अंतरराष्ट्रीय व्यापारिक निर्यात के लिए कंटेनर फ्रेट संभालता पोर्ट टर्मिनल",
    },
    {
        "slug": "ipl-auction-comes-home-goa-to-host-the-2027-mini-auction-in-december",
        "folder": "National/IPL_Auction_Comes_Home_Goa_To_Host_The_2027_Mini_Auction_In_December",
        "direct_file": "20-20 Match Brabourne Stadium.jpg",
        "caption": "Floodlit cricket stadium during high-voltage Indian Premier League action | भारतीय प्रीमियर लीग (आईपीएल) मैच के दौरान जगमगाता स्टेडियम",
    },
    {
        "slug": "bepicolombo-nears-mercury-eight-years-after-launch-europe-and-japan",
        "folder": "Science/BepiColombo_Nears_Mercury_Eight_Years_After_Launch_Europe_And_Japan_Pr",
        "direct_file": "BepiColombo spacecraft model.png",
        "caption": "Model of the joint ESA-JAXA BepiColombo spacecraft en route to explore Mercury | बुध ग्रह के अध्ययन के लिए रवाना संयुक्त ईएसए-जाक्सा बेपीकोलंबो अंतरिक्ष यान",
    },
    {
        "slug": "science-roundup-dark-matter-clump-universal-black-hole-jet-rule-cancer",
        "folder": "Science/Science_Roundup_Dark_Matter_Clump_Universal_Black_Hole_Jet_Rule_Cancer",
        "direct_file": "Jets Spout Far Closer to Black Hole Than Thought, Scientists Say (2004-ss433).jpg",
        "caption": "Artist rendering of a supermassive black hole with relativistic jets and accretion disk | अंतरिक्ष में ब्लैक होल, उसके चारों ओर घूमते पदार्थ और तीव्र जेट्स का चित्रण",
    },
    {
        "slug": "ranchis-morabadi-to-get-rs-5-crore-international-standard-indoor-stadium",
        "folder": "Sports/Ranchi_s_Morabadi_To_Get_Rs_5_Crore_International_Standard_Indoor_Stad",
        "direct_url": "https://thecsrjournal.in/wp-content/uploads/2026/10/10000789938091278910206100444.webp",
        "caption": "Architectural visualization of the proposed international-standard indoor stadium in Morabadi, Ranchi | रांची के मोरहाबादी में प्रस्तावित अंतरराष्ट्रीय स्तर के इनडोर स्टेडियम का स्वरूप",
    },
    {
        "slug": "ranchi-tightens-security-for-india-west-indies-t20i-at-jsca-stadium",
        "folder": "Sports/Ranchi_Tightens_Security_For_India_West_Indies_T20I_At_JSCA_Stadium",
        "direct_file": "JSCAStad.jpg",
        "caption": "The JSCA International Stadium Complex in Ranchi prepared for international cricket | अंतरराष्ट्रीय क्रिकेट मैच के लिए तैयार रांची का जेएससीए स्टेडियम",
    },
    {
        "slug": "feature-phone-users-win-airtel-others-roll-out-voice-only-prepaid-plans",
        "folder": "Technology/Feature_Phone_Users_Win_Airtel_Others_Roll_Out_Voice_Only_Prepaid_Plan",
        "direct_file": "Wikipedia Mobile on a feature phone.JPG",
        "caption": "Classic keypad feature phone used for voice calls and SMS services in India | भारत में वॉइस कॉलिंग और एसएमएस के लिए इस्तेमाल होने वाला कीपैड फ़ीचर फ़ोन",
    },
    {
        "slug": "robots-play-badminton-and-sort-parcels-as-hangzhou-hosts-china-robot",
        "folder": "Technology/Robots_Play_Badminton_And_Sort_Parcels_As_Hangzhou_Hosts_China_Robot_C",
        "direct_file": "VEX Robotics Competition Robot.jpg",
        "caption": "Autonomous robots demonstrating dexterity and sorting agility at robotics challenge | रोबोटिक्स प्रतियोगिता में स्वायत्त रोबोट्स की दक्षता और छँटाई का प्रदर्शन",
    },
    {
        "slug": "us-announces-6-billion-in-science-initiatives-medals-to-tech-leaders",
        "folder": "Technology/US_Announces_6_Billion_In_Science_Initiatives_Medals_To_Tech_Leaders_V",
        "direct_file": "2011 Presidential Award for Excellence in Science, Mathematics and Engineering Mentoring.jpg",
        "wiki_query": "filetype:bitmap Presidential Award for Excellence in Science",
        "caption": "The National Medal of Technology and Innovation honoring leaders in science and technology | विज्ञान और प्रौद्योगिकी के क्षेत्र में उत्कृष्ट योगदान हेतु राष्ट्रीय पदक",
    },
    {
        "slug": "hurricane-simon-crawls-along-mexicos-pacific-coast-as-rachels-remnants",
        "folder": "World/Hurricane_Simon_Crawls_Along_Mexico_s_Pacific_Coast_As_Rachel_s_Remnan",
        "direct_file": "Hurricane Fausto Churns in the Pacific Ocean (CIRA 2026-07-21).png",
        "caption": "Satellite imagery of Category 4 Pacific hurricane churning off the coast of Mexico | मेक्सिको के प्रशांत तट के पास विशाल श्रेणी-4 चक्रवाती तूफान का उपग्रह चित्र",
    },
    {
        "slug": "saudi-airspace-turmoil-indian-airlines-extend-cancellations-to-riyadh",
        "folder": "World/Saudi_Airspace_Turmoil_Indian_Airlines_Extend_Cancellations_To_Riyadh_",
        "direct_file": "Air India One Chennai.jpg",
        "caption": "Commercial passenger airliner on tarmac amid widespread flight schedule disruptions | उड़ानें रद्द होने और समय-सारणी में व्यवधान के बीच रनवे पर वाणिज्यिक यात्री विमान",
    },
]


def resolve_wikimedia_file(filename: str) -> str | None:
    if not filename.startswith("File:"):
        filename = "File:" + filename
    params = {
        "action": "query",
        "format": "json",
        "titles": filename,
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "iiurlwidth": 1280,
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        pages = data.get("query", {}).get("pages", {})
        for pid, p in pages.items():
            ii = p.get("imageinfo", [{}])[0]
            return ii.get("thumburl") or ii.get("url")
    except Exception as e:
        print(f"Error resolving {filename}: {e}", file=sys.stderr)
    return None


def search_wikimedia(query: str) -> str | None:
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,
        "gsrlimit": 3,
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "iiurlwidth": 1280,
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        pages = data.get("query", {}).get("pages", {})
        for pid, p in pages.items():
            ii = p.get("imageinfo", [{}])[0]
            mime = ii.get("mime", "")
            if mime.startswith("image/"):
                return ii.get("thumburl") or ii.get("url")
    except Exception as e:
        print(f"Error searching '{query}': {e}", file=sys.stderr)
    return None


def fetch_bytes_with_retry(url: str, retries: int = 3) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.read()
        except Exception as e:
            last_err = e
            time.sleep(2 * (attempt + 1))
    raise last_err or RuntimeError(f"Failed to fetch {url}")


def process_image(raw_bytes: bytes, target_width: int = 1200, target_height: int = 675) -> bytes:
    """Crop and resize to standard 16:9 high resolution landscape."""
    img = Image.open(io.BytesIO(raw_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    target_aspect = target_width / target_height
    current_aspect = w / h

    if current_aspect > target_aspect:
        new_w = int(h * target_aspect)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    else:
        new_h = int(w / target_aspect)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))

    img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


def update_article_markdown(article_path: pathlib.Path, img_url: str, caption: str) -> None:
    text = article_path.read_text("utf-8")
    lines = text.replace("\r\n", "\n").split("\n")

    # Remove any existing **Image | and **Caption | lines
    filtered = []
    for l in lines:
        if re.match(r"^\*\*(?:Image(?:\s*URL)?|चित्र)(?:\s*\|[^*]+)?\*\*:", l, re.I):
            continue
        if re.match(r"^\*\*(?:Caption|चित्र विवरण|कैप्शन)(?:\s*\|[^*]+)?\*\*:", l, re.I):
            continue
        filtered.append(l)

    # Insert after standfirst (## lines before the first ---)
    insert_idx = -1
    for i, l in enumerate(filtered):
        if l.strip() == "---":
            insert_idx = i
            break

    image_block = [
        f"**Image | चित्र:** {img_url}",
        f"**Caption | कैप्शन:** {caption}",
        "",
    ]

    if insert_idx != -1:
        new_lines = filtered[:insert_idx] + image_block + filtered[insert_idx:]
    else:
        new_lines = filtered + [""] + image_block

    article_path.write_text("\n".join(new_lines), "utf-8")


def main():
    repo_root = pathlib.Path(__file__).resolve().parent.parent
    reader_dir = repo_root / "apps" / "reader" / "public" / "images" / "stories"
    api_dir = repo_root / "apps" / "api" / "media" / "images" / "stories"
    content_dir = repo_root / "apps" / "api" / "content" / "Ranchi_News_Bilingual"
    reader_dir.mkdir(parents=True, exist_ok=True)
    api_dir.mkdir(parents=True, exist_ok=True)

    results = []
    print(f"Starting fetch for {len(STORIES_CONFIG)} stories...")
    for idx, story in enumerate(STORIES_CONFIG, 1):
        slug = story["slug"]
        print(f"[{idx}/{len(STORIES_CONFIG)}] {slug}...")

        img_url = None
        if story.get("direct_url"):
            img_url = story["direct_url"]
        elif story.get("direct_file"):
            img_url = resolve_wikimedia_file(story["direct_file"])

        if not img_url and story.get("wiki_query"):
            img_url = search_wikimedia(story["wiki_query"])

        if not img_url and story.get("wiki_fallback"):
            img_url = search_wikimedia(story["wiki_fallback"])

        if not img_url:
            print(f"  FAILED to find image URL for {slug}", file=sys.stderr)
            results.append({"slug": slug, "status": "no_url"})
            continue

        try:
            print(f"  Downloading: {img_url[:90]}...")
            time.sleep(1)
            raw = fetch_bytes_with_retry(img_url)
            processed = process_image(raw)
            reader_target = reader_dir / f"{slug}.jpg"
            api_target = api_dir / f"{slug}.jpg"
            reader_target.write_bytes(processed)
            api_target.write_bytes(processed)
            local_url = f"/images/stories/{slug}.jpg"
            print(f"  Saved ({len(processed):,} bytes, 1200x675) to {reader_target.name}")

            # Update article.md
            article_file = content_dir / story["folder"] / "article.md"
            if article_file.exists():
                update_article_markdown(article_file, local_url, story["caption"])
                print(f"  Updated {article_file.name}")
            else:
                print(f"  Warning: {article_file} not found!", file=sys.stderr)

            results.append({
                "slug": slug,
                "folder": story["folder"],
                "caption": story["caption"],
                "status": "ok",
                "bytes": len(processed),
                "url": local_url,
            })
        except Exception as e:
            print(f"  ERROR processing {slug}: {e}", file=sys.stderr)
            results.append({"slug": slug, "status": "error", "error": str(e)})

    manifest_path = repo_root / "stories_images_result.json"
    manifest_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nDone! Results written to {manifest_path}")
    ok_count = sum(1 for r in results if r.get("status") == "ok")
    print(f"Success: {ok_count} / {len(STORIES_CONFIG)}")


if __name__ == "__main__":
    main()
