"""Turn raw OSM tiles into a scored, de-duplicated lead list (JSON)."""
import collections, glob, json, os, re, sys, urllib.parse

TILES, OUT = sys.argv[1], sys.argv[2]

CITY_PREP = {
    "Москва": "Москве", "Санкт-Петербург": "Санкт-Петербурге", "Новосибирск": "Новосибирске",
    "Екатеринбург": "Екатеринбурге", "Казань": "Казани", "Нижний Новгород": "Нижнем Новгороде",
    "Челябинск": "Челябинске", "Самара": "Самаре", "Уфа": "Уфе", "Ростов-на-Дону": "Ростове-на-Дону",
    "Краснодар": "Краснодаре", "Омск": "Омске", "Воронеж": "Воронеже", "Волгоград": "Волгограде",
    "Красноярск": "Красноярске", "Тюмень": "Тюмени", "Саратов": "Саратове", "Пермь": "Перми",
}

# (tag key, value) -> (group, russian label)
G = {}
def reg(group, key, mapping):
    for v, label in mapping.items():
        G[(key, v)] = (group, label)

reg("beauty", "shop", {"hairdresser": "Парикмахерская", "beauty": "Салон красоты", "massage": "Массаж",
                       "tattoo": "Тату-салон", "cosmetics": "Магазин косметики", "perfumery": "Парфюмерия"})
reg("beauty", "leisure", {"tanning_salon": "Солярий"})
reg("auto", "shop", {"car_repair": "Автосервис", "tyres": "Шиномонтаж / шины", "car_parts": "Автозапчасти",
                     "car": "Автосалон", "motorcycle": "Мотосалон"})
reg("auto", "amenity", {"car_wash": "Автомойка", "vehicle_inspection": "Техосмотр", "car_rental": "Прокат авто"})
reg("medical", "amenity", {"dentist": "Стоматология", "clinic": "Клиника", "doctors": "Медцентр / врач",
                           "veterinary": "Ветклиника"})
reg("food", "amenity", {"cafe": "Кафе", "restaurant": "Ресторан", "fast_food": "Фастфуд / шаурма",
                        "bar": "Бар", "pub": "Паб"})
reg("food", "shop", {"bakery": "Пекарня", "pastry": "Кондитерская", "confectionery": "Кондитерская",
                     "butcher": "Мясная лавка", "cheese": "Сырная лавка", "deli": "Деликатесы",
                     "seafood": "Рыба и морепродукты", "tea": "Чайный магазин", "coffee": "Кофейный магазин"})
reg("home", "shop", {"furniture": "Мебель", "kitchen": "Кухни на заказ", "doors": "Двери", "windows": "Окна",
                     "curtain": "Шторы", "bathroom_furnishing": "Сантехника", "tiles": "Плитка",
                     "flooring": "Напольные покрытия", "paint": "Краски", "hardware": "Хозтовары / инструмент",
                     "doityourself": "Стройматериалы", "building_materials": "Стройматериалы",
                     "lighting": "Свет / люстры", "bed": "Матрасы / кровати", "interior_decoration": "Декор интерьера",
                     "plumbing": "Сантехника", "security": "Охранные системы", "energy": "Энергооборудование",
                     "trade": "Стройбаза / опт", "garden_centre": "Садовый центр", "houseware": "Товары для дома"})
reg("services", "shop", {"dry_cleaning": "Химчистка", "laundry": "Прачечная", "tailor": "Ателье",
                         "locksmith": "Изготовление ключей", "mobile_phone": "Телефоны / ремонт",
                         "computer": "Компьютеры / ремонт", "electronics": "Электроника / ремонт",
                         "repair": "Ремонт", "photo": "Фотоуслуги", "printing": "Типография / печать",
                         "copyshop": "Копицентр", "frame": "Багетная мастерская", "funeral_directors": "Ритуальные услуги",
                         "sewing": "Швейная фурнитура", "appliance": "Бытовая техника / ремонт"})
reg("retail", "shop", {"florist": "Цветы", "clothes": "Одежда", "shoes": "Обувь", "boutique": "Бутик",
                       "jewelry": "Ювелирный", "optician": "Оптика", "pet": "Зоомагазин", "gift": "Подарки",
                       "toys": "Игрушки", "sports": "Спорттовары", "bicycle": "Велосипеды", "fishing": "Рыбалка",
                       "outdoor": "Туризм / снаряжение", "hunting": "Охота", "fabric": "Ткани",
                       "musical_instrument": "Музыкальные инструменты", "baby_goods": "Детские товары",
                       "wedding": "Свадебный салон", "stationery": "Канцтовары", "art": "Художественный салон",
                       "antiques": "Антиквариат", "craft": "Товары для творчества", "boat": "Лодки / катера",
                       "medical_supply": "Медтехника", "hearing_aids": "Слуховые аппараты",
                       "nutrition_supplements": "Спортпит"})
reg("education", "amenity", {"driving_school": "Автошкола", "language_school": "Языковая школа",
                             "music_school": "Музыкальная школа", "dancing_school": "Школа танцев",
                             "training": "Курсы / обучение", "childcare": "Детский центр",
                             "kindergarten": "Частный детский сад", "prep_school": "Подготовка к школе / ЕГЭ"})
reg("education", "office", {"tutoring": "Репетиторы", "educational_institution": "Учебный центр"})
reg("sport", "leisure", {"fitness_centre": "Фитнес / тренажёрный зал", "sports_centre": "Спортклуб",
                         "dance": "Танцы", "sauna": "Сауна / баня", "escape_game": "Квест",
                         "amusement_arcade": "Игровой клуб", "trampoline_park": "Батутный центр",
                         "bowling_alley": "Боулинг", "horse_riding": "Конный клуб", "paintball": "Пейнтбол"})
reg("sport", "amenity", {"events_venue": "Банкетный зал / площадка", "nightclub": "Ночной клуб",
                         "public_bath": "Баня", "studio": "Студия"})
reg("hotel", "tourism", {"hotel": "Гостиница", "hostel": "Хостел", "guest_house": "Гостевой дом",
                         "motel": "Мотель", "apartment": "Апартаменты", "chalet": "Загородный дом",
                         "camp_site": "Кемпинг"})
reg("b2b", "office", {"company": "Компания", "estate_agent": "Агентство недвижимости", "lawyer": "Юрист",
                      "accountant": "Бухгалтерия", "notary": "Нотариус", "insurance": "Страхование",
                      "architect": "Архитектор / проектирование", "travel_agent": "Турагентство",
                      "advertising_agency": "Рекламное агентство", "consulting": "Консалтинг",
                      "tax_advisor": "Налоговый консультант", "employment_agency": "Кадровое агентство",
                      "moving_company": "Грузоперевозки / переезды", "surveyor": "Кадастр / геодезия",
                      "logistics": "Логистика", "property_management": "Управляющая компания",
                      "translator": "Бюро переводов", "construction_company": "Строительная компания",
                      "photographer": "Фотограф"})
reg("b2b", "shop", {"travel_agency": "Турагентство"})
CRAFT_LABELS = {"carpenter": "Столярная мастерская", "shoemaker": "Ремонт обуви", "key_cutter": "Изготовление ключей",
                "electronics_repair": "Ремонт электроники", "photographer": "Фотограф", "tailor": "Ателье",
                "plumber": "Сантехник", "electrician": "Электрик", "window_construction": "Окна",
                "upholsterer": "Перетяжка мебели", "jeweller": "Ювелирная мастерская", "watchmaker": "Ремонт часов",
                "metal_construction": "Металлоконструкции", "photo_studio": "Фотостудия", "sewing": "Ателье",
                "printer": "Типография", "confectionery": "Кондитерская", "builder": "Строительство",
                "glaziery": "Стекольная мастерская", "stonemason": "Памятники / камень", "hvac": "Кондиционеры",
                "locksmith": "Слесарь / замки", "car_repair": "Автосервис", "brewery": "Пивоварня",
                "handicraft": "Ручная работа", "dressmaker": "Ателье", "furniture": "Мебель на заказ",
                "cleaning": "Клининг", "signmaker": "Наружная реклама", "tiler": "Плиточник"}
CRAFT_GROUP = {"car_repair": "auto", "confectionery": "food", "carpenter": "home", "window_construction": "home",
               "upholsterer": "home", "metal_construction": "home", "builder": "home", "glaziery": "home",
               "hvac": "home", "furniture": "home", "tiler": "home", "plumber": "home", "electrician": "home",
               "photographer": "services", "photo_studio": "services", "shoemaker": "services",
               "key_cutter": "services", "electronics_repair": "services", "tailor": "services",
               "dressmaker": "services", "sewing": "services", "watchmaker": "services", "jeweller": "services",
               "printer": "services", "cleaning": "services", "signmaker": "b2b", "locksmith": "services"}
HEALTH_LABELS = {"dentist": "Стоматология", "clinic": "Клиника", "doctor": "Медцентр / врач",
                 "physiotherapist": "Реабилитация / ЛФК", "psychotherapist": "Психолог", "optometrist": "Оптика / зрение",
                 "laboratory": "Лаборатория / анализы", "alternative": "Остеопатия / мануальная терапия",
                 "podiatrist": "Подолог", "speech_therapist": "Логопед", "centre": "Медцентр"}
SKIP_HEALTH = {"pharmacy", "hospital", "blood_donation", "vaccination_centre", "birthing_centre", "sample_collection"}

GROUP_INFO = {
    # group: (for whom, offer, hook-pain)
    "auto": ("автосервисов", "сайт-визитку с ценами и онлайн-записью",
             "Сейчас сезон переобувки и зимних поломок — люди ищут «автосервис рядом» в Яндексе, и первыми звонят тем, у кого есть сайт с ценами и записью."),
    "food": ("кафе и ресторанов", "сайт с меню, фото зала и бронированием",
             "Перед Новым годом все ищут, где провести корпоратив и заказать банкет — звонят туда, где можно посмотреть меню и фото зала."),
    "beauty": ("салонов красоты", "сайт с прайсом, фото работ и онлайн-записью",
               "Перед праздниками все записываются на стрижку и маникюр — сайт с ценами и онлайн-записью приводит новых клиентов из Яндекса, а не только по сарафану."),
    "medical": ("клиник и медцентров", "сайт с врачами, ценами и записью на приём",
                "Пациенты перед записью проверяют клинику в интернете: врачи, цены, лицензия. Если сайта нет, многие уходят к тем, у кого он есть."),
    "home": ("мебельных, ремонтных и строительных компаний", "сайт-каталог с фото работ и формой заявки",
             "У вас дорогие заказы, и клиент сначала смотрит фото работ и цены в интернете — одна заявка с сайта окупает его полностью."),
    "services": ("мастерских и сервисов", "сайт-визитку с ценами и кнопкой WhatsApp",
                 "Люди ищут такие услуги с телефона по запросу «рядом» — сайт с ценами и кнопкой WhatsApp даёт заявки каждый день."),
    "retail": ("магазинов", "сайт-витрину с ассортиментом и ценами",
               "До Нового года люди ищут подарки в интернете — сайт-витрина с ассортиментом и ценами приводит покупателей прямо к вам."),
    "education": ("учебных и детских центров", "сайт с расписанием и записью на пробное занятие",
                  "В январе родители и взрослые ищут курсы и кружки на новый сезон — сайт с расписанием и записью на пробное собирает заявки."),
    "sport": ("спортивных клубов и площадок для отдыха", "сайт с ценами, расписанием и онлайн-заявкой",
              "Перед Новым годом продаются подарочные сертификаты, а в январе пик спроса — люди ищут зал и отдых в интернете."),
    "hotel": ("гостиниц и гостевых домов", "сайт с номерами, ценами и прямым бронированием",
              "С сайтом гости бронируют напрямую, без комиссии агрегаторов 15–20%, а на новогодние праздники спрос максимальный."),
    "b2b": ("компаний", "сайт компании с услугами и формой заявки",
            "Перед звонком клиенты проверяют компанию в интернете — без сайта меньше доверия, и заявки уходят конкурентам."),
}
FLORIST_PAIN = "Впереди Новый год, потом 14 февраля и 8 марта — сайт с букетами и заказом онлайн окупается за один праздник."
TYRES_PAIN = "Сейчас пик переобувки — люди ищут «шиномонтаж рядом» в Яндексе, и первыми звонят тем, у кого есть сайт с ценами и записью."
GROUP_WEIGHT = {"auto": 2, "food": 2, "beauty": 2, "medical": 2, "home": 2, "hotel": 1, "sport": 1,
                "education": 1, "services": 1, "retail": 1, "b2b": 1}
GROUP_RU = {"auto": "Авто", "food": "Еда", "beauty": "Красота", "medical": "Медицина", "home": "Дом и ремонт",
            "services": "Бытовые услуги", "retail": "Магазины", "education": "Обучение и дети",
            "sport": "Спорт и досуг", "hotel": "Гостиницы", "b2b": "Услуги и компании"}

STATE_RE = re.compile(r"\b(МБОУ|МАОУ|ГБОУ|МБДОУ|МАДОУ|ГБДОУ|МКДОУ|МБУ|МАУ|ГБУ|ГАУ|ГКУ|МКУ|ФГБ\w*|ФГУП|МУП|ГУП|"
                      r"государствен\w*|муниципальн\w*|ПАО|Сбербанк|РЖД|Почта России)\b", re.I)
GENERIC = {"шиномонтаж", "парикмахерская", "автосервис", "кафе", "шаурма", "стоматология", "автомойка", "цветы",
           "ремонт обуви", "ремонт телефонов", "ателье", "химчистка", "продукты", "пекарня", "мебель", "салон красоты",
           "автозапчасти", "шаверма", "оптика", "зоомагазин", "ключи", "ремонт", "фото", "столовая", "бар",
           "хинкальная", "чебуречная", "пельменная", "суши", "пицца", "окна", "двери", "сауна", "баня", "массаж",
           "маникюр", "барбершоп", "ремонт одежды", "copy", "копицентр", "типография", "автомагазин", "шины",
           "кофе", "кофейня", "кулинария", "магнит косметик"}


def norm_phone(raw):
    out = []
    for p in re.split(r"[;,]", raw or ""):
        d = re.sub(r"\D", "", p)
        if len(d) == 11 and d[0] in "78":
            d = "7" + d[1:]
        elif len(d) == 10:
            d = "7" + d
        else:
            continue
        out.append(d)
    return out


def fmt_phone(d):
    return f"+7 ({d[1:4]}) {d[4:7]}-{d[7:9]}-{d[9:11]}"


def classify(t):
    if t.get("healthcare") and t["healthcare"] in SKIP_HEALTH:
        return None
    for k in ("shop", "amenity", "leisure", "tourism", "office"):
        v = t.get(k)
        if v and (k, v) in G:
            return G[(k, v)]
    c = t.get("craft")
    if c:
        return CRAFT_GROUP.get(c, "services"), CRAFT_LABELS.get(c, "Мастерская")
    h = t.get("healthcare")
    if h:
        return "medical", HEALTH_LABELS.get(h, "Медцентр")
    if t.get("shop") or t.get("office"):
        return None  # unknown/unwanted shop/office types (alcohol, tobacco, supermarkets, ...)
    return None


def socials(t):
    s = []
    for k, lab in (("contact:vk", "ВК"), ("vk", "ВК"), ("contact:telegram", "Telegram"), ("telegram", "Telegram"),
                   ("contact:whatsapp", "WhatsApp"), ("whatsapp", "WhatsApp"), ("contact:instagram", "Instagram"),
                   ("instagram", "Instagram"), ("contact:ok", "ОК"), ("contact:youtube", "YouTube"),
                   ("contact:facebook", "Facebook"), ("facebook", "Facebook")):
        v = t.get(k)
        if v and not any(x.startswith(lab + ":") for x in s):
            s.append(f"{lab}: {v.strip()}")
    return s


def pitch(name, group, label, t, soc, city):
    whom, offer, pain = GROUP_INFO[group]
    if t.get("shop") == "florist":
        pain = FLORIST_PAIN
    if t.get("shop") == "tyres":
        pain = TYRES_PAIN
    if any(x.startswith("ВК") for x in soc):
        hook = "вижу, что у вас есть группа ВКонтакте, а сайта нет"
    elif soc:
        hook = "вижу, что у вас есть соцсети, а своего сайта нет"
    elif t.get("opening_hours"):
        hook = "на картах у вас указаны телефон и график работы, а сайта нет"
    else:
        hook = "на картах у вас указан только телефон, сайта нет"
    return (f"Здравствуйте! Это «{name}»? (дождись ответа) Меня зовут [ИМЯ], я делаю сайты для {whom}. "
            f"Нашёл вас на карте в {CITY_PREP.get(city, city)} — {hook}. {pain} "
            f"Могу за 3–5 дней сделать вам {offer} — от 5 000 ₽. "
            f"И могу бесплатно показать черновой вариант именно для «{name}». Удобно, если пришлю в WhatsApp?")


def main():
    raw = {}
    for f in glob.glob(os.path.join(TILES, "*", "*.json")):
        city = os.path.basename(os.path.dirname(f))
        for e in json.load(open(f)):
            raw.setdefault((e["type"], e["id"]), (city, e))
    print("raw elements:", len(raw))

    nk = lambda x: x.strip().lower().replace("ё", "е")
    names, name_cities = collections.Counter(), collections.defaultdict(set)
    for city, e in raw.values():
        n = nk(e.get("tags", {}).get("name") or "")
        if n:
            names[n] += 1
            name_cities[n].add(city)

    leads, seen_phone = [], {}
    drop = collections.Counter()
    for city, e in raw.values():
        t = e.get("tags", {})
        name = (t.get("name") or t.get("name:ru") or "").strip()
        if not name:
            drop["no name"] += 1; continue
        if any(k in t for k in ("website", "contact:website", "url", "contact:url", "website:menu")):
            drop["has site"] += 1; continue
        if any(k in t for k in ("brand", "brand:wikidata", "operator:wikidata", "network:wikidata")):
            drop["chain/brand"] += 1; continue
        if "end_date" in t or (t.get("opening_hours") or "").strip().lower() in ("closed", "off"):
            drop["closed"] += 1; continue
        cls = classify(t)
        if not cls:
            drop["unwanted category"] += 1; continue
        group, label = cls
        if STATE_RE.search(name) or STATE_RE.search(t.get("operator", "")) or STATE_RE.search(t.get("official_name", "")):
            drop["state/large"] += 1; continue
        n = nk(name)
        if n not in GENERIC and (names[n] >= 5 or (names[n] >= 4 and len(name_cities[n]) >= 2)):
            drop["probable chain (repeated name)"] += 1; continue
        if any("franch" in str(v).lower() or "франш" in str(v).lower() for v in t.values()):
            drop["franchise"] += 1; continue
        phones = []
        for k in ("phone", "contact:phone", "contact:mobile", "mobile", "phone:mobile"):
            for p in norm_phone(t.get(k)):
                if p not in phones:
                    phones.append(p)
        if not phones:
            drop["bad phone"] += 1; continue
        soc = socials(t)
        ts = e.get("timestamp", "")[:10]
        chk = (t.get("check_date") or "")[:10]
        fresh = max(ts, chk)
        street = t.get("addr:street", "")
        house = t.get("addr:housenumber", "")
        addr = ", ".join(x for x in (street, house) if x) or t.get("addr:full", "")
        lat = e.get("lat") or e.get("center", {}).get("lat")
        lon = e.get("lon") or e.get("center", {}).get("lon")
        score = GROUP_WEIGHT[group]
        score += 3 if soc else 0
        score += 2 if fresh >= "2024" else (1 if fresh >= "2022" else (-2 if fresh < "2019" else 0))
        score += 1 if t.get("opening_hours") else 0
        score += 1 if addr else 0
        oper = t.get("operator", "")
        score += 1 if re.search(r"\bИП\b", oper) else 0
        score += -2 if phones[0].startswith("7800") else 0
        score += 1 if phones[0][1] == "9" else 0  # mobile: often the owner's direct line
        email = t.get("email") or t.get("contact:email") or ""
        lead = {
            "city": city, "group": GROUP_RU[group], "niche": label, "name": name,
            "phone": fmt_phone(phones[0]), "phone2": ", ".join(fmt_phone(p) for p in phones[1:3]),
            "addr": addr, "hours": t.get("opening_hours", ""), "social": "; ".join(soc), "email": email,
            "operator": oper, "fresh": fresh, "score": score,
            "pitch": pitch(name, group, label, t, soc, city),
            "check": "https://yandex.ru/search/?text=" + urllib.parse.quote(f"{name} {city} {label}"),
            "map": f"https://yandex.ru/maps/?pt={lon},{lat}&z=18&l=map" if lat and lon else "",
            "osm": f"https://www.openstreetmap.org/{e['type']}/{e['id']}",
        }
        key = phones[0]
        if key in seen_phone:
            prev = seen_phone[key]
            if lead["score"] > prev["score"]:
                prev.update(lead)
            drop["duplicate phone"] += 1
            continue
        seen_phone[key] = lead
        leads.append(lead)
    for l in leads:
        l["prio"] = "A" if l["score"] >= 7 else ("B" if l["score"] >= 4 else "C")
    leads.sort(key=lambda l: (-l["score"], l["city"], l["group"], l["name"]))
    json.dump(leads, open(OUT, "w"), ensure_ascii=False, indent=0)
    print("leads:", len(leads))
    print("dropped:", dict(drop))
    print("by prio:", collections.Counter(l["prio"] for l in leads))
    print("by city:", collections.Counter(l["city"] for l in leads).most_common())
    print("by group:", collections.Counter(l["group"] for l in leads).most_common())


if __name__ == "__main__":
    main()
