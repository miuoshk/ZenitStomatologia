# 1 · Po co Crux i dlaczego zaczynamy od obłożenia foteli

## Problem w jednym łańcuchu

Gabinet na typowym programie gabinetowym ma dane w trzech miejscach: program (pacjenci, terminarz, dokumentacja), Excel (rozliczenia lekarzy, laboratorium, plany sprzedażowe) i głowa kierownika (kto nie wrócił na przegląd, który plan utknął). Przy jednym gabinecie to działa. Przy dwóch zaczyna się łańcuch:

```
brak jednej bazy pacjentów sieci
  → pacjent z 01 nie może łatwo umówić się w 02
  → recepcja nie widzi wolnych foteli w innym gabinecie
  → puste fotele i utracone wizyty
  → plany leczenia bez terminu nikną z pola widzenia
  → właściciel widzi to dopiero w KPiR, miesiąc później
```

Crux ma ten łańcuch przerwać. Pełna wizja: `docs/00-wizja-i-zasady.md`.

## Dlaczego nie kupujemy gotowego programu

Sprawdziliśmy polskie (IQ Dental, Prodentis, Estomed, FELG, Medfile) i światowe (Dentrix/Jarvis, CareStack, Curve, Open Dental) rozwiązania (`docs/08`). Żadne nie jest zbudowane wokół **sieci** gabinetów z jednym właścicielem: brak jednej definicji metryk dla wielu lokalizacji, rozliczenia lekarzy poza systemem, dashboardy jako dodatek. Dla jednego gabinetu gotowiec jest tańszy; dla sieci, która ma być liderem IT w regionie, własny system z własną analityką jest jedyną drogą, żeby dane były nasze i porównywalne.

## Dlaczego pierwsze wydanie mierzy fotele

Pełny terminarz Crux z pacjentami wymaga najpierw trzech rzeczy, na które czeka się tygodniami: opinii prawnej o dokumentacji medycznej i Supabase, oceny skutków dla ochrony danych (DPIA) i umów powierzenia z dostawcami (`docs/04`). Gdybyśmy czekali, pierwsza wartość pojawiłaby się w kwietniu 2027.

Dlatego wydanie 1.0 **nie przetwarza danych pacjentów** (ADR-032). Przetwarza tylko dane personelu: kto, kiedy, na którym fotelu pracował i jaką kategorię usługi wykonał. To dane zwykłe w rozumieniu RODO, więc wystarczy standardowa umowa powierzenia z Supabase i Vercel, wpis w rejestrze czynności i informacja dla personelu. Skutek:

- Crux wchodzi do gabinetów **11 grudnia 2026**, cztery miesiące wcześniej niż w planie 2.0;
- zarząd po raz pierwszy widzi 01 i 02 obok siebie na jednej definicji liczb: obłożenie foteli, godziny, przychód na godzinę fotela;
- recepcja buduje nawyk pracy w Cruxie na małym, bezpiecznym zadaniu (2–3 minuty dziennie), zanim w 1.1 dostanie cały terminarz;
- cała infrastruktura, bezpieczeństwo i strażnicy kodu (rozdziały 3–5) powstają teraz i są gotowe, gdy w 1.1 pojawią się dane pacjentów.

Cena: recepcja przez kilka miesięcy wpisuje obłożenie obok starego programu. Dlatego wpis dnia musi zajmować najwyżej 3 minuty z klawiatury, jest funkcja „dzień jak wczoraj”, a kwoty są opcjonalne. Jeśli mimo to wpisy nie będą utrzymywane (bramka 1.0 niespełniona po 4 tygodniach), pomiar startuje z wizyt w 1.1, a 1.0 zostaje jako szkielet i administracja (ADR-032, „Wracamy, gdy”).

## Trzy zasady marki, które stają się zasadami systemu

| Marka | System |
|---|---|
| **Spokój** | pulpit pokazuje stan i to, co wymaga działania dziś; bez czerwonych liczników „dla zasady”; stan zawsze z ikoną i słowem |
| **Precyzja** | każda liczba ma wpis w rejestrze metryk, SQL w kodzie, test na zestawie wzorcowym i drążenie do rekordów; metryka bez wpisu nie trafia na ekran (strażnik `crux-doctor`) |
| **Ciągłość** | jeden standard w każdym gabinecie; gabinet różni się tylko numerem i adresem; nowy gabinet to sama konfiguracja |

## Czym Crux nie jest

- nie jest produktem SaaS: nie budujemy onboardingu klientów, cennika ani marketingu produktu (model danych tego nie wyklucza);
- nie diagnozuje i nie podpowiada leczenia; nie analizuje zdjęć (granica wyrobu medycznego, ADR-017, ADR-028);
- nie zastępuje księgowości: księga i KSeF zostają w Comarch Optima;
- nie obsługuje NFZ, dopóki gabinety nie mają kontraktu;
- nie wchodzi „na raz”: stary program gaśnie wydanie po wydaniu (`docs/07`, sekcja 2).
