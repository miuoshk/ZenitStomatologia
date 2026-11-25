# 00 · Wizja i zasady

Wersja 2.1 · 6 listopada 2026.

## Po co Crux

Gabinet stomatologiczny prowadzony na typowym polskim programie gabinetowym ma dane rozsiane w trzech miejscach: program (pacjenci, terminarz, dokumentacja), Excel (rozliczenia lekarzy, laboratorium, plany sprzedażowe) i głowa kierownika (kto nie wrócił na przegląd, który plan leczenia utknął). Przy jednym gabinecie to działa. Przy czterech przestaje, bo właściciel nie widzi sieci, a gabinety nie widzą siebie nawzajem.

Crux łączy te trzy miejsca w jeden system dla całej sieci zenit.stomatologia.

**Łańcuch przyczynowo-skutkowy, który Crux ma przerwać:**

```
brak jednej bazy pacjentów sieci
  → pacjent z 01 nie może łatwo umówić się w 02
  → recepcja nie widzi wolnych foteli w innym gabinecie
  → puste fotele i utracone wizyty
  → plany leczenia bez terminu nikną z pola widzenia
  → właściciel widzi to dopiero w KPiR, miesiąc później
```

## Dla kogo

| Rola | Co ma dostać od Crux |
|---|---|
| Recepcja | jeden terminarz wszystkich gabinetów, karta pacjenta w 2 sekundy, najbliższy wolny termin w sieci, przypomnienia SMS bez klikania |
| Lekarz dentysta, higienistka | szybkie wpisy kliniczne, odontogram, plan leczenia, który pacjent rozumie, badanie RTG jednym kliknięciem, własny pulpit |
| Asystentka | lista dnia, zlecenia do pracowni, zgody do podpisu na tablecie, badania do przypięcia |
| Kierownik gabinetu | obłożenie foteli, nieobecności, recall, plany do domknięcia, odprawa poranna, należności |
| Właściciel (zarząd sieci) | przychód, marża i obłożenie w podziale na gabinet, lekarza i usługę; porównanie gabinetów; rozliczenia lekarzy; raport końca dnia |
| Księgowość | eksport sprzedaży do Comarch Optima, zestawienia płatności, uzgodnienie kasy |
| Pacjent (F6) | plan leczenia, płatności, terminy i dokumenty w portalu |

## Zasady produktu

Wynikają z marki („Spokój, Precyzja, Ciągłość”) i przekładają się na decyzje w systemie:

1. **Spokój:** system nie krzyczy. Domyślnie pokazuje to, co trzeba zrobić dziś. Alerty tylko, gdy wymagają działania. Brak czerwonych liczników „dla zasady”.
2. **Precyzja:** najpierw mierzymy, potem działamy. Każda liczba ma definicję w rejestrze metryk (`11-dashboardy-i-raporty.md`) i prowadzi do listy rekordów, z których powstała.
3. **Ciągłość:** jeden standard w każdym gabinecie. Te same usługi (kolornik Z1–Z+), ten sam cennik bazowy, ten sam proces. Gabinet różni się tylko numerem i adresem; sposób pracy jest wspólny.
4. **Jedna baza pacjentów na podmiot leczniczy.** Pacjent jest pacjentem całej sieci.
5. **Dokumentacja i pieniądze tylko się dopisują.** Nic nie znika; każda korekta ma autora i powód.
6. **Szybkość przed funkcjonalnością.** Ekran recepcji poniżej 1 s, wyszukiwanie pacjenta poniżej 300 ms. Funkcja, która spowalnia recepcję, nie wchodzi.
7. **Klawiatura przed myszką** dla recepcji (`Ctrl+K` z każdego miejsca, skróty na ekranie Dziś).
8. **Standardy przed wynalazkami.** Tam, gdzie istnieje standard (FHIR, CDA, DICOM, ICD), model danych ma na niego mapowanie od pierwszego dnia.

## Jak Crux wchodzi do gabinetów

Wydaniami (`07-roadmapa.md`, sekcja 2), od najmniejszego ryzyka do największego: najpierw pomiar bez danych pacjentów (1.0 „Krasnodrzew”: obłożenie foteli, role, pulpity), potem terminarz i pacjenci (1.1), pieniądze i plany (2.0), CRM i pełne pulpity (2.1), dokumentacja z Platformą P1 (3.0), obrazowanie (4.0), skala (5.0). Każde wydanie ma bramkę mierzoną w gabinecie. Stary program gaśnie etapami.

## Czym Crux nie jest

- Nie jest produktem SaaS. Nie budujemy onboardingu klientów, cennika ani marketingu produktu (model danych tego nie wyklucza).
- Nie jest programem do diagnostyki obrazowej. Diagnoza w Romexis; Crux pokazuje podgląd i otwiera badanie.
- Nie podpowiada rozpoznań ani leczenia. AI w Crux jest organizacyjne i zawsze kończy się akceptacją człowieka.
- Nie obsługuje NFZ, dopóki gabinety nie mają kontraktu.
- Nie zastępuje księgowości. Księga i KSeF zostają w Comarch Optima.

## Miary sukcesu (rok po wdrożeniu F3)

- odsetek nieobecności spada o co najmniej 30% względem stanu sprzed wdrożenia
- recall: co najmniej 60% pacjentów z terminem przeglądu ma umówioną wizytę lub kontakt w 30 dni od terminu
- konwersja planów leczenia mierzona w każdym gabinecie; cel wyznaczamy po 3 miesiącach pomiaru
- wartość planów otwartych bez terminu spada kwartał do kwartału
- rozliczenie lekarzy kontraktowych za miesiąc gotowe w 1 dzień roboczy
- zarząd nie prowadzi żadnego równoległego arkusza do metryk z rejestru
- zero incydentów naruszenia danych podlegających zgłoszeniu do UODO

Wartości bazowe mierzymy przy wydaniu 1.0 (audyt obecnych procesów, `07-roadmapa.md`, sekcja 5).

## Miary wydania 1.0 (pierwszy miesiąc po wdrożeniu)

- oba gabinety wpisują obłożenie codziennie: `days_closed_rate ≥ 90%`
- wpisanie dnia zajmuje recepcji ≤ 3 minuty (pomiar w retrospektywie)
- zarząd zna obłożenie i przychód na godzinę fotela per gabinet za ostatnie 30 dni bez pytania nikogo
- zero danych pacjentów w systemie (test `doctor`), zero incydentów
