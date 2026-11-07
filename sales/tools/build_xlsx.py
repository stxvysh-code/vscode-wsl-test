"""Build the sales workbook from leads.json + the call-script markdown."""
import json, re, sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

LEADS, SCRIPT_MD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
leads = json.load(open(LEADS))
N = len(leads)
LAST = N + 1  # last data row on "База"

F = "Arial"
H1 = Font(name=F, size=16, bold=True)
H2 = Font(name=F, size=12, bold=True)
B = Font(name=F, size=10, bold=True)
R = Font(name=F, size=10)
BLUE = Font(name=F, size=10, color="0000FF")
LINK = Font(name=F, size=10, color="0563C1", underline="single")
WHITE_B = Font(name=F, size=10, bold=True, color="FFFFFF")
HEAD_FILL = PatternFill("solid", fgColor="1F4E78")
INPUT_FILL = PatternFill("solid", fgColor="FFFF00")
SOFT = PatternFill("solid", fgColor="EAF1FB")
WRAP = Alignment(wrap_text=True, vertical="top")
TOP = Alignment(vertical="top")
thin = Side(style="thin", color="BFBFBF")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)

STATUSES = ["Недозвон", "Перезвонить", "Не ЛПР", "Отказ", "Есть сайт", "Интерес — отправить демо",
            "Демо отправлено", "Счёт / предоплата", "Оплачено"]
REACHED = ["Перезвонить", "Отказ", "Есть сайт", "Интерес — отправить демо", "Демо отправлено",
           "Счёт / предоплата", "Оплачено"]

wb = Workbook()

# ---------------------------------------------------------------- Старт
ws = wb.active
ws.title = "Старт"
cities = sorted({l["city"] for l in leads})
lines = [
    ("Как работать с этой таблицей", H1),
    ("", R),
    ("1. Открой лист «База». Он уже отсортирован: сверху самые перспективные компании (приоритет A).", R),
    ("2. Перед звонком нажми «Проверить» (колонка Q): за 10 секунд убедись, что у компании действительно нет сайта.", R),
    ("3. Звони и говори текст из колонки P «Что сказать» — он написан под каждую компанию. Дальше веди разговор по листу «Скрипт».", R),
    ("4. После звонка выбери статус в колонке S (выпадающий список), при необходимости — дату следующего контакта (T).", R),
    ("5. Когда получил деньги — впиши сумму в колонку U «Получено, ₽». Лист «План» сам посчитает прогресс до 70 000 ₽.", R),
    ("", R),
    ("Что можно менять: жёлтые ячейки на листе «План» (цель, чек, конверсии) и колонки S–V на листе «База». Остальное считается формулами.", B),
    ("", R),
    ("Откуда база", H2),
    (f"Компании собраны из открытых данных OpenStreetMap (© участники OpenStreetMap, лицензия ODbL) по {len(cities)} городам: "
     + ", ".join(cities) + ".", R),
    ("Отбор: у компании есть телефон, на карте НЕ указан сайт, это не сетевой бренд и не госучреждение; алкоголь, табак и вейпы исключены.", R),
    ("Важно: «сайт не указан на карте» не всегда значит «сайта нет» — поэтому перед звонком жми «Проверить». Часть данных могла устареть: "
     "компания могла закрыться или сменить номер (смотри колонку O «Данные от»).", R),
    ("", R),
    ("Как считается приоритет (колонка C «Балл»)", H2),
    ("+3 есть соцсети (ВК, Telegram и т. п.), а сайта нет — компания уже вкладывается в интернет и понимает его ценность;", R),
    ("+2 данные обновлялись в 2024 году или позже (+1 — в 2022–2023, −2 — старше 2019);", R),
    ("+2 ниши, где сайт быстро окупается и сейчас сезон: авто, красота, медицина, кафе (корпоративы), ремонт и мебель; +1 — остальные;", R),
    ("+1 указан график работы, +1 указан адрес, +1 оформлен как ИП (решение принимает сам владелец), +1 мобильный номер (часто телефон владельца);", R),
    ("−2 номер 8-800 (обычно крупная компания с колл-центром).", R),
    ("A — балл 7 и выше, B — 4–6, C — ниже 4.", B),
]
for i, (txt, font) in enumerate(lines, 1):
    c = ws.cell(row=i, column=1, value=txt)
    c.font = font
    c.alignment = Alignment(wrap_text=True, vertical="top")
ws.column_dimensions["A"].width = 140

# ---------------------------------------------------------------- План
p = wb.create_sheet("План")
p["A1"] = "План: 70 000 ₽ до 20 декабря"; p["A1"].font = H1
p["A3"] = "Вводные (можно менять)"; p["A3"].font = H2
inputs = [
    ("Цель, ₽", 70000, '#,##0 "₽"', "Цель от пользователя: 70 000 ₽."),
    ("Средний чек, ₽", 10000, '#,##0 "₽"', "От пользователя: сайты по 5 000 или 10 000 ₽. Если продаёте в основном визитки — поставьте 5 000 или 7 500."),
    ("Крайний срок оплат", "=DATE(2026,12,20)", "DD.MM.YYYY", "От пользователя: до 20 декабря."),
    ("Дозвон до того, кто решает, %", 0.35, "0%", "Оценка для холодных звонков малому бизнесу, не из исследования. Замените своей цифрой после первых 50 звонков."),
    ("Соглашаются посмотреть черновик, % от разговоров", 0.15, "0%", "Оценка. С бесплатным черновиком под компанию обычно выше, чем при «просто предложить сайт». Уточните по факту."),
    ("Оплачивают после черновика, %", 0.25, "0%", "Оценка. Уточните по факту после первых 10 отправленных черновиков."),
]
for i, (lab, val, fmt, note) in enumerate(inputs, 4):
    p.cell(row=i, column=1, value=lab).font = R
    c = p.cell(row=i, column=2, value=val)
    c.font = BLUE; c.fill = INPUT_FILL; c.number_format = fmt; c.border = BOX
    p.cell(row=i, column=3, value=note).font = Font(name=F, size=9, italic=True, color="595959")
# rows: 4 goal, 5 check, 6 deadline, 7 reach, 8 interest, 9 close
p["A11"] = "Сколько нужно сделать"; p["A11"].font = H2
calc = [
    ("Нужно продаж", "=ROUNDUP(B4/B5,0)", "0"),
    ("Нужно отправить черновиков", "=ROUNDUP(B12/B9,0)", "0"),
    ("Нужно разговоров с тем, кто решает", "=ROUNDUP(B13/B8,0)", "0"),
    ("Нужно наборов номера", "=ROUNDUP(B14/B7,0)", "0"),
    ("Рабочих дней до крайнего срока (с сегодня)", "=MAX(NETWORKDAYS(TODAY(),B6),0)", "0"),
    ("Наборов в рабочий день", "=IF(B16>0,ROUNDUP(B15/B16,0),0)", "0"),
    ("Компаний в базе", f"=COUNTA(База!G2:G{LAST})", "#,##0"),
    ("Из них приоритет A", f'=COUNTIF(База!B2:B{LAST},"A")', "#,##0"),
]
for i, (lab, f, fmt) in enumerate(calc, 12):
    p.cell(row=i, column=1, value=lab).font = R
    c = p.cell(row=i, column=2, value=f); c.font = R; c.number_format = fmt; c.border = BOX
p["B15"].font = B; p["B17"].font = B

p["A21"] = "Факт (считается из листа «База»)"; p["A21"].font = H2
p["A22"] = "Статус"; p["B22"] = "Компаний"
for c in (p["A22"], p["B22"]):
    c.font = WHITE_B; c.fill = HEAD_FILL
r = 23
for s in STATUSES:
    p.cell(row=r, column=1, value=s).font = R
    c = p.cell(row=r, column=2, value=f'=COUNTIF(База!$S$2:$S${LAST},A{r})'); c.font = R; c.border = BOX
    r += 1
first_status, last_status = 23, r - 1
r += 1  # blank row after the status table
TOTAL, TALKS, MONEY = r, r + 1, r + 2  # rows of the first three fact lines
st = lambda name: f"B{first_status + STATUSES.index(name)}"
facts = [
    ("Всего обработано (есть статус)", f"=SUM(B{first_status}:B{last_status})", "#,##0"),
    ("Разговоров с тем, кто решает", "=" + "+".join(st(x) for x in REACHED), "#,##0"),
    ("Получено денег, ₽", f"=SUM(База!U2:U{LAST})", '#,##0 "₽"'),
    ("Осталось до цели, ₽", f"=MAX(B4-B{MONEY},0)", '#,##0 "₽"'),
    ("Выполнение плана, %", f"=IF(B4>0,B{MONEY}/B4,0)", "0%"),
    ("Факт: дозвон, %", f"=IF(B{TOTAL}>0,B{TALKS}/B{TOTAL},0)", "0%"),
    ("Факт: согласие на черновик, %",
     f"=IF(B{TALKS}>0,({st('Интерес — отправить демо')}+{st('Демо отправлено')}+{st('Счёт / предоплата')}+{st('Оплачено')})/B{TALKS},0)",
     "0%"),
]
for lab, f, fmt in facts:
    p.cell(row=r, column=1, value=lab).font = B
    c = p.cell(row=r, column=2, value=f); c.font = B; c.number_format = fmt; c.border = BOX
    r += 1
p.column_dimensions["A"].width = 52
p.column_dimensions["B"].width = 16
p.column_dimensions["C"].width = 110

# ---------------------------------------------------------------- Скрипт
s = wb.create_sheet("Скрипт")
r = 1
for line in open(SCRIPT_MD, encoding="utf-8").read().splitlines():
    if not line.strip():
        r += 1; continue
    txt = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
    font = R
    if line.startswith("# "):
        txt, font = txt[2:], H1
    elif line.startswith("## "):
        txt, font = txt[3:], H2
    elif line.startswith("**") and line.rstrip().endswith("**"):
        font = B
    elif line.lstrip().startswith("> "):
        txt = "«" + txt.lstrip()[2:] + "»" if False else "    " + txt.lstrip()[2:]
        font = Font(name=F, size=10, color="1F4E78")
    c = s.cell(row=r, column=1, value=txt)
    c.font = font
    c.alignment = Alignment(wrap_text=True, vertical="top")
    r += 1
s.column_dimensions["A"].width = 140

# ---------------------------------------------------------------- База
b = wb.create_sheet("База")
cols = [("№", 6), ("Приоритет", 10), ("Балл", 7), ("Город", 16), ("Сфера", 16), ("Ниша", 22), ("Название", 30),
        ("Телефон", 19), ("Доп. телефон", 19), ("Адрес", 28), ("Часы работы", 22), ("Соцсети", 30),
        ("Email", 22), ("Юрлицо / ИП", 24), ("Данные от", 11), ("Что сказать (персональный заход)", 80),
        ("Проверить сайт", 13), ("На карте", 11), ("Статус", 24), ("Дата след. контакта", 14),
        ("Получено, ₽", 13), ("Комментарий", 40)]
for j, (name, w) in enumerate(cols, 1):
    c = b.cell(row=1, column=j, value=name)
    c.font = WHITE_B; c.fill = HEAD_FILL; c.alignment = Alignment(wrap_text=True, vertical="center")
    b.column_dimensions[get_column_letter(j)].width = w
for j in range(19, 23):
    b.cell(row=1, column=j).fill = PatternFill("solid", fgColor="C55A11")
b.cell(row=1, column=19).comment = Comment("Заполняете вы: выберите статус из списка после звонка.", "таблица")
b.cell(row=1, column=21).comment = Comment("Впишите сумму, которую клиент реально оплатил (предоплата + доплата).", "таблица")

for i, l in enumerate(leads, 2):
    vals = [i - 1, l["prio"], l["score"], l["city"], l["group"], l["niche"], l["name"], l["phone"], l["phone2"],
            l["addr"], l["hours"], l["social"], l["email"], l["operator"], l["fresh"], l["pitch"]]
    for j, v in enumerate(vals, 1):
        c = b.cell(row=i, column=j, value=v)
        c.font = R
        c.alignment = WRAP if j == 16 else TOP
    q = b.cell(row=i, column=17, value="Проверить"); q.hyperlink = l["check"]; q.font = LINK; q.alignment = TOP
    if l["map"]:
        m = b.cell(row=i, column=18, value="Карта"); m.hyperlink = l["map"]; m.font = LINK; m.alignment = TOP
    for j in range(19, 23):
        c = b.cell(row=i, column=j); c.font = BLUE; c.alignment = TOP
    b.cell(row=i, column=20).number_format = "DD.MM.YYYY"
    b.cell(row=i, column=21).number_format = '#,##0'
    b.row_dimensions[i].height = 64

dv = DataValidation(type="list", formula1='"' + ",".join(STATUSES) + '"', allow_blank=True,
                    errorTitle="Статус", error="Выберите статус из списка", showDropDown=False)
b.add_data_validation(dv)
dv.add(f"S2:S{LAST}")
dvd = DataValidation(type="date", operator="greaterThan", formula1="DATE(2026,1,1)", allow_blank=True)
b.add_data_validation(dvd); dvd.add(f"T2:T{LAST}")
dvn = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True)
b.add_data_validation(dvn); dvn.add(f"U2:U{LAST}")

fill = lambda color: PatternFill("solid", fgColor=color, bgColor=color)
b.conditional_formatting.add(f"B2:B{LAST}", CellIsRule(operator="equal", formula=['"A"'], fill=fill("C6EFCE")))
b.conditional_formatting.add(f"B2:B{LAST}", CellIsRule(operator="equal", formula=['"B"'], fill=fill("FFF2CC")))
b.conditional_formatting.add(f"A2:V{LAST}", FormulaRule(formula=['$S2="Оплачено"'], fill=fill("A9D08E")))
b.conditional_formatting.add(f"A2:V{LAST}", FormulaRule(formula=['OR($S2="Отказ",$S2="Есть сайт")'], fill=fill("EDEDED")))
b.conditional_formatting.add(f"A2:V{LAST}", FormulaRule(formula=['OR($S2="Интерес — отправить демо",$S2="Демо отправлено",$S2="Счёт / предоплата")'], fill=fill("DDEBF7")))
b.freeze_panes = "H2"
b.auto_filter.ref = f"A1:V{LAST}"

# ---------------------------------------------------------------- Сводка
v = wb.create_sheet("Сводка")
groups = sorted({l["group"] for l in leads})
v["A1"] = "Сколько компаний в базе: город × сфера"; v["A1"].font = H1
v["A2"] = "Город"; v["A2"].font = WHITE_B; v["A2"].fill = HEAD_FILL
for j, g in enumerate(groups, 2):
    c = v.cell(row=2, column=j, value=g); c.font = WHITE_B; c.fill = HEAD_FILL; c.alignment = Alignment(wrap_text=True)
    v.column_dimensions[get_column_letter(j)].width = 13
tj = len(groups) + 2
for name, col in (("Всего", tj), ("Из них A", tj + 1)):
    c = v.cell(row=2, column=col, value=name); c.font = WHITE_B; c.fill = HEAD_FILL
    v.column_dimensions[get_column_letter(col)].width = 11
for i, city in enumerate(cities, 3):
    v.cell(row=i, column=1, value=city).font = R
    for j, g in enumerate(groups, 2):
        gl = get_column_letter(j)
        c = v.cell(row=i, column=j, value=f"=COUNTIFS(База!$D$2:$D${LAST},$A{i},База!$E$2:$E${LAST},{gl}$2)")
        c.font = R; c.border = BOX
    c = v.cell(row=i, column=tj, value=f"=SUM(B{i}:{get_column_letter(tj - 1)}{i})"); c.font = B; c.border = BOX
    c = v.cell(row=i, column=tj + 1, value=f'=COUNTIFS(База!$D$2:$D${LAST},$A{i},База!$B$2:$B${LAST},"A")')
    c.font = B; c.border = BOX
tr = len(cities) + 3
v.cell(row=tr, column=1, value="Итого").font = B
for j in range(2, tj + 2):
    cl = get_column_letter(j)
    c = v.cell(row=tr, column=j, value=f"=SUM({cl}3:{cl}{tr - 1})"); c.font = B; c.border = BOX; c.fill = SOFT
v.column_dimensions["A"].width = 20
v.freeze_panes = "B3"

wb.move_sheet("База", offset=-2)  # order: Старт, База, План, Скрипт, Сводка
wb.save(OUT)
print("saved", OUT, "rows", N)
