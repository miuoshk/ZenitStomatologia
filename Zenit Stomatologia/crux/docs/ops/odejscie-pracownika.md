# Odejście pracownika

**Właściciel:** Miłosz (administrator sieci) · **Data przeglądu:** 2026-11-25 · **Cel:** odciąć dostęp w dniu odejścia, zachowując historię (nic nie kasujemy).

## Kroki — w dniu zakończenia współpracy (lub wcześniej przy zwolnieniu dyscyplinarnym)

1. `/ustawienia/personel` → osoba → **„Dezaktywuj”**: kończy wszystkie członkostwa (data „do”), wylogowuje sesje.
2. Zweryfikuj, że lista członkostw nie ma otwartych pozycji (brak „do” = aktywne).
3. **MFA:** po dezaktywacji faktor TOTP przestaje mieć znaczenie; przy podejrzeniu przejęcia — „Resetuj MFA” przed dezaktywacją i zapisz powód.
4. **Tokeny/sesje:** konto Auth zablokowane; jeśli osoba miała dostęp do paneli (Supabase, Vercel, Sentry, GitHub) — usuń z organizacji, zmień sekrety, do których miała dostęp.
5. Zwrot nośników/kluczy; zmiana haseł wspólnych (jeśli istniały — nie powinny).
6. Historia (`audit.events`, grafik, wpisy) **zostaje**; osoba pozostaje w danych jako nieaktywna.
7. Odnotuj datę i wykonawcę w rejestrze operacyjnym.

## Przegląd

Co kwartał: lista aktywnych kont vs lista zatrudnionych; konta bez logowania od 90 dni → dezaktywacja.
