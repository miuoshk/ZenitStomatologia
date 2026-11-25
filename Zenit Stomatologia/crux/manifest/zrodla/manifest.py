#!/usr/bin/env python3
"""Generuje manifest.html (plansze A4 poziome) manifestu Crux 1.0 „Krasnodrzew”.
Uruchom: python3 manifest.py && node render.js manifest
"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent / "makiety"))
from generuj import arch_gauge  # noqa: E402

HERE = Path(__file__).parent
PAGES = []

def page(id_, body, theme="kosc", label="crux · manifest systemu · wydanie 1.0 „Krasnodrzew”", number=True, css_class=""):
    PAGES.append((id_, body, theme, label, number, css_class))

CSS = r'''
@import url("marka/tokens.css");
@font-face{font-family:"Hanken Grotesk";src:url("marka/fonts/HankenGrotesk-Regular.ttf") format("truetype");font-weight:400}
@font-face{font-family:"Hanken Grotesk";src:url("marka/fonts/HankenGrotesk-SemiBold.ttf") format("truetype");font-weight:600}
@font-face{font-family:"Hanken Grotesk";src:url("marka/fonts/HankenGrotesk-ExtraBold.ttf") format("truetype");font-weight:800}
@page{size:297mm 210mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#555;font-family:var(--font-sans);color:var(--text-primary);-webkit-font-smoothing:antialiased}
@media screen{body{display:flex;flex-direction:column;gap:24px;padding:24px;align-items:center}}
@media print{html,body{background:#fff}}
section.plansza{width:1123px;height:794px;position:relative;overflow:hidden;background:var(--zenit-kosc);padding:56px 64px 64px;page-break-after:always;break-after:page;display:flex;flex-direction:column;gap:20px}
section.plansza.butelka{background:var(--zenit-butelka);color:var(--zenit-krem)}
section.plansza.butelka .label,section.plansza.butelka .foot,section.plansza.butelka .sec{color:var(--zenit-porost)}
.hdr{display:flex;justify-content:space-between;align-items:center}
.label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--text-secondary)}
.foot{position:absolute;left:64px;right:64px;bottom:28px;display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);font-weight:600}
.num{font-variant-numeric:tabular-nums}
h1{font-size:44px;line-height:48px;font-weight:800;letter-spacing:-.03em;max-width:900px}
h2{font-size:30px;line-height:34px;font-weight:800;letter-spacing:-.025em}
h3{font-size:16px;line-height:22px;font-weight:800}
p{font-size:14px;line-height:21px}
p.lead{font-size:18px;line-height:27px;max-width:760px}
.sec{color:var(--text-secondary)}
.grid{display:grid;gap:16px}
.card{background:#fff;border:1px solid var(--border);border-radius:22px;padding:20px 22px;display:flex;flex-direction:column;gap:8px}
.card.dark{background:rgba(239,228,198,.06);border-color:rgba(239,228,198,.18);color:var(--zenit-krem)}
.card.sunken{background:var(--surface-sunken);border-color:transparent}
.card .k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--text-secondary)}
.card.dark .k{color:var(--zenit-porost)}
ul.pl{list-style:none;display:flex;flex-direction:column;gap:6px}
ul.pl li{padding-left:16px;position:relative;font-size:13px;line-height:19px}
ul.pl li::before{content:"";position:absolute;left:0;top:7px;width:7px;height:7px;border-radius:999px;background:var(--zenit-zielen)}
.butelka ul.pl li::before{background:var(--zenit-krem)}
.pill{display:inline-flex;align-items:center;height:22px;padding:0 10px;border-radius:999px;font-size:11px;font-weight:700;background:var(--zenit-szron);color:var(--zenit-zielen)}
.butelka .pill{background:rgba(239,228,198,.12);color:var(--zenit-krem)}
.locchip b{font-weight:800;color:var(--zenit-zielen);text-shadow:.05em .05em 0 var(--zenit-bursztyn)}
.shot{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 6px 18px rgba(23,58,42,.12)}
.shot img{display:block;width:100%}
.callout{display:flex;gap:10px;align-items:flex-start}
.callout .n{flex:none;width:24px;height:24px;border-radius:999px;background:var(--zenit-zielen);color:var(--zenit-krem);font-weight:800;font-size:12px;display:grid;place-items:center}
.callout p{font-size:13px;line-height:19px}
table.t{width:100%;border-collapse:collapse;font-size:13.5px;line-height:19px}
table.t th{text-align:left;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-secondary);padding:8px 10px;border-bottom:1px solid var(--border)}
table.t td{padding:8px 10px;border-bottom:1px solid var(--grid);vertical-align:top}
table.t td:first-child{font-weight:700;white-space:nowrap}
.arch{display:flex;flex-direction:column;align-items:center;gap:6px}.arch figcaption{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:12px}
.arch-val{position:absolute;left:0;right:0;text-align:center;font-size:22px;font-weight:800;letter-spacing:-.02em}
.timeline{position:relative;display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-top:8px}
.timeline::before{content:"";position:absolute;left:0;right:0;top:9px;height:2px;background:var(--zenit-mgla)}
.tl{position:relative;padding-top:24px;display:flex;flex-direction:column;gap:4px}
.tl::before{content:"";position:absolute;left:0;top:3px;width:14px;height:14px;border-radius:999px;background:var(--zenit-zielen);border:3px solid var(--zenit-kosc)}
.tl.now::before{background:var(--zenit-bursztyn)}
.tl.later::before{background:var(--zenit-porost)}
.tl b{font-size:15px;font-weight:800;letter-spacing:-.02em}
.tl small{font-size:11px;color:var(--text-secondary);font-weight:600}
.tl p{font-size:11.5px;line-height:16px}
.plants{display:flex;gap:14px}
.plant{flex:1;background:#fff;border:1px solid var(--border);border-radius:16px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.plant img{height:84px}
.plant b{font-size:12px}.plant small{font-size:10px;color:var(--text-secondary);line-height:13px}
.cycle{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.cycle .st{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px 16px;position:relative;display:flex;flex-direction:column;gap:6px}
.cycle .st .n{font-size:28px;font-weight:800;color:var(--zenit-patyna);line-height:1;letter-spacing:-.03em}
.cycle .st p{font-size:12.5px;line-height:18px}
.chain{display:flex;align-items:stretch;gap:6px;margin-top:8px}
.chain .ch{flex:1;background:#fff;border:1px solid var(--border);border-radius:14px;padding:10px 12px;font-size:12px;line-height:16px;font-weight:600;display:flex;align-items:center}
.chain .ch.dark{background:var(--zenit-butelka);color:var(--zenit-krem);border-color:transparent}
.chain .ar{align-self:center;color:var(--zenit-patyna);font-weight:800}
.big{font-size:72px;line-height:1;font-weight:800;letter-spacing:-.04em}
.hero-logo{height:150px;width:auto}
'''

def header(label):
    return f'<div class="hdr"><span class="label">{label}</span></div>'

# ------------------------------------------------------------------ 1 okładka
page("okladka", '''
<div style="position:absolute;right:-80px;top:-40px;height:900px;opacity:.22"><img src="marka/ryciny/krasnodrzew-krem.svg" style="height:900px"></div>
<img class="hero-logo" src="marka/logo/crux-poziomy-krem.svg" alt="crux · zenit.stomatologia">
<div style="flex:1"></div>
<div style="display:flex;flex-direction:column;gap:14px;max-width:760px">
 <span class="label">Manifest systemu · wydanie 1.0 „Krasnodrzew” · listopad 2026</span>
 <h1 style="font-size:60px;line-height:62px;color:var(--zenit-krem);max-width:720px">Jeden system dla całej sieci. Budowany po kolei, bez skoków.</h1>
 <p class="lead" style="color:var(--zenit-porost)">Dla zespołu gabinetów 01 Nowodworska i 02 Białowieska oraz wspólników: co budujemy, jak to wygląda, co kto dostanie i kiedy.</p>
</div>''', theme="butelka", label="", number=False)

# ------------------------------------------------------------------ 2 jak czytać
page("spis", header("Jak czytać ten manifest") + '''
<h2>Trzy pytania, pięć minut</h2>
<div class="grid" style="grid-template-columns:repeat(3,1fr);margin-top:8px">
 <div class="card"><span class="k">Dlaczego</span><h3>Po co w ogóle własny system</h3><ul class="pl"><li>Czym jest Crux i czym nie jest</li><li>Dwie marki: zenit dla pacjenta, Crux dla personelu</li><li>Znak, kolory i roślina wydania</li></ul><p class="sec">plansze 3–6</p></div>
 <div class="card"><span class="k">Co</span><h3>Co dostajemy w wydaniu 1.0</h3><ul class="pl"><li>Co widzi recepcja, lekarz, kierownik, zarząd</li><li>Ekrany: logowanie, obłożenie foteli, pulpit sieci</li><li>Model kuleczkowy, czyli nasz język wykresów</li></ul><p class="sec">plansze 7–11</p></div>
 <div class="card"><span class="k">Jak rośnie</span><h3>Co dalej i na czym to stoi</h3><ul class="pl"><li>Mapa wydań 1.0 → 5.0 z bramkami</li><li>Czego kto może się spodziewać i kiedy</li><li>Bezpieczeństwo, prawo, sposób dokładania funkcji</li></ul><p class="sec">plansze 12–16</p></div>
</div>
<div class="card sunken" style="margin-top:4px"><p><strong>Jedno zdanie, które trzeba zapamiętać:</strong> Crux wchodzi do gabinetów wydaniami, od najmniejszego ryzyka do największego. Wydanie 1.0 mierzy pracę foteli i nie zawiera żadnych danych pacjentów. Pacjenci, terminarz, pieniądze i dokumentacja dochodzą w kolejnych wydaniach, każde po spełnieniu bramki mierzonej w gabinecie.</p></div>
<p class="sec" style="font-size:12px">Pełna dokumentacja: folder <code>crux</code> (docs 00–14, specyfikacje, prompty). Podręcznik wydania 1.0: <code>crux/podrecznik</code>. Księga znaku Crux 1.0 i brandbook zenit 1.0: <code>Materialy marki/brandbook</code>.</p>
''')

# ------------------------------------------------------------------ 3 czym jest
page("czym-jest", header("Dlaczego · czym jest Crux") + '''
<h2>Crux łączy trzy miejsca, w których dziś żyją dane gabinetu: program, Excel i głowę kierownika</h2>
<div class="grid" style="grid-template-columns:1.2fr 1fr;align-items:start">
 <div style="display:flex;flex-direction:column;gap:12px">
  <p class="lead">Przy jednym gabinecie to działa. Przy dwóch przestaje: właściciel nie widzi sieci, gabinety nie widzą siebie nawzajem, a liczby pojawiają się w KPiR miesiąc po fakcie. Crux to wewnętrzny system sieci zenit.stomatologia: nasze własne narzędzie, budowane pod nasze gabinety.</p>
  <div class="grid" style="grid-template-columns:repeat(3,1fr)">
   <div class="card"><span class="k">Spokój</span><p>System nie krzyczy. Pokazuje to, co trzeba zrobić dziś. Bez czerwonych liczników „dla zasady”.</p></div>
   <div class="card"><span class="k">Precyzja</span><p>Każda liczba ma definicję i prowadzi do rekordów, z których powstała. Najpierw mierzymy, potem działamy.</p></div>
   <div class="card"><span class="k">Ciągłość</span><p>Jeden standard w każdym gabinecie. Gabinet różni się tylko numerem i adresem.</p></div>
  </div>
 </div>
 <div class="card" style="background:var(--zenit-butelka);color:var(--zenit-krem);border-color:transparent"><span class="k" style="color:var(--zenit-porost)">Czym Crux nie jest</span>
  <ul class="pl"><li>Nie jest programem na sprzedaż: nie budujemy cennika ani marketingu produktu.</li><li>Nie diagnozuje i nie podpowiada leczenia. Zdjęcia RTG ogląda się w Romexis; Crux tylko je pokazuje.</li><li>Nie zastępuje księgowości: księga i KSeF zostają w Comarch Optima.</li><li>Nie obsługuje NFZ, dopóki gabinety nie mają kontraktu.</li><li>Nie wymaga „wielkiego przełączenia”: stary program gaśnie etapami.</li></ul></div>
</div>
<div style="margin-top:auto"><span class="label">Łańcuch, który Crux ma przerwać</span>
<div class="chain">
 <div class="ch">brak jednej bazy pacjentów sieci</div><span class="ar">→</span>
 <div class="ch">pacjent z 01 nie może łatwo umówić się w 02</div><span class="ar">→</span>
 <div class="ch">recepcja nie widzi wolnych foteli w innym gabinecie</div><span class="ar">→</span>
 <div class="ch">puste fotele i utracone wizyty</div><span class="ar">→</span>
 <div class="ch">plany leczenia bez terminu nikną z pola widzenia</div><span class="ar">→</span>
 <div class="ch dark">właściciel widzi to dopiero w KPiR, miesiąc później</div>
</div>
<p class="sec" style="font-size:12px;margin-top:8px">Wydanie 1.0 przerywa ten łańcuch od końca: właściciel widzi fotele tego samego dnia. Kolejne wydania przerywają go od początku (jedna kartoteka, terminarz sieci).</p></div>
''')

# ------------------------------------------------------------------ 4 dwie marki
page("dwie-marki", header("Dlaczego · dwie marki, jeden system") + '''
<h2>Pacjent widzi zenit.stomatologia. Personel widzi Crux. Nigdy odwrotnie.</h2>
<div class="grid" style="grid-template-columns:1fr 1fr;margin-top:8px">
 <div class="card" style="gap:14px"><img src="marka/logo/zenit-poziomy-zielen.svg" style="height:40px;width:auto;align-self:flex-start"><span class="k">Marka sieci gabinetów</span>
  <p>Łuk zenitu: 16 kuleczek jak zęby szczęki i bursztynowe słońce nad jedynkami. Strona, rezerwacja online, SMS, kosztorys PDF, wydruki, oznakowanie gabinetów.</p>
  <ul class="pl"><li>każdy SMS, PDF i ekran dla pacjenta nosi tę markę</li><li>ton: Pan/Pani, pełne zdania, cena wprost</li><li>numery gabinetów: <span class="locchip"><b>01</b> Nowodworska</span>, <span class="locchip"><b>02</b> Białowieska</span></li></ul></div>
 <div class="card" style="gap:14px;background:var(--zenit-butelka);color:var(--zenit-krem);border-color:transparent"><img src="marka/logo/crux-poziomy-krem.svg" style="height:40px;width:auto;align-self:flex-start"><span class="k" style="color:var(--zenit-porost)">Marka systemu wewnętrznego</span>
  <p>Krzyż Południa: pięć gwiazd jako kuleczki, Ginan w bursztynie. Pasek boczny aplikacji, ekran logowania, ikona na iPadzie, raporty dla zarządu.</p>
  <ul class="pl"><li>widzi go wyłącznie personel</li><li>ton: krótko, konkretnie, bezosobowo („Zapisano wizytę”)</li><li>te same kolory, krój i komponenty co marka sieci</li></ul></div>
</div>
<div class="card sunken"><p><strong>Zasada rozdziału jest pilnowana automatycznie:</strong> strażnik kodu (<code>crux-doctor</code>) nie przepuści pliku ze znakiem Crux w szablonach dokumentów dla pacjenta, SMS-ów ani rezerwacji online. ZENIT LABS to osobna marka i nie pojawia się w żadnym z tych miejsc.</p></div>
''')

# ------------------------------------------------------------------ 5 znak
page("znak", header("Dlaczego · znak Crux") + '''
<div class="grid" style="grid-template-columns:420px 1fr;align-items:center;flex:1">
 <div style="display:flex;justify-content:center"><img src="marka/logo/crux-znak-zielen.svg" style="height:360px"></div>
 <div style="display:flex;flex-direction:column;gap:16px">
  <h2>Pięć gwiazd tam, gdzie stoją na niebie</h2>
  <p class="lead">Crux to Krzyż Południa. Gwiazdy w znaku stoją w prawdziwych pozycjach, a wielkość kuleczki rośnie z jasnością gwiazdy: Acrux największa, potem Mimosa, Gacrux, Imai. Złota jest Ginan: najmniejsza i jedyna poza osiami krzyża, więc znak ma kierunek i nie myli się z plusem.</p>
  <div class="grid" style="grid-template-columns:repeat(2,1fr)">
   <div class="card"><span class="k">Jedna wersja</span><p>Ten sam znak od ikony 16 px po ekran logowania. Bez łańcuszków kropek i linii krzyża.</p></div>
   <div class="card"><span class="k">Jedyny bursztyn</span><p>Bursztyn na ekranie to tylko Ginan, kropka w „crux.”, wskaźnik „teraz” i obwódka fokusu. Nigdy tło, tekst ani wykres.</p></div>
   <div class="card"><span class="k">Zawsze z pliku</span><p>Logo zawsze z SVG lub z komponentu rysującego geometrię z pliku. Nic nie jest składane na oko.</p></div>
   <div class="card"><span class="k">Ten sam alfabet</span><p>Kuleczka znaku Crux to ta sama kuleczka co ząb w łuku zenitu i kropka na naszych wykresach.</p></div>
  </div>
 </div>
</div>
''')

# ------------------------------------------------------------------ 6 krasnodrzew
page("krasnodrzew", header("Dlaczego · roślina przewodnia wydania") + '''
<div class="grid" style="grid-template-columns:1.25fr 1fr;align-items:start">
 <div style="display:flex;flex-direction:column;gap:10px">
  <h2>Krasnodrzew pospolity otwiera cykl</h2>
  <p class="lead" style="font-size:15px;line-height:22px"><em>Erythroxylum coca.</em> Z jego liści wzięło się pierwsze znieczulenie miejscowe w stomatologii: w 1884 roku kokaina znieczuliła ząb, zanim ktokolwiek wymyślił nowokainę. Nasze pierwsze wydanie ma znieczulić pierwszy ból sieci: nie wiemy, jak naprawdę pracują fotele. Stąd nazwa.</p>
  <p style="font-size:12.5px;line-height:18px">Każde wydanie dostaje roślinę z zielnika marki (42 tablice z atlasu Köhlera, każda związana z leczeniem jamy ustnej; sześć roślin kolornika usług zostaje poza cyklem). Rycina pojawia się tylko w trzech miejscach: na stronie „O Crux” w aplikacji, w podręczniku i w changelogu. Interfejs roboczy zostaje czysty.</p>
 </div>
 <div style="display:flex;justify-content:center;align-items:flex-start"><img src="marka/ryciny/krasnodrzew-mech.svg" style="height:300px"></div>
</div>
<div class="plants" style="margin-top:6px">
 <div class="plant"><img src="marka/ryciny/krasnodrzew-mech.svg"><b>1.0 Krasnodrzew</b><small>obłożenie foteli, role, pulpity<br>grudzień 2026</small></div>
 <div class="plant"><img src="marka/ryciny/ratania-mech.svg"><b>1.1 Ratania</b><small>pacjenci, terminarz, SMS<br>kwiecień 2027</small></div>
 <div class="plant"><img src="marka/ryciny/pieciornik-mech.svg"><b>2.0 Pięciornik</b><small>plany leczenia, finanse<br>lipiec 2027</small></div>
 <div class="plant"><img src="marka/ryciny/cynamonowiec-mech.svg"><b>2.1 Cynamonowiec</b><small>CRM, pełne pulpity<br>wrzesień 2027</small></div>
 <div class="plant"><img src="marka/ryciny/dab-mech.svg"><b>3.0 Dąb</b><small>dokumentacja, Platforma P1<br>luty 2028</small></div>
 <div class="plant"><img src="marka/ryciny/gutaperkowiec-mech.svg"><b>4.0 Gutaperkowiec</b><small>obrazowanie RTG i skany<br>czerwiec 2028</small></div>
 <div class="plant"><img src="marka/ryciny/brzoza-mech.svg"><b>5.0 Brzoza</b><small>gabinety 03 i 04, EHDS<br>2029</small></div>
</div>
<p class="sec" style="font-size:11px">Ryciny: F. E. Köhler, Medizinal-Pflanzen (1887), domena publiczna; wektory z pakietu marki (zielnik 2.0, 42 tablice).</p>
''')

# ------------------------------------------------------------------ 7 co dostajemy
page("role", header("Co · wydanie 1.0 dla każdej roli") + '''
<h2>Co dostajemy 11 grudnia 2026, bez czekania na prawników</h2>
<p class="lead" style="font-size:15px;line-height:22px">Wydanie 1.0 nie zawiera danych pacjentów, więc nie wymaga opinii prawnej, DPIA ani umów powierzenia. Przetwarza tylko dane personelu: kto, kiedy i na którym fotelu pracował. To wystarczy, żeby po raz pierwszy zobaczyć sieć w liczbach.</p>
<div class="grid" style="grid-template-columns:repeat(4,1fr)">
 <div class="card"><span class="k">Recepcja</span><h3>Siatka godzin dnia</h3><ul class="pl"><li>wpisuje, jak pracowały fotele: kto, kategoria usługi, kwota (opcjonalnie)</li><li>z klawiatury, w ≤ 3 minuty; „dzień jak wczoraj”</li><li>na koniec dnia „Zamknij dzień”</li><li>stary program zostaje na pacjentów i terminarz</li></ul></div>
 <div class="card"><span class="k">Lekarz, higienistka</span><h3>Mój pulpit</h3><ul class="pl"><li>moje godziny i moja kwota na godzinę</li><li>porównanie do mediany gabinetu, bez nazwisk innych osób</li><li>może wpisać własne godziny, jeśli recepcja nie zdążyła</li></ul></div>
 <div class="card"><span class="k">Kierownik gabinetu</span><h3>Pulpit gabinetu</h3><ul class="pl"><li>obłożenie foteli, godziny, przychód na godzinę fotela</li><li>tabela wykonawców gabinetu</li><li>zamyka i otwiera dni, poprawia z powodem</li><li>widzi tylko swój gabinet</li></ul></div>
 <div class="card" style="background:var(--zenit-butelka);color:var(--zenit-krem);border-color:transparent"><span class="k" style="color:var(--zenit-porost)">Zarząd</span><h3>Pulpit sieci</h3><ul class="pl"><li>01 i 02 obok siebie na jednej definicji liczb</li><li>każda liczba prowadzi do wpisów, z których powstała</li><li>link z filtrami do wysłania wspólnikowi</li><li>zarządza gabinetami, fotelami, kontami i rolami bez programisty</li></ul></div>
</div>
<div class="card sunken"><p><strong>Czego nie ma w 1.0 i to jest celowe:</strong> pacjentów, wizyt, terminarza, SMS-ów, planów leczenia, płatności, dokumentacji. Każda z tych rzeczy ma swoje wydanie i swoją bramkę (plansza 12).</p></div>
''')

# ------------------------------------------------------------------ 8 logowanie
page("ekran-logowanie", header("Co · jak wygląda · logowanie") + '''
<div class="grid" style="grid-template-columns:1fr 300px;align-items:start;flex:1">
 <div class="shot"><img src="../makiety/logowanie.png"></div>
 <div style="display:flex;flex-direction:column;gap:14px">
  <h2 style="font-size:24px;line-height:28px">Konto imienne, kod z telefonu, blokada po 5 minutach</h2>
  <div class="callout"><span class="n">1</span><p><strong>Znak Crux</strong> na butelkowym tle i rycina szałwii: jedyne miejsce w aplikacji z rośliną obok logowania to puste stany.</p></div>
  <div class="callout"><span class="n">2</span><p><strong>MFA od pierwszego dnia.</strong> Hasło plus kod z aplikacji uwierzytelniającej. Brak kont współdzielonych; recepcja 01 i 02 ma osobne konta.</p></div>
  <div class="callout"><span class="n">3</span><p><strong>Blokada ekranu</strong> po 5 minutach bezczynności na stanowiskach wspólnych; odblokowanie bez utraty pracy.</p></div>
  <div class="callout"><span class="n">4</span><p><strong>Po zalogowaniu</strong> wybór gabinetu: 01, 02 albo cała sieć (tylko zarząd). Nawigacja pokazuje wyłącznie to, co jest w bieżącym wydaniu.</p></div>
 </div>
</div>
''')

# ------------------------------------------------------------------ 9 obłożenie
page("ekran-oblozenie", header("Co · jak wygląda · obłożenie foteli") + '''
<div class="grid" style="grid-template-columns:1fr 300px;align-items:start;flex:1">
 <div class="shot" style="height:600px;overflow:hidden"><img src="../makiety/oblozenie.png" style="object-fit:cover;object-position:top;height:600px"></div>
 <div style="display:flex;flex-direction:column;gap:14px">
  <h2 style="font-size:24px;line-height:28px">Jedna siatka: fotele w kolumnach, godziny w wierszach</h2>
  <div class="callout"><span class="n">1</span><p><strong>Komórka = godzina fotela.</strong> Inicjały wykonawcy, kategoria w kolorze kolornika Z1–Z+, kwota, jeśli wpisana. Blokada (serwis, zamknięcie) jest kreskowana i zmniejsza pojemność.</p></div>
  <div class="callout"><span class="n">2</span><p><strong>Klawiatura przed myszką:</strong> strzałki, Enter, klawisze 1–6 ustawiają kategorię, Shift zaznacza zakres, Backspace unieważnia z powodem.</p></div>
  <div class="callout"><span class="n">3</span><p><strong>Zamknij dzień.</strong> Recepcja potwierdza, że dzień jest kompletny. Potem zmiana wymaga kierownika i powodu. Pulpit pokazuje, które dni są niezamknięte.</p></div>
  <div class="callout"><span class="n">4</span><p><strong>Zero danych pacjenta.</strong> Notatka jest sprawdzana pod kątem numerów telefonu i PESEL; nazwisko pacjenta nie ma gdzie wylądować. Pacjenci dochodzą w 1.1.</p></div>
 </div>
</div>
''')

# ------------------------------------------------------------------ 10 pulpit
page("ekran-pulpit", header("Co · jak wygląda · pulpit sieci") + '''
<div class="grid" style="grid-template-columns:1fr 300px;align-items:start;flex:1">
 <div class="shot" style="height:600px;overflow:hidden"><img src="../makiety/pulpit.png" style="object-fit:cover;object-position:top;height:auto"></div>
 <div style="display:flex;flex-direction:column;gap:14px">
  <h2 style="font-size:24px;line-height:28px">Czytelny w 5 sekund, odpowiada w 30</h2>
  <div class="callout"><span class="n">1</span><p><strong>Jeden wiersz filtrów</strong> (okres, gabinet, wykonawca, kategoria) rządzi wszystkim pod spodem i zapisuje się w adresie strony: link odtwarza dokładnie ten widok.</p></div>
  <div class="callout"><span class="n">2</span><p><strong>Kafle z odniesieniem.</strong> Każda liczba ma porównanie (poprzedni okres, cel) i prowadzi do listy wpisów, z których powstała. Bez definicji w rejestrze liczba nie wchodzi na ekran.</p></div>
  <div class="callout"><span class="n">3</span><p><strong>Łuk obłożenia</strong> per gabinet: 16 zębów to 100%, jeden ząb to 6,25%. Porównanie gabinetów na wykresie kropkowym w stałych kolorach: 01 zieleń, 02 niebieski.</p></div>
  <div class="callout"><span class="n">4</span><p><strong>Jakość danych na wierzchu.</strong> Dni niezamknięte są wymienione z linkiem do siatki, a kafel przychodu mówi, jaki odsetek godzin ma wpisaną kwotę.</p></div>
 </div>
</div>
''')

# ------------------------------------------------------------------ 11 model kuleczkowy
page("kuleczki", header("Co · model kuleczkowy, nasz język wykresów") + '''
<h2>Gdy coś da się policzyć w kuleczkach, pokazujemy to kuleczkami</h2>
<div class="grid" style="grid-template-columns:repeat(3,1fr)">
 <div class="card" style="align-items:center;text-align:center">''' + arch_gauge(0.81, 150, label=("01", "Nowodworska"), sub="łuk obłożenia") + '''<p class="sec" style="font-size:12px">Jedna ważna wartość procentowa: obłożenie foteli, realizacja celu. 16 kuleczek w kształcie łuku znaku zenitu.</p></div>
 <div class="card" style="align-items:center;text-align:center"><img src="marka/wykresy/siatka-kuleczek.svg" style="width:100%;max-height:120px;object-fit:contain"><b style="font-size:13px">Siatka kuleczek</b><p class="sec" style="font-size:12px">„37 z 50 pacjentów wróciło na recall”: jedna kuleczka to jedna osoba. Zastępuje wykres kołowy, którego nie używamy.</p></div>
 <div class="card" style="align-items:center;text-align:center"><img src="marka/wykresy/wykres-kropkowy.svg" style="width:100%;max-height:120px;object-fit:contain"><b style="font-size:13px">Wykres kropkowy</b><p class="sec" style="font-size:12px">Porównanie gabinetów w kilku miarach: kropka to gabinet w swoim kolorze, linia łączy skrajne wartości, kreska to mediana sieci.</p></div>
</div>
<div class="grid" style="grid-template-columns:1fr 1fr 1fr">
 <div class="card"><img src="marka/wykresy/pasek-czesci.svg" style="width:100%"><b style="font-size:13px">Pasek części</b><p class="sec" style="font-size:12px">Struktura sumy, np. przychód wg kategorii Z1–Z+. Segmenty ze skali zieleni, odstęp 2 px.</p></div>
 <div class="card"><img src="marka/wykresy/wykres-liniowy.svg" style="width:100%;max-height:90px;object-fit:contain"><b style="font-size:13px">Linia z etykietą na końcu</b><p class="sec" style="font-size:12px">Zmiana w czasie, jedna linia na gabinet, linia celu przerywana. Jedna oś, legenda, tooltip, widok tabeli.</p></div>
 <div class="card" style="background:var(--zenit-butelka);color:var(--zenit-krem);border-color:transparent"><span class="k" style="color:var(--zenit-porost)">Czego nie ma</span><ul class="pl"><li>wykresów kołowych i pierścieniowych</li><li>dwóch osi Y, 3D, tęczowych skal</li><li>bursztynu w danych</li><li>liczb przy każdym punkcie</li></ul></div>
</div>
''')

# ------------------------------------------------------------------ 12 mapa wydań
page("wydania", header("Jak rośnie · mapa wydań") + '''
<h2>Od pomiaru do pełnego systemu: siedem wydań, siedem bramek</h2>
<p class="lead" style="font-size:15px;line-height:22px">Wydanie wchodzi do gabinetów dopiero, gdy poprzednie spełni bramkę mierzoną w gabinecie. Kod kolejnego wydania może powstawać równolegle. Daty to plan; bramki są binarne.</p>
<div class="timeline">
 <div class="tl now"><b>1.0 Krasnodrzew</b><small>11.12.2026</small><p>szkielet, role, obłożenie foteli, pulpity, administracja; bez pacjentów</p></div>
 <div class="tl"><b>1.1 Ratania</b><small>15.04.2027</small><p>kartoteka, terminarz sieci, SMS, lista oczekujących, import, rezerwacja online, laboratorium</p></div>
 <div class="tl"><b>2.0 Pięciornik</b><small>01.07.2027</small><p>katalog i cennik, plany leczenia z kosztorysem, płatności, rozliczenia wykonawców, Optima</p></div>
 <div class="tl"><b>2.1 Cynamonowiec</b><small>15.09.2027</small><p>pełne pulpity, recall, kampanie, odprawa, Koniec dnia, cele i alerty</p></div>
 <div class="tl later"><b>3.0 Dąb</b><small>01.02.2028</small><p>dokumentacja medyczna, odontogram, zgody, Platforma P1; stary program wyłączony</p></div>
 <div class="tl later"><b>4.0 Gutaperkowiec</b><small>30.06.2028</small><p>obrazowanie: Romexis, Orthanc, skanery, opisy badań</p></div>
 <div class="tl later"><b>5.0 Brzoza</b><small>2029</small><p>gabinety 03 i 04, EHDS, AI organizacyjne, portal pacjenta</p></div>
</div>
<div class="grid" style="grid-template-columns:1fr 1fr;margin-top:6px">
 <div class="card"><span class="k">Bramka 1.0 (przykład)</span><ul class="pl"><li>10 kolejnych dni roboczych z wpisami w obu gabinetach, ≥ 90% dni zamkniętych</li><li>pulpit zgodny z sumą wpisów (drążenie)</li><li>wszystkie konta imienne z MFA, recepcja przeszkolona</li><li>kopia nocna odtworzona testowo, zero błędów integracji</li></ul></div>
 <div class="card"><span class="k">Co to daje zespołowi</span><ul class="pl"><li>nic nie wchodzi „na raz”: każda zmiana sposobu pracy ma dwa tygodnie równoległej pracy ze starym programem</li><li>decyzja o przejściu dalej jest jawna i mierzalna</li><li>gabinety 03 i 04 mogą dołączyć po 1.1, bo model danych jest gotowy od 1.0</li></ul></div>
</div>
''')

# ------------------------------------------------------------------ 13 kto czego się spodziewa
page("oczekiwania", header("Jak rośnie · czego kto może się spodziewać i kiedy") + '''
<h2>Czego kto może się spodziewać</h2>
<table class="t">
<thead><tr><th style="width:140px"></th><th>1.0 Krasnodrzew · 12.2026</th><th>1.1 Ratania · 04.2027</th><th>2.0 Pięciornik · 07.2027</th><th>2.1 Cynamonowiec · 09.2027</th><th>3.0 Dąb · 02.2028</th></tr></thead>
<tbody>
<tr><td>Recepcja</td><td>wpisuje obłożenie dnia (≤ 3 min), zamyka dzień; pacjenci i terminarz w starym programie</td><td>jeden terminarz obu gabinetów, karta pacjenta w 2 s, najbliższy wolny termin w sieci, SMS same się wysyłają</td><td>rozliczenie wizyty i płatności w Crux, paragon, saldo pacjenta</td><td>lista oczekujących z propozycjami do luk, odprawa poranna</td><td>stary program wyłączony; wszystko w Crux</td></tr>
<tr><td>Lekarz, higienistka</td><td>własny pulpit: moje godziny, moja kwota na godzinę</td><td>grafik, lista dnia, statusy przy fotelu, zlecenia do pracowni</td><td>plan leczenia z wariantami, akceptacja na tablecie, rozliczenie miesięczne z systemu</td><td>recall działa sam, pulpit z medianą sieci</td><td>wpisy kliniczne, odontogram, zgody, e-recepta przez Platformę P1</td></tr>
<tr><td>Kierownik</td><td>pulpit gabinetu, tabela wykonawców, zamykanie dni, poprawki z powodem</td><td>grafiki, przeniesienia między gabinetami, import ze starego programu</td><td>uzgodnienie kasy, należności, cennik z wyjątkami per gabinet</td><td>cele i alerty, Koniec dnia, raport odprawy</td><td>dokumentacja i retencja pod kontrolą, eksport całości</td></tr>
<tr><td>Zarząd</td><td>pulpit sieci: obłożenie, godziny, przychód/h per gabinet; administracja kontami i gabinetami</td><td>porównanie gabinetów na wizytach, nieobecności, źródła pacjentów</td><td>przychód z należności, konwersja planów, rozliczenia lekarzy co do grosza</td><td>pełny pulpit sieci, rankingi, bez równoległego Excela</td><td>Crux jako jedyny system; gotowość na gabinety 03 i 04</td></tr>
<tr><td>Pacjent</td><td>nic się nie zmienia</td><td>SMS z przypomnieniem i prośbą o potwierdzenie, rezerwacja online</td><td>czytelny kosztorys do podpisu na tablecie</td><td>przypomnienie o przeglądzie w porę</td><td>e-recepta, dokumenty z Platformy P1; portal w 5.0</td></tr>
</tbody></table>
<p class="sec" style="font-size:12px">Każde wydanie poprzedza dzień obserwacji w gabinecie i 15-minutowe szkolenie. Lista bólów zgłoszonych przez zespół wchodzi do backlogu następnego wydania.</p>
''')

# ------------------------------------------------------------------ 14 na czym stoi
page("fundamenty", header("Jak rośnie · na czym to stoi") + '''
<h2>Wymogi wbudowane w system od pierwszego dnia</h2>
<div class="grid" style="grid-template-columns:repeat(3,1fr)">
 <div class="card"><span class="k">Dane w Unii Europejskiej</span><p>Baza PostgreSQL w Supabase we Frankfurcie, w osobnej organizacji dla podmiotu leczniczego. Pliki medyczne (od 2.0) u dostawcy z UE. Plan wyjścia testowany co kwartał.</p></div>
 <div class="card"><span class="k">Kto, co, kiedy</span><p>Konta imienne z MFA, blokada ekranu, role z uprawnieniami jako dane. Baza sama pilnuje, że recepcja 01 nie zobaczy wpisów 02, nawet gdyby kod o tym zapomniał.</p></div>
 <div class="card"><span class="k">Nic nie znika</span><p>Wpisy zostają na zawsze; korekta to unieważnienie z powodem. Dokumentacja i pieniądze (od 2.0 i 3.0) tylko się dopisują; każda korekta ma autora i powód.</p></div>
 <div class="card"><span class="k">1.0 bez danych pacjentów</span><p>Wydanie 1.0 przetwarza wyłącznie dane personelu. Opinia prawna, DPIA i umowy powierzenia są warunkiem wydania 1.1, nie 1.0, i powstają równolegle.</p></div>
 <div class="card"><span class="k">Strażnicy kodu</span><p>Każda funkcja ma specyfikację z kryteriami, testy i automatyczne reguły („doctor”), które nie przepuszczają skrótów. Nowa funkcja to prompt w Cursorze.</p></div>
 <div class="card"><span class="k">Kopie i odtwarzanie</span><p>Kopie nocne, odtworzenie do dowolnej minuty z ostatnich dni, test odtworzenia co kwartał. Awaria SMS-ów czy Platformy P1 nigdy nie blokuje recepcji.</p></div>
</div>
<div class="card sunken"><p><strong>Granica wyrobu medycznego:</strong> Crux nie diagnozuje i nie podpowiada leczenia. Zdjęcia RTG ogląda się w Romexis; Crux (od 4.0) pokazuje podgląd bez narzędzi pomiarowych. AI w Crux (5.0) jest organizacyjne i zawsze kończy się akceptacją człowieka.</p></div>
''')

# ------------------------------------------------------------------ 15 jak dokładamy
page("jak-dokladamy", header("Jak rośnie · jak dokładamy funkcje") + '''
<h2>Od bólu w gabinecie do funkcji w wydaniu: zawsze ta sama droga</h2>
<div class="cycle">
 <div class="st"><span class="n">1</span><h3>Zamiar</h3><p>Zespół zgłasza ból („nie widzę, który fotel stoi”). Powstaje specyfikacja z kryteriami akceptacji: co ma się stać, przy jakich danych, z jakim skutkiem.</p></div>
 <div class="st"><span class="n">2</span><h3>Szkielet i prompt</h3><p>Generator tworzy strukturę modułu, a AI (Cursor) wypełnia ją według gotowego promptu z dokumentacji. Człowiek czyta plan i diff.</p></div>
 <div class="st"><span class="n">3</span><h3>Strażnicy</h3><p>Testy, reguły bazy, granice modułów i „doctor” łamią się głośno, gdy coś odbiega od dokumentacji. Metryka bez definicji nie wejdzie na ekran.</p></div>
 <div class="st"><span class="n">4</span><h3>Bramka</h3><p>Funkcja trafia na staging, potem do jednego gabinetu, potem do drugiego. Wydanie jest zamknięte, gdy bramka jest spełniona w gabinecie.</p></div>
</div>
<div class="grid" style="grid-template-columns:1fr 1fr;margin-top:4px">
 <div class="card"><span class="k">Co to znaczy dla zespołu</span><ul class="pl"><li>zgłoszenie bólu z gabinetu to wejście do specyfikacji; każde ma odpowiedź: w którym wydaniu</li><li>nic nie zmienia się w gabinecie bez dnia obserwacji, szkolenia i dwóch tygodni pracy równoległej</li><li>nowy gabinet to sama konfiguracja: numer, fotele, godziny, konta</li></ul></div>
 <div class="card"><span class="k">Co to znaczy dla wspólników</span><ul class="pl"><li>koszt infrastruktury ok. 1–1,5 tys. zł miesięcznie do 2.1, ok. 3,5–4,5 tys. zł od 3.0 plus bramka Platformy P1</li><li>największy koszt to czas: jeden prowadzący z AI, programista od 1.1, prawnik na godziny</li><li>zwrot liczymy odzyskanym przychodem: puste fotele, plany bez terminu, nieobecności</li></ul></div>
</div>
''')

# ------------------------------------------------------------------ 16 zakończenie
page("koniec", '''
<div style="position:absolute;right:-60px;bottom:-80px;height:760px;opacity:.2"><img src="marka/ryciny/krasnodrzew-krem.svg" style="height:760px"></div>
<img src="marka/logo/crux-poziomy-krem.svg" style="height:110px;width:auto" alt="crux · zenit.stomatologia">
<div style="flex:1"></div>
<div style="display:flex;flex-direction:column;gap:14px;max-width:700px">
 <h1 style="font-size:56px;line-height:60px;color:var(--zenit-krem)">Spokój. Precyzja. Ciągłość.</h1>
 <p class="lead" style="color:var(--zenit-porost)">System nie krzyczy. Każda liczba ma definicję. Jeden standard w każdym gabinecie.</p>
 <div style="display:flex;gap:28px;margin-top:10px;font-size:13px;color:var(--zenit-porost)">
  <div><b style="color:var(--zenit-krem)">Pytania i zgłoszenia</b><br>Miłosz · zarząd sieci</div>
  <div><b style="color:var(--zenit-krem)">Dokumentacja</b><br>folder <code>crux</code> · podręcznik 1.0 · księga znaku Crux 1.0</div>
  <div><b style="color:var(--zenit-krem)">Wersja manifestu</b><br>1.0 · 6 listopada 2026</div>
 </div>
</div>''', theme="butelka", label="", number=False)

def build():
    out = ['<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Crux · manifest systemu · 1.0 Krasnodrzew</title><style>' + CSS + '</style></head><body>']
    total = len(PAGES)
    for i, (id_, body, theme, label, number, cls) in enumerate(PAGES, 1):
        foot = f'<div class="foot"><span>{"crux · zenit.stomatologia" if theme=="butelka" else "crux · zenit.stomatologia · manifest systemu · wydanie 1.0 „Krasnodrzew”"}</span><span class="num">{i} / {total}</span></div>' if number else ''
        out.append(f'<section class="plansza {theme} {cls}" id="{id_}">{body}{foot}</section>')
    out.append('</body></html>')
    (HERE / "manifest.html").write_text("\n".join(out), encoding="utf-8")
    print("ok manifest.html:", total, "plansz")

if __name__ == "__main__":
    build()
