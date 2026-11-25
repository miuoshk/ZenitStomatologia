#!/usr/bin/env python3
"""Generuje makiety ekranów Crux 1.0 (HTML) z danymi przykładowymi.
Uruchom: python3 generuj.py  → pliki logowanie.html, oblozenie.html, pulpit.html, o-crux.html obok skryptu.
Render do PNG: node ../render.js makiety
"""
from pathlib import Path
import random

HERE = Path(__file__).parent
random.seed(20261105)

ARCH = [(7.0,97.8,7.0),(7.9,80.2,7.4),(11.3,61.6,8.2),(16.7,45.7,5.3),(23.5,33.0,5.8),(33.0,21.2,6.2),(44.7,12.2,5.3),(59.4,7.0,7.0),
        (76.6,7.0,7.0),(91.3,12.2,5.3),(103.0,21.2,6.2),(112.5,33.0,5.8),(119.3,45.7,5.3),(124.7,61.6,8.2),(128.1,80.2,7.4),(129.0,97.8,7.0)]
GAB = {"01": ("Nowodworska", "#2F7D45"), "02": ("Białowieska", "#3A76AC")}
KOL = {"Z1": ("#F6F1E1", "#C9B37F"), "Z2": ("#EFE4C6", "#B8A06A"), "Z3": ("#E6D6AE", "#A88F55"), "Z4": ("#D9C595", "#8F7741"), "Z5": ("#C9B37F", "#6F5B2E"), "Z+": ("#E4ECE5", "#87A08F")}
SKALA = ["#E4ECE5", "#CFDBD1", "#AFC2B3", "#87A08F", "#5E7F6A", "#2F5A33", "#173A2A"]

def arch_gauge(value, width=160, fill="#2F5A33", empty="#CFDBD1", label=None, sub=None):
    filled = round(value * 16)
    h = width * 104.8 / 136
    circles = "".join(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill if i < filled else empty}"/>' for i, (cx, cy, r) in enumerate(ARCH))
    pct = f"{round(value*100)}%"
    return (f'<figure class="arch" style="width:{width}px"><div style="position:relative;width:{width}px;height:{h:.0f}px">'
            f'<svg viewBox="0 0 136 104.8" width="{width}" height="{h:.0f}" role="img" aria-label="Łuk obłożenia {pct}">{circles}</svg>'
            f'<div class="arch-val num" style="top:{h*0.56:.0f}px">{pct}</div></div>'
            + (f'<figcaption><span class="locchip"><b>{label[0]}</b>{label[1]}</span>' + (f'<small>{sub}</small>' if sub else '') + '</figcaption>' if label else '')
            + '</figure>')

def sparkline(points, color="#4A6E52", w=72, h=28):
    mn, mx = min(points), max(points)
    rng = (mx - mn) or 1
    pts = [(2 + i * (w - 6) / (len(points) - 1), h - 3 - (p - mn) / rng * (h - 8)) for i, p in enumerate(points)]
    poly = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    lx, ly = pts[-1]
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" aria-hidden="true"><polyline fill="none" stroke="#AFC2B3" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="{poly}"/>'
            f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="4" fill="{color}" stroke="#FFFFFF" stroke-width="2"/></svg>')

def kpi(label, value, unit, delta, good=True, spark=None, note=None, color="#4A6E52"):
    cls = "dobrze" if good else "uwaga"
    return (f'<div class="kpi"><div class="kpi-top"><span class="label">{label}</span><span class="help" title="definicja">?</span></div>'
            f'<div class="kpi-row"><div class="kpi-val num">{value}<span class="unit">{unit}</span></div>{sparkline(spark or [3,4,4,5,4,6,6,7,6,7,8,8], color)}</div>'
            f'<div class="kpi-foot"><span class="pill {cls}">{delta}</span>' + (f'<span class="muted">{note}</span>' if note else '') + '</div></div>')

def shell(title, active, body, side_loc=("01", "Nowodworska"), user=("KN", "Kasia Nowak", "recepcja · 01"), date="czw., 12 listopada 2026", extra_css=""):
    nav = [("Obłożenie", "oblozenie"), ("Pulpit", "pulpit"), ("Ustawienia", "ustawienia"), ("Integracje", "integracje")]
    nav_html = "".join(f'<a class="{"active" if k == active else ""}" href="#"><span class="ico"></span>{n}</a>' for n, k in nav)
    return f'''<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>{title}</title><link rel="stylesheet" href="app.css"><style>{extra_css}</style></head>
<body><div class="app">
<aside class="side">
  <img class="logo" src="../marka/logo/crux-poziomy-krem.svg" alt="crux · zenit.stomatologia">
  <div class="switch"><span class="chip">{side_loc[0]}</span><span class="name">{side_loc[1]}</span><span class="chev">▾</span></div>
  <nav class="nav">{nav_html}</nav>
  <div class="spacer"></div>
  <div class="user"><div class="av">{user[0]}</div><div class="meta">{user[1]}<br><small>{user[2]}</small></div><span class="lock">Zablokuj</span></div>
</aside>
<div class="main">
  <header class="top"><span class="title">{title}</span><div class="cmd">Szukaj lub przejdź do… <kbd>Ctrl K</kbd></div><span class="date">{date}</span><div class="av">{user[0]}</div></header>
  <section class="content">{body}</section>
</div></div></body></html>'''

# ---------------------------------------------------------------- logowanie
def logowanie():
    css = '''
    body{background:#173A2A;min-height:900px;height:900px;overflow:hidden}
    .login{display:grid;grid-template-columns:1fr 1fr;height:900px}
    .left{padding:72px 96px;display:flex;flex-direction:column;justify-content:center;gap:36px;color:#EFE4C6}
    .left .logo{height:58px;width:auto}
    .form{background:#F7F3E8;border-radius:22px;padding:32px;width:440px;display:flex;flex-direction:column;gap:18px;color:#173A2A}
    .form h2{font-size:22px;line-height:28px;letter-spacing:-.02em}
    .form .btn{justify-content:center;height:44px;font-size:15px}
    .foot{color:#AFC2B3;font-size:12px}
    .right{position:relative;overflow:hidden}
    .right img{position:absolute;right:-60px;top:40px;height:860px;opacity:.9}
    .right .cap{position:absolute;left:64px;bottom:56px;color:#AFC2B3;font-size:12px}
    '''
    body = f'''<div class="login">
<div class="left">
  <img class="logo" src="../marka/logo/crux-poziomy-krem.svg" alt="crux · zenit.stomatologia">
  <div class="form">
    <h2>Zaloguj się</h2>
    <div class="field"><label>Adres e-mail</label><div class="in">k.nowak@zenitstomatologia.pl</div></div>
    <div class="field"><label>Hasło</label><div class="in">••••••••••••</div><span class="help">Po haśle poprosimy o kod z aplikacji uwierzytelniającej.</span></div>
    <span class="btn primary">Dalej</span>
  </div>
  <p class="foot">Konto imienne. Jeśli nie masz dostępu, poproś kierownika gabinetu.<br>Rycina: Salvia officinalis · F. E. Köhler, Medizinal-Pflanzen (1887)</p>
</div>
<div class="right"><img src="../marka/ryciny/szalwia-krem.svg" alt=""></div>
</div>'''
    return f'<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Logowanie · Crux</title><link rel="stylesheet" href="app.css"><style>{css}</style></head><body>{body}</body></html>'

# ---------------------------------------------------------------- oblozenie
def oblozenie():
    hours = list(range(8, 20))
    chairs = [("Fotel 1", "lek. A. Wrona", "AW"), ("Fotel 2", "hig. K. Sowa", "KS"), ("Fotel 3", "lek. P. Kos", "PK")]
    # entries: (chair index, hour, category, provider initials, amount or None)
    entries = {}
    plan = {
        0: [(8, "Z1", 180), (9, "Z3", 420), (10, "Z3", 450), (11, "Z4", 900), (12, "Z4", None), (14, "Z1", 180), (15, "Z5", 1800), (16, "Z5", None), (17, "Z3", 380)],
        1: [(8, "Z2", 180), (9, "Z2", 180), (10, "Z2", 180), (12, "Z2", 180), (13, "Z2", 180), (14, "Z2", 180), (15, "Z1", 150), (16, "Z2", 180)],
        2: [(10, "Z1", 180), (11, "Z3", 420), (12, "Z3", 460), (16, "Z4", 850), (17, "Z4", None), (18, "Z1", 180)],
    }
    for ci, lst in plan.items():
        for h, cat, amt in lst:
            entries[(ci, h)] = (cat, chairs[ci][2], amt)
    blocked = {(2, 13), (2, 14), (2, 15)}
    focus = (1, 11)
    rows = ""
    for h in hours:
        cells = f'<div class="hour num">{h}:00</div>'
        for ci, (cname, who, ini) in enumerate(chairs):
            key = (ci, h)
            cls = "cell"
            inner = ""
            style = ""
            if key in blocked:
                cls += " blocked"
                inner = "<span>serwis</span>" if h == 13 else ""
            elif key in entries:
                cat, ini2, amt = entries[key]
                bg, edge = KOL[cat]
                style = f'background:{bg};border-left:4px solid {edge}'
                amt_s = f'<span class="amt num">{amt:,} zł</span>'.replace(",", " ") if amt else '<span class="amt muted">— zł</span>'
                inner = f'<span class="ini">{ini2}</span><span class="cat">{cat}</span>{amt_s}'
                cls += " entry"
            if key == focus:
                cls += " focus"
            cells += f'<div class="{cls}" style="{style}">{inner}</div>'
        rows += f'<div class="row">{cells}</div>'
    head = '<div class="row head"><div class="hour"></div>' + "".join(
        f'<div class="chair"><span class="locchip"><b>01</b></span><div><strong>{c}</strong><br><small class="sec">{w}</small></div></div>' for c, w, _ in chairs) + "</div>"
    css = '''
    .wrap{display:grid;grid-template-columns:1fr 352px;gap:16px}
    .bar{display:flex;align-items:center;gap:12px}
    .bar .nav{display:inline-flex;gap:4px}
    .grid{background:#FFFFFF;border:1px solid var(--border);border-radius:22px;padding:12px 16px 16px;overflow:hidden}
    .row{display:grid;grid-template-columns:64px repeat(3,1fr);gap:6px;margin-top:6px}
    .row.head{margin-top:0;padding-bottom:8px;border-bottom:1px solid var(--border);margin-bottom:4px}
    .chair{display:flex;gap:8px;align-items:center;padding:4px 6px;font-size:13px;line-height:16px}
    .hour{font-size:12px;color:var(--text-muted);padding-top:6px}
    .cell{height:42px;border-radius:8px;border:1px solid var(--grid);background:#FFFFFF;display:flex;align-items:center;gap:8px;padding:0 10px;font-size:13px;font-weight:600}
    .cell.entry .ini{font-weight:800}
    .cell.entry .cat{font-size:11px;font-weight:700;color:var(--text-secondary)}
    .cell.entry .amt{margin-left:auto;font-weight:600}
    .cell.blocked{background:repeating-linear-gradient(135deg,#F1ECDD 0 6px,#E4ECE5 6px 12px);color:var(--text-secondary);font-weight:600;font-size:12px;justify-content:center;border-style:dashed;border-color:var(--border)}
    .cell.focus{outline:2px solid var(--focus-ring);outline-offset:2px}
    .panel{background:#FFFFFF;border:1px solid var(--border);border-radius:22px;padding:20px;display:flex;flex-direction:column;gap:14px;box-shadow:0 6px 18px rgba(23,58,42,.12);align-self:start}
    .panel h2{font-size:16px;line-height:22px}
    .panel .actions{display:flex;gap:8px;justify-content:space-between;margin-top:6px}
    .daybar{display:flex;align-items:center;gap:20px;background:#FFFFFF;border:1px solid var(--border);border-radius:22px;padding:14px 20px}
    .daybar .stat{display:flex;flex-direction:column;gap:2px}
    .daybar .stat b{font-size:18px;font-weight:800;letter-spacing:-.02em}
    .daybar .right{margin-left:auto;display:flex;gap:8px;align-items:center}
    '''
    body = f'''
<div class="bar"><h1 style="font-size:24px;white-space:nowrap">Obłożenie · <span class="locchip"><b>01</b>Nowodworska</span></h1>
 <span class="btn secondary icon">‹</span><span class="btn secondary">czw., 12 listopada 2026</span><span class="btn secondary icon">›</span>
 <span class="seg"><span class="on">Dzień</span><span>Tydzień</span></span>
 <span class="btn secondary" style="margin-left:auto">Dzień jak wczoraj</span><span class="btn primary">Zamknij dzień</span></div>
<div class="wrap">
 <div class="grid">{head}{rows}</div>
 <div class="panel">
  <div><span class="label">Fotel 2 · hig. K. Sowa</span><h2>Czwartek 12.11 · 11:00–12:00</h2></div>
  <div class="field"><label>Wykonawca</label><div class="in">hig. Katarzyna Sowa <span style="margin-left:auto" class="muted">▾</span></div></div>
  <div class="field"><label>Kategoria usługi</label><div class="chipz"><span class="z1">Z1</span><span class="z2 sel">Z2</span><span class="z3">Z3</span><span class="z4">Z4</span><span class="z5">Z5</span><span class="zp">Z+</span></div><span class="help">Klawisze 1–6 ustawiają kategorię bez otwierania panelu.</span></div>
  <div class="field"><label>Zakres godzin</label><div style="display:flex;gap:8px"><div class="in num" style="flex:1">11:00</div><div class="in num" style="flex:1">12:00</div></div></div>
  <div class="field"><label>Kwota zrealizowana (opcjonalnie)</label><div class="in num">180,00 zł</div><span class="help">Pomiar; księgowość zostaje w Optimie. Od wydania 2.0 źródłem będą należności.</span></div>
  <div class="field"><label>Notatka organizacyjna</label><div class="in muted">bez danych pacjenta</div></div>
  <div class="actions"><span class="btn danger">Unieważnij…</span><span class="btn primary">Zapisz · Ctrl+Enter</span></div>
 </div>
</div>
<div class="daybar">
 <div class="stat"><span class="label">Godziny z wpisem</span><b class="num">23 h <span class="sec" style="font-weight:600;font-size:13px">z 33 h dostępnych</span></b></div>
 <div class="stat"><span class="label">Obłożenie dnia</span><b class="num">70%</b></div>
 <div class="stat"><span class="label">Kwoty</span><b class="num">8 440 zł <span class="sec" style="font-weight:600;font-size:13px">· 19 z 23 godzin ma kwotę</span></b></div>
 <div class="stat"><span class="label">Blokady</span><b class="num">3 h <span class="sec" style="font-weight:600;font-size:13px">· fotel 3, serwis</span></b></div>
 <div class="right"><span class="pill uwaga">● Dzień otwarty</span><span class="muted">Wczoraj zamknięte 18:42 · K. Nowak</span></div>
</div>'''
    return shell("Obłożenie", "oblozenie", body, extra_css=css)

# ---------------------------------------------------------------- pulpit
def line_chart():
    w, h = 1120, 240
    weeks = 13
    s01 = [52, 49, 55, 58, 54, 61, 63, 60, 66, 64, 69, 71, 68]
    s02 = [31, 33, 30, 36, 35, 38, 37, 41, 40, 43, 44, 42, 47]
    x0, x1, y0, y1 = 48, w - 90, 24, h - 36
    def pt(i, v):
        return x0 + i * (x1 - x0) / (weeks - 1), y1 - (v / 80) * (y1 - y0)
    def poly(s, col):
        pts = " ".join(f"{pt(i, v)[0]:.1f},{pt(i, v)[1]:.1f}" for i, v in enumerate(s))
        lx, ly = pt(weeks - 1, s[-1])
        return (f'<polyline fill="none" stroke="{col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="{pts}"/>'
                f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="4" fill="{col}" stroke="#fff" stroke-width="2"/>')
    grid = "".join(f'<line x1="{x0}" y1="{pt(0, v)[1]:.1f}" x2="{x1}" y2="{pt(0, v)[1]:.1f}" stroke="#E2E6DE"/>'
                   f'<text x="{x0-8}" y="{pt(0, v)[1]+4:.1f}" text-anchor="end" font-size="11" fill="#6B7F70">{v}</text>' for v in (0, 20, 40, 60, 80))
    target_y = pt(0, 60)[1]
    labels = [(0, "10 sie"), (4, "7 wrz"), (8, "5 paź"), (12, "2 lis")]
    xl = "".join(f'<text x="{pt(i,0)[0]:.1f}" y="{h-12}" text-anchor="middle" font-size="11" fill="#6B7F70">{t}</text>' for i, t in labels)
    svg = (f'<svg viewBox="0 0 {w} {h}" width="100%" height="{h}" role="img" aria-label="Przychód zrealizowany tygodniowo, dwa gabinety">{grid}'
           f'<line x1="{x0}" y1="{target_y:.1f}" x2="{x1}" y2="{target_y:.1f}" stroke="#6B7F70" stroke-dasharray="3 3"/><text x="{x1+6}" y="{target_y+4:.1f}" font-size="11" fill="#6B7F70">cel 60</text>'
           f'{poly(s01, GAB["01"][1])}{poly(s02, GAB["02"][1])}'
           f'<text x="{x1+12}" y="{pt(12,s01[-1])[1]+4:.1f}" font-size="12" font-weight="700" fill="#173A2A">01 · {s01[-1]} tys.</text>'
           f'<text x="{x1+12}" y="{pt(12,s02[-1])[1]+4:.1f}" font-size="12" font-weight="700" fill="#173A2A">02 · {s02[-1]} tys.</text>{xl}</svg>')
    return svg

def dot_plot():
    rows = [("Obłożenie foteli", 0.81, 0.66, 0.74, "81%", "66%"), ("Przychód / h fotela", 0.62, 0.45, 0.54, "512 zł", "421 zł"),
            ("Godziny foteli / dzień", 0.70, 0.50, 0.60, "25,2 h", "17,9 h"), ("Dni zamknięte", 0.98, 0.90, 0.94, "98%", "90%")]
    w, rh = 500, 40
    out = []
    for i, (name, a, b, med, la, lb) in enumerate(rows):
        y = 20 + i * rh
        x = lambda v: 170 + v * 280
        out.append(f'<text x="0" y="{y+4}" font-size="13" font-weight="600" fill="#173A2A">{name}</text>'
                   f'<line x1="{x(b):.0f}" y1="{y}" x2="{x(a):.0f}" y2="{y}" stroke="#AFC2B3" stroke-width="6" stroke-linecap="round"/>'
                   f'<line x1="{x(med):.0f}" y1="{y-9}" x2="{x(med):.0f}" y2="{y+9}" stroke="#87A08F" stroke-width="2"/>'
                   f'<circle cx="{x(a):.0f}" cy="{y}" r="7" fill="{GAB["01"][1]}" stroke="#fff" stroke-width="2"/><circle cx="{x(b):.0f}" cy="{y}" r="7" fill="{GAB["02"][1]}" stroke="#fff" stroke-width="2"/>'
                   f'<text x="{x(a)+12:.0f}" y="{y+4}" font-size="11" font-weight="700" fill="#173A2A">{la}</text><text x="{x(b)-12:.0f}" y="{y+4}" font-size="11" font-weight="700" fill="#173A2A" text-anchor="end">{lb}</text>')
    return f'<svg viewBox="0 0 {w} {20+len(rows)*rh}" width="100%" role="img" aria-label="Porównanie gabinetów">{"".join(out)}</svg>'

def parts_bar():
    parts = [("Z1", 9), ("Z2", 14), ("Z3", 22), ("Z4", 19), ("Z5", 31), ("Z+", 5)]
    w, h = 520, 28
    x = 0
    segs = ""
    for i, (k, p) in enumerate(parts):
        sw = w * p / 100 - 2
        col = SKALA[1 + i]
        txt = f'<text x="{x+sw/2:.0f}" y="19" font-size="11" font-weight="700" fill="{"#173A2A" if i < 3 else "#EFE4C6"}" text-anchor="middle">{p}%</text>' if p >= 8 else ""
        segs += f'<rect x="{x:.0f}" y="0" width="{sw:.0f}" height="{h}" rx="4" fill="{col}"/>{txt}'
        x += sw + 2
    legend = "".join(f'<span class="lg"><i style="background:{KOL[k][0]};border:1px solid {KOL[k][1]}"></i>{k} <b class="num">{p}%</b></span>' for k, p in parts)
    return f'<svg viewBox="0 0 {w} {h}" width="100%" height="{h}" role="img" aria-label="Struktura przychodu wg kategorii">{segs}</svg><div class="legend">{legend}</div>'

def dot_calendar():
    weeks, days = 13, 6
    out = []
    for wk in range(weeks):
        for d in range(days):
            base = [0.78, 0.82, 0.8, 0.76, 0.74, 0.45][d]
            v = max(0, min(1, base + random.uniform(-0.12, 0.12) + (0.04 if wk > 8 else 0)))
            col = SKALA[min(6, int(v * 7))]
            out.append(f'<circle cx="{34 + wk*26}" cy="{12 + d*22}" r="7" fill="{col}"><title>tydzień {wk+1}, dzień {d+1}: {round(v*100)}%</title></circle>')
    dl = "".join(f'<text x="0" y="{16+i*22}" font-size="11" fill="#6B7F70">{t}</text>' for i, t in enumerate(["pn", "wt", "śr", "cz", "pt", "sb"]))
    return f'<svg viewBox="-4 0 {weeks*26+50} {days*22+6}" width="100%" role="img" aria-label="Rytm tygodnia: obłożenie per dzień">{dl}{"".join(out)}</svg>'

def bar_list():
    rows = [("01 · Fotel 1", 418, "#2F5A33"), ("01 · Fotel 2", 402, "#2F5A33"), ("01 · Fotel 3", 226, "#2F5A33"), ("02 · Fotel 1", 390, "#2F5A33"), ("02 · Fotel 2", 221, "#2F5A33")]
    mx = max(r[1] for r in rows)
    html = ""
    for name, v, col in rows:
        html += f'<div class="bl"><span class="bl-n">{name}</span><div class="bl-b"><i style="width:{v/mx*100:.0f}%;background:{col}"></i></div><span class="bl-v num">{v} h</span></div>'
    return html

def pulpit():
    css = '''
    .filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .filters .lbl{font-size:12px;font-weight:600;color:var(--text-secondary)}
    .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
    .kpi{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}
    .kpi-top{display:flex;justify-content:space-between;align-items:center}
    .kpi .help{width:16px;height:16px;border-radius:999px;border:1px solid var(--border);font-size:10px;display:grid;place-items:center;color:var(--text-muted)}
    .kpi-row{display:flex;justify-content:space-between;align-items:flex-end}
    .kpi-val{font-size:28px;line-height:34px;font-weight:800;letter-spacing:-.02em;white-space:nowrap}
    .kpi .pill{white-space:nowrap}
    .kpi-val .unit{font-size:15px;font-weight:700;margin-left:4px}
    .kpi-foot{display:flex;gap:8px;align-items:center;font-size:12px}
    .cards{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .card.wide{grid-column:1/-1}
    .card h2{font-size:16px;line-height:22px}
    .card .sub{font-size:12px;color:var(--text-secondary);margin-top:2px}
    .card .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
    .card .tools{display:flex;gap:8px;align-items:center}
    .legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12px;color:var(--text-secondary)}
    .lg{display:inline-flex;align-items:center;gap:6px}.lg i{width:12px;height:12px;border-radius:999px;display:inline-block}
    .lg.line i{width:16px;height:3px;border-radius:2px}
    .arches{display:flex;justify-content:space-around;align-items:flex-end}
    .arch{display:flex;flex-direction:column;align-items:center;gap:8px}.arch figcaption{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:13px}.arch figcaption small{color:var(--text-secondary)}
    .arch-val{position:absolute;left:0;right:0;text-align:center;font-size:26px;font-weight:800;letter-spacing:-.02em}
    .bl{display:grid;grid-template-columns:110px 1fr 56px;align-items:center;gap:10px;margin-top:8px;font-size:13px}
    .bl-b{height:12px;background:var(--surface-sunken);border-radius:0 4px 4px 0}.bl-b i{display:block;height:12px;border-radius:0 4px 4px 0}
    .bl-v{text-align:right;font-weight:700}
    .foot{display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)}
    .dq li{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--grid);font-size:13px}.dq a{color:var(--zenit-zielen);font-weight:600;text-decoration:none}
    '''
    legend_g = '<span class="lg line"><i style="background:#2F7D45"></i><span class="locchip"><b>01</b>Nowodworska</span></span><span class="lg line"><i style="background:#3A76AC"></i><span class="locchip"><b>02</b>Białowieska</span></span><span class="lg line"><i style="background:#6B7F70;height:2px;border-top:2px dashed #6B7F70;background:none"></i>cel</span>'
    tools = '<div class="tools"><span class="seg"><span class="on">Wykres</span><span>Tabela</span></span></div>'
    body = f'''
<div style="display:flex;align-items:center;gap:16px"><h1>Pulpit sieci</h1><span class="muted">7 października – 5 listopada 2026</span><span class="pill uwaga" style="margin-left:auto">Dane przykładowe</span></div>
<div class="filters">
 <span class="seg"><span>7 dni</span><span class="on">30 dni</span><span>Kwartał</span></span>
 <span class="seg"><span class="on">Wszystkie</span><span>01 Nowodworska</span><span>02 Białowieska</span></span>
 <span class="lbl">Wykonawca</span><span class="btn secondary" style="height:32px">Wszyscy ▾</span>
 <span class="chipz"><span class="z1">Z1</span><span class="z2">Z2</span><span class="z3">Z3</span><span class="z4">Z4</span><span class="z5">Z5</span><span class="zp">Z+</span></span>
 <span style="margin-left:auto;display:inline-flex;align-items:center;gap:8px;white-space:nowrap"><span class="lbl">Porównaj</span><span class="btn secondary" style="height:32px">poprzedni okres ▾</span></span>
</div>
<div class="kpis">
 {kpi("Obłożenie foteli", "74", "%", "▲ 3 pp", True, [68,70,69,71,70,72,73,72,74,73,75,74])}
 {kpi("Godziny pracy foteli", "1 284", "h", "▲ 4,1%", True, [1100,1150,1120,1180,1210,1190,1230,1240,1250,1270,1260,1284])}
 {kpi("Przychód zrealizowany", "612", "tys. zł", "▲ 6,2%", True, [520,540,530,560,570,575,590,585,600,598,605,612], "91% godzin z kwotą")}
 {kpi("Przychód / h fotela", "477", "zł", "▲ 2,0%", True, [455,460,458,466,470,468,472,471,474,476,475,477])}
 {kpi("Dni zamknięte", "96", "%", "▼ 2 pp", False, [100,100,98,100,97,100,96,98,100,97,96,96], "2 dni do zamknięcia")}
 {kpi("Godziny wykonawców", "1 190", "h", "▲ 3,8%", True, [1020,1060,1050,1090,1110,1100,1140,1150,1160,1175,1170,1190])}
</div>
<div class="cards">
 <div class="card wide"><div class="head"><div><h2>Przychód zrealizowany rośnie w obu gabinetach; 01 nad celem od 5 tygodni</h2><div class="sub">tygodniowo, tys. zł · kwoty z wpisów obłożenia · cel 60 tys. zł/tydzień dla 01</div></div>{tools}</div>{line_chart()}<div class="legend">{legend_g}</div></div>
 <div class="card"><div class="head"><div><h2>Obłożenie foteli: 01 nad celem, 02 poniżej</h2><div class="sub">30 dni · minuty wpisów ÷ dostępne minuty · 16 zębów = 100%</div></div>{tools}</div>
   <div class="arches">{arch_gauge(0.81, 170, label=("01","Nowodworska"), sub="cel 75% · ▲ 3 pp")}{arch_gauge(0.66, 170, label=("02","Białowieska"), sub="cel 65% · ▲ 1 pp")}</div></div>
 <div class="card"><div class="head"><div><h2>Porównanie gabinetów</h2><div class="sub">kropka = gabinet · linia = rozstęp · kreska = mediana sieci</div></div>{tools}</div>{dot_plot()}</div>
 <div class="card"><div class="head"><div><h2>Struktura przychodu: Z5 to prawie jedna trzecia</h2><div class="sub">udział kategorii w przychodzie zrealizowanym, 30 dni</div></div>{tools}</div>{parts_bar()}</div>
 <div class="card"><div class="head"><div><h2>Rytm tygodnia: soboty w 02 najsłabsze</h2><div class="sub">obłożenie per dzień tygodnia, 13 tygodni, obie lokalizacje</div></div>{tools}</div>{dot_calendar()}</div>
 <div class="card"><div class="head"><div><h2>Godziny pracy per fotel</h2><div class="sub">30 dni · fotel 3 w 01 i fotel 2 w 02 pracują o połowę mniej</div></div>{tools}</div>{bar_list()}</div>
 <div class="card"><div class="head"><div><h2>Jakość danych: 2 dni do zamknięcia</h2><div class="sub">dni robocze bez „Zamknij dzień” w okresie · liczby za te dni są niepełne</div></div></div>
   <ul class="dq" style="list-style:none"><li><span><span class="locchip"><b>02</b>Białowieska</span> · wtorek 4 listopada</span><a href="#">Otwórz dzień ›</a></li><li><span><span class="locchip"><b>02</b>Białowieska</span> · sobota 25 października</span><a href="#">Otwórz dzień ›</a></li><li><span class="muted">01 Nowodworska: wszystkie dni zamknięte</span><span class="pill dobrze">✓ 100%</span></li></ul></div>
</div>
<div class="foot"><span>Dane odświeżone 10:40 · pełne przeliczenie nocne 02:10 · definicje metryk: rejestr (docs/11)</span><span>Eksport CSV · analytics.export</span></div>'''
    return shell("Pulpit sieci", "pulpit", body, side_loc=("01+02", "cała sieć"), user=("MK", "Miłosz Krysiak", "zarząd · sieć"), extra_css=css)

# ---------------------------------------------------------------- o-crux
def o_crux():
    css = '''
    .about{display:grid;grid-template-columns:1fr 420px;gap:24px}
    .about .card{display:flex;flex-direction:column;gap:14px}
    .about .ver{font-size:40px;line-height:44px;font-weight:800;letter-spacing:-.03em}
    .about .ver small{font-size:18px;font-weight:600;color:var(--text-secondary);margin-left:10px;letter-spacing:0}
    .about dl{display:grid;grid-template-columns:180px 1fr;gap:8px 16px;font-size:13px}.about dt{color:var(--text-secondary)}.about dd{font-weight:600}
    .plant{background:#fff;border:1px solid var(--border);border-radius:22px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:10px}
    .plant img{height:420px}
    .plant p{font-size:12px;color:var(--text-secondary);text-align:center;line-height:16px}
    .tabs{display:flex;gap:18px;border-bottom:1px solid var(--border)}.tabs span{padding:10px 2px;font-weight:600;color:var(--text-secondary)}.tabs span.on{color:var(--text-primary);border-bottom:2px solid var(--zenit-zielen)}
    '''
    body = f'''
<h1>Ustawienia</h1>
<div class="tabs"><span>Organizacja</span><span>Personel</span><span>System</span><span class="on">O Crux</span></div>
<div class="about">
 <div class="card">
  <img src="../marka/logo/crux-poziomy-zielen.svg" alt="crux · zenit.stomatologia" style="height:44px;width:auto;align-self:flex-start">
  <div class="ver num">1.0.0<small>wydanie „Krasnodrzew”</small></div>
  <dl><dt>Wdrożone</dt><dd class="num">11 grudnia 2026 · gabinety 01 Nowodworska, 02 Białowieska</dd>
      <dt>Zakres wydania</dt><dd>obłożenie godzinowe foteli, role i dostępy, pulpity sieci, gabinetu i moje, administracja</dd>
      <dt>Dane pacjentów</dt><dd>brak w tym wydaniu (od 1.1 „Ratania”)</dd>
      <dt>Baza</dt><dd>PostgreSQL 17, Supabase eu-central-1 (Frankfurt), kopie nocne, PITR</dd>
      <dt>Ostatnie odświeżenie analityki</dt><dd class="num">dziś 10:40 · pełne 02:10</dd>
      <dt>Dokumenty</dt><dd>Podręcznik 1.0 · Changelog · Definicje metryk · Procedury</dd></dl>
  <div style="display:flex;gap:8px;margin-top:6px"><span class="btn secondary">Zgłoś problem</span><span class="btn secondary">Changelog</span><span class="btn ghost">Licencje bibliotek</span></div>
 </div>
 <div class="plant"><img src="../marka/ryciny/krasnodrzew-mech.svg" alt="Krasnodrzew pospolity"><p><strong>Krasnodrzew pospolity</strong> · <em>Erythroxylum coca</em><br>Z jego liści wzięło się pierwsze znieczulenie miejscowe w stomatologii (1884). Roślina przewodnia wydania 1.0.<br>F. E. Köhler, Medizinal-Pflanzen (1887)</p></div>
</div>'''
    return shell("Ustawienia · O Crux", "ustawienia", body, side_loc=("01+02", "cała sieć"), user=("MK", "Miłosz Krysiak", "zarząd · sieć"), extra_css=css)

# ---------------------------------------------------------------- personel (administracja)
def personel():
    css = '''
    .tabs{display:flex;gap:18px;border-bottom:1px solid var(--border)}.tabs span{padding:10px 2px;font-weight:600;color:var(--text-secondary)}.tabs span.on{color:var(--text-primary);border-bottom:2px solid var(--zenit-zielen)}
    .toolbar{display:flex;gap:10px;align-items:center}
    .role{font-size:12px;font-weight:600;color:var(--text-secondary)}
    '''
    rows = [("Miłosz Krysiak", "—", "01, 02 · zarząd", "aktywny · MFA", "dobrze"), ("Bartosz Łyskawa", "—", "01, 02 · zarząd", "aktywny · MFA", "dobrze"),
            ("Kasia Nowak", "—", "01 · recepcja", "aktywny · MFA", "dobrze"), ("Joanna Lis", "—", "02 · recepcja", "zaproszona", "uwaga"),
            ("lek. dent. Anna Wrona", "1234567", "01 · lekarz dentysta", "aktywny · MFA", "dobrze"), ("hig. Katarzyna Sowa", "—", "01 · higienistka", "aktywny · MFA", "dobrze"),
            ("lek. dent. Piotr Kos", "7654321", "01, 02 · lekarz dentysta", "aktywny · MFA", "dobrze"), ("lek. dent. Jan Dąb", "2345678", "02 · lekarz dentysta", "brak konta", "uwaga"),
            ("Ewa Mróz", "—", "02 · kierownik gabinetu", "aktywny · MFA", "dobrze")]
    trs = "".join(f'<tr><td><strong>{n}</strong></td><td class="num muted">{npwz}</td><td class="role">{r}</td><td><span class="pill {c}">{s}</span></td><td class="r"><span class="btn ghost" style="height:28px">Edytuj</span></td></tr>' for n, npwz, r, s, c in rows)
    body = f'''
<h1>Ustawienia</h1>
<div class="tabs"><span>Organizacja</span><span class="on">Personel</span><span>System</span><span>O Crux</span></div>
<div class="toolbar"><span class="seg"><span class="on">Wszyscy</span><span>01 Nowodworska</span><span>02 Białowieska</span></span><span class="btn secondary">Filtr roli ▾</span><span class="btn primary" style="margin-left:auto">Zaproś osobę</span></div>
<div class="card" style="padding:8px 16px"><table class="t"><thead><tr><th>Osoba</th><th>NPWZ</th><th>Członkostwa · role</th><th>Konto</th><th class="r"></th></tr></thead><tbody>{trs}</tbody></table></div>
<p class="muted" style="font-size:12px">Hasło jednorazowe pokazuje się raz przy zaproszeniu i jest przekazywane osobiście. Dezaktywacja kończy członkostwa i zachowuje historię. Dane testowe: nazwiska syntetyczne.</p>'''
    return shell("Ustawienia · Personel", "ustawienia", body, side_loc=("01+02", "cała sieć"), user=("MK", "Miłosz Krysiak", "zarząd · sieć"), extra_css=css)

if __name__ == "__main__":
    (HERE / "logowanie.html").write_text(logowanie(), encoding="utf-8")
    (HERE / "oblozenie.html").write_text(oblozenie(), encoding="utf-8")
    (HERE / "pulpit.html").write_text(pulpit(), encoding="utf-8")
    (HERE / "o-crux.html").write_text(o_crux(), encoding="utf-8")
    (HERE / "personel.html").write_text(personel(), encoding="utf-8")
    print("ok: logowanie, oblozenie, pulpit, o-crux, personel")
