#!/usr/bin/env python3
"""Buduje podręcznik Crux 1.0 z rozdziałów, promptów, rysunków i makiet.

Wejście:  rozdzialy/*.md (ręcznie), ../prompts/F0-fundament.md (prompty), rysunki/*.mmd (+ .svg, jeśli mmdc je wyrenderował),
          ../manifest/makiety/*.png (makiety), ../manifest/zrodla/marka/ (font, logo, tokeny).
Wyjście:  PODRECZNIK-CRUX-1.0.md, PODRECZNIK-CRUX-1.0.html (zawsze), PODRECZNIK-CRUX-1.0.pdf (gdy jest Playwright z Chromium).

Użycie:   python3 podrecznik/build.py            # z katalogu crux
          python3 podrecznik/build.py --no-pdf   # tylko .md i .html
Wymaga:   python3 z pakietem `markdown` (pip install markdown); opcjonalnie `mmdc` (npm i -g @mermaid-js/mermaid-cli)
          do rysunków SVG i `playwright` (node) do PDF.
"""
from __future__ import annotations
import base64, re, subprocess, sys, shutil, html as htmlmod
from pathlib import Path

HERE = Path(__file__).resolve().parent
CRUX = HERE.parent
ROZDZIALY = HERE / "rozdzialy"
RYSUNKI = HERE / "rysunki"
MAKIETY = CRUX / "manifest" / "makiety"
MARKA = CRUX / "manifest" / "zrodla" / "marka"
OUT_MD = HERE / "PODRECZNIK-CRUX-1.0.md"
OUT_HTML = HERE / "PODRECZNIK-CRUX-1.0.html"
OUT_PDF = HERE / "PODRECZNIK-CRUX-1.0.pdf"
PROMPTS = {"F0": CRUX / "prompts" / "F0-fundament.md"}

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def extract_prompts(path: Path) -> str:
    s = read(path)
    start = s.index("### K01")
    end = s.index("### Po 1.0") if "### Po 1.0" in s else len(s)
    body = s[start:end].rstrip()
    body = re.sub(r"^### (K\d\d ·)", r"## \1", body, flags=re.M)   # prompt = sekcja rozdziału
    return body

def render_mermaid_svgs() -> None:
    mmdc = shutil.which("mmdc")
    if not mmdc:
        print("mmdc nie znaleziony: rysunki zostają jako bloki mermaid (bez SVG)")
        return
    cfg = RYSUNKI / "mermaid-config.json"
    for mmd in sorted(RYSUNKI.glob("*.mmd")):
        svg = mmd.with_suffix(".svg")
        if svg.exists() and svg.stat().st_mtime >= mmd.stat().st_mtime:
            continue
        r = subprocess.run([mmdc, "-i", str(mmd), "-o", str(svg), "-c", str(cfg), "-b", "transparent", "-w", "1400"], capture_output=True, text=True)
        print("rysunek", mmd.stem, "ok" if r.returncode == 0 else "BŁĄD: " + r.stderr[:200])

def placeholder_md(kind: str, name: str) -> str:
    if kind == "rysunek":
        src = read(RYSUNKI / f"{name}.mmd").strip()
        return f"```mermaid\n{src}\n```\n\n*Rysunek: {PODPISY.get(name, name)} (`podrecznik/rysunki/{name}.mmd`, SVG obok).*"
    if kind == "makieta":
        return f"![{MAKIETY_PODPISY.get(name, name)}](../manifest/makiety/{name}.png)\n\n*Makieta: {MAKIETY_PODPISY.get(name, name)} (`manifest/makiety/{name}.png`).*"
    if kind == "prompty":
        return extract_prompts(PROMPTS[name])
    raise KeyError(kind)

def placeholder_html(kind: str, name: str) -> str:
    if kind == "rysunek":
        svg = RYSUNKI / f"{name}.svg"
        if svg.exists():
            body = read(svg)
            body = re.sub(r"<\?xml[^>]*\?>", "", body).strip()
            return f'<figure class="rys">{body}<figcaption>Rysunek: {PODPISY.get(name, name)}</figcaption></figure>'
        return f'<pre class="mermaid">{htmlmod.escape(read(RYSUNKI / f"{name}.mmd"))}</pre>'
    if kind == "makieta":
        png = MAKIETY / f"{name}.png"
        if not png.exists():
            return f'<p class="brak">[brak makiety {name}: uruchom manifest/zrodla/render.js makiety]</p>'
        b64 = base64.b64encode(png.read_bytes()).decode()
        return f'<figure class="makieta"><img src="data:image/png;base64,{b64}" alt="Makieta ekranu {name}"><figcaption>Makieta: {MAKIETY_PODPISY.get(name, name)}</figcaption></figure>'
    if kind == "prompty":
        return None  # markdown; obsługiwane przed konwersją
    raise KeyError(kind)

PODPISY = {
    "kontekst": "Kontekst systemu w wydaniu 1.0: kto i co rozmawia z Crux",
    "kontenery": "Kontenery i środowiska: aplikacja, worker, baza, usługi",
    "moduly": "Moduły 1.0 i dozwolone kierunki zależności",
    "przeplyw-komendy": "Przepływ jednej komendy: od kliknięcia do zdarzenia w outboxie",
    "rls": "Jak system wie, kto pyta: od logowania do polityki RLS",
    "er-1-0": "Mapa encji wydania 1.0",
    "analityka": "Droga liczby: od komórki w siatce do kafla na pulpicie",
    "oblozenie-stany": "Stany wpisu obłożenia i dnia w gabinecie",
    "harmonogram": "Harmonogram wydania 1.0: K01–K17 w tygodniach",
    "cykl-funkcji": "Cykl funkcji: od bólu w gabinecie do wydania",
}
MAKIETY_PODPISY = {
    "oblozenie": "Ekran Obłożenie: siatka dnia gabinetu 01 (dane przykładowe)",
    "pulpit": "Pulpit sieci: obłożenie i przychód per gabinet (dane przykładowe)",
    "logowanie": "Logowanie z MFA",
    "personel": "Ustawienia → Personel: członkostwa i role (dane przykładowe)",
    "o-crux": "Strona „O Crux”: wydanie, rycina, changelog",
}

PLACEHOLDER = re.compile(r"\{\{(rysunek|makieta|prompty):([a-z0-9\-]+)\}\}", re.I)

def assemble(for_html: bool) -> str:
    parts = []
    for f in sorted(ROZDZIALY.glob("*.md")):
        s = read(f).rstrip() + "\n"
        def rep(m):
            kind, name = m.group(1).lower(), m.group(2)
            if kind == "prompty":
                return extract_prompts(PROMPTS[name.upper()])
            if for_html:
                h = placeholder_html(kind, name)
                return f"\n\n<!--RAW-->{h}<!--/RAW-->\n\n"
            return placeholder_md(kind, name)
        s = PLACEHOLDER.sub(rep, s)
        parts.append(s)
    return "\n\n".join(parts)

def _strip_code(md: str) -> str:
    return re.sub(r"```.*?```", "", md, flags=re.S)

def toc(md: str, html: bool = False) -> str:
    chapters = []  # [title, [sections]]
    for m in re.finditer(r"^(#{1,2}) (.+)$", _strip_code(md), flags=re.M):
        level, title = len(m.group(1)), m.group(2).strip()
        if title.startswith("Podręcznik Crux") or title == "Spis treści":
            continue
        if level == 1:
            chapters.append([title, []])
        elif chapters and not re.match(r"K\d\d ·", title):
            chapters[-1][1].append(title)
    if html:
        rows = []
        for t, secs in chapters:
            num, _, name = t.partition(" · ")
            if not name:
                num, name = "", t
            rows.append(f'<tr><td class="nr">{htmlmod.escape(num)}</td><td><b>{htmlmod.escape(name)}</b><br><span class="sekcje">{htmlmod.escape(" · ".join(secs))}</span></td></tr>')
        return '<table class="spis">' + "".join(rows) + "</table>"
    lines = []
    for t, secs in chapters:
        lines.append(f"- **{t}**")
        if secs:
            lines.append("    - " + " · ".join(secs))
    return "\n".join(lines)

KROK = re.compile(r"(?:^|(?<=[.;:)\]`]) )(\d{1,2})\. (?=[A-ZŁŚŻŹĆŃÓĘĄ`*„(/])")

def kroki_na_liste(md: str) -> str:
    """W podręczniku HTML/PDF akapit **Kroki.** z numeracją w tekście staje się listą numerowaną (źródło w prompts/ zostaje bez zmian)."""
    out = []
    for para in md.split("\n\n"):
        if para.startswith("**Kroki.**") and "\n" not in para.strip():
            body = para[len("**Kroki.**"):].strip()
            pieces = KROK.split(body)
            # pieces: [pre, n, text, n, text, ...]
            if len(pieces) >= 3 and pieces[0].strip() == "":
                items = [pieces[i + 1].strip() for i in range(1, len(pieces) - 1, 2)]
                para = "**Kroki.**\n\n" + "\n".join(f"{i + 1}. {t}" for i, t in enumerate(items))
        out.append(para)
    return "\n\n".join(out)

def build_md() -> str:
    md = assemble(for_html=False)
    spis = toc(md)
    md = md.replace("## Jak czytać", "## Spis treści\n\n" + spis + "\n\n## Jak czytać", 1)
    OUT_MD.write_text(md, encoding="utf-8")
    print("md:", OUT_MD.name, f"{len(md)//1000} kB")
    return md

def build_html(md_for_html: str) -> None:
    try:
        import markdown  # type: ignore
    except ImportError:
        print("brak pakietu markdown (pip install markdown): pomijam HTML i PDF")
        return
    raws = []
    def stash(m):
        raws.append(m.group(1))
        return f"\n\nRAWBLOCK{len(raws)-1}\n\n"
    md_text = re.sub(r"<!--RAW-->(.*?)<!--/RAW-->", stash, md_for_html, flags=re.S)
    spis = toc(md_text, html=True)
    md_text = md_text.replace("## Jak czytać", "## Spis treści\n\nSPISTRESCI\n\n## Jak czytać", 1)
    md_text = kroki_na_liste(md_text)
    body = markdown.markdown(md_text, extensions=["tables", "fenced_code", "sane_lists"])
    body = re.sub(r"(?:<p>)?RAWBLOCK(\d+)(?:</p>)?", lambda m: raws[int(m.group(1))], body)
    body = body.replace("<p>SPISTRESCI</p>", spis)
    # strony: każdy h1 zaczyna nową stronę w druku
    body = body.replace("<h1>", '<h1 class="rozdzial">')
    fonts = {}
    for w, f in (("400", "HankenGrotesk-Regular.ttf"), ("600", "HankenGrotesk-SemiBold.ttf"), ("800", "HankenGrotesk-ExtraBold.ttf")):
        p = MARKA / "fonts" / f
        if p.exists():
            fonts[w] = base64.b64encode(p.read_bytes()).decode()
    font_css = "".join(f'@font-face{{font-family:"Hanken Grotesk";font-weight:{w};src:url(data:font/ttf;base64,{b}) format("truetype")}}' for w, b in fonts.items())
    logo = (MARKA / "logo" / "crux-poziomy-krem.svg")
    logo_b64 = base64.b64encode(logo.read_bytes()).decode() if logo.exists() else ""
    koka = (MARKA / "ryciny" / "krasnodrzew-mech.svg")
    koka_b64 = base64.b64encode(koka.read_bytes()).decode() if koka.exists() else ""
    css = f"""
{font_css}
:root{{--butelka:#173A2A;--zielen:#2F5A33;--krem:#EFE4C6;--kosc:#F7F3E8;--bursztyn:#E9A53A;--szron:#E4ECE5;--mgla:#CFDBD1;--porost:#AFC2B3;--patyna:#87A08F;--mech:#5E7F6A;--las:#4A6E52;--muted:#6B7F70;--grid:#E2E6DE}}
*{{box-sizing:border-box}}
html{{font-size:15px}}
body{{margin:0;background:#fff;color:var(--butelka);font-family:"Hanken Grotesk",Arial,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}}
.okladka{{background:var(--butelka);color:var(--krem);padding:72px 64px;min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;page-break-after:always}}
.okladka img.logo{{height:120px;width:auto}}
.okladka .rycina{{position:absolute;right:-80px;top:40px;height:92vh;opacity:.18}}
.okladka h1{{font-size:54px;line-height:1.05;letter-spacing:-.03em;margin:0 0 16px;max-width:760px;color:var(--krem)}}
.okladka p{{font-size:19px;max-width:700px;color:var(--porost)}}
.okladka .meta{{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--porost)}}
main{{max-width:900px;margin:0 auto;padding:40px 48px 80px}}
h1{{font-size:34px;line-height:1.15;letter-spacing:-.03em;margin:56px 0 18px;font-weight:800}}
h1.rozdzial{{page-break-before:always;break-before:page;padding-top:8px;border-top:4px solid var(--zielen)}}
h2{{font-size:23px;line-height:1.2;letter-spacing:-.02em;margin:40px 0 12px;font-weight:800}}
h3{{font-size:17px;margin:26px 0 8px;font-weight:800}}
p{{margin:0 0 12px}}
a{{color:var(--zielen)}}
code{{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:.88em;background:var(--szron);padding:1px 5px;border-radius:6px;color:var(--butelka)}}
pre{{background:#F1ECDD;border:1px solid var(--mgla);border-radius:14px;padding:14px 16px;overflow:auto;font-size:12.5px;line-height:1.45;page-break-inside:avoid}}
pre code{{background:none;padding:0;font-size:inherit}}
pre.mermaid{{white-space:pre-wrap}}
table{{border-collapse:collapse;width:100%;margin:12px 0 18px;font-size:13px;line-height:1.4;page-break-inside:auto}}
th{{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--las);padding:8px 10px;border-bottom:1px solid var(--mgla);vertical-align:bottom}}
td{{padding:7px 10px;border-bottom:1px solid var(--grid);vertical-align:top}}
tr{{page-break-inside:avoid}}
ul,ol{{padding-left:22px;margin:0 0 12px}}
li{{margin:3px 0}}
blockquote{{border-left:3px solid var(--mgla);margin:12px 0;padding:4px 16px;color:var(--las)}}
hr{{border:0;border-top:1px solid var(--mgla);margin:28px 0}}
figure{{margin:18px 0 22px;page-break-inside:avoid}}
figure.rys svg{{max-width:100%;height:auto;display:block;background:var(--kosc);border:1px solid var(--mgla);border-radius:14px;padding:12px}}
figure.makieta img{{width:100%;display:block;border:1px solid var(--mgla);border-radius:14px}}
figcaption{{font-size:12px;color:var(--muted);margin-top:6px}}
strong{{font-weight:800}}
table.spis td.nr{{width:48px;font-weight:800;color:var(--zielen);font-size:15px}}
table.spis .sekcje{{color:var(--muted);font-size:12px;line-height:1.45}}
ol li{{margin:4px 0}}
.brak{{color:#8F2F22;font-weight:600}}
@media print{{ html{{font-size:12.5px}} main{{max-width:none;padding:0}} h1{{font-size:28px}} h2{{font-size:19px}} pre{{font-size:10.5px}} table{{font-size:11px}} .okladka{{min-height:auto;height:257mm}} .okladka .rycina{{height:240mm}} }}
"""
    cover = f'''<section class="okladka"><img class="rycina" src="data:image/svg+xml;base64,{koka_b64}" alt="">
<img class="logo" src="data:image/svg+xml;base64,{logo_b64}" alt="crux · zenit.stomatologia">
<div><p class="meta">Podręcznik · wydanie 1.0 „Krasnodrzew” · 6 listopada 2026</p><h1>Crux: architektura, dane, dostępy, ekrany, plan i prompty wydania 1.0</h1><p>Wszystko, co trzeba wiedzieć, żeby zbudować i wdrożyć pierwsze wydanie Crux w gabinetach 01 Nowodworska i 02 Białowieska. Bez domyślania się.</p></div>
<p class="meta">zenit.stomatologia · dokument wewnętrzny · generowany z folderu crux</p></section>'''
    html_doc = f'<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Podręcznik Crux 1.0 „Krasnodrzew”</title><style>{css}</style></head><body>{cover}<main>{body}</main></body></html>'
    OUT_HTML.write_text(html_doc, encoding="utf-8")
    print("html:", OUT_HTML.name, f"{len(html_doc)//1000} kB")

def build_pdf() -> None:
    node = shutil.which("node")
    if not node:
        print("brak node: pomijam PDF"); return
    script = HERE / "_pdf.js"
    script.write_text(f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://{OUT_HTML.as_posix()}', {{ waitUntil: 'networkidle' }});
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({{ path: '{OUT_PDF.as_posix()}', format: 'A4', printBackground: true,
    margin: {{ top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' }}, displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#6B7F70;padding:0 16mm;display:flex;justify-content:space-between"><span>crux · zenit.stomatologia · podręcznik wydania 1.0 „Krasnodrzew”</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' }});
  await b.close();
}})().catch(e => {{ console.error(e.message); process.exit(1); }});
""", encoding="utf-8")
    r = subprocess.run([node, str(script)], capture_output=True, text=True, cwd=str(HERE))
    if r.returncode == 0:
        print("pdf:", OUT_PDF.name, f"{OUT_PDF.stat().st_size//1000} kB")
    else:
        print("PDF pominięty (Playwright/Chromium niedostępne):", r.stderr.strip()[:200])
    script.unlink(missing_ok=True)

if __name__ == "__main__":
    render_mermaid_svgs()
    build_md()
    build_html(assemble(for_html=True))
    if "--no-pdf" not in sys.argv:
        build_pdf()
