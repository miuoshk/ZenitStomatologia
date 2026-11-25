# Nowy pracownik — konto, MFA, członkostwa

**Właściciel:** Miłosz (administrator sieci) · **Data przeglądu:** 2026-11-25 · **Cel:** założyć konto zgodnie z zasadą najmniejszych uprawnień, z obowiązkowym MFA.

## Kroki (ekrany K15)

1. `/ustawienia/personel` (`staff.manage`) → „Dodaj osobę”: imię i nazwisko, tytuł, NPWZ (jeśli dotyczy), kolor w grafiku, kompetencje.
2. **Członkostwa:** gabinet, rola (`receptionist`, `location_manager`, `dentist`, `hygienist`, `auditor`…), data „od”. Minimum uprawnień; `network_admin` tylko dla administratorów sieci.
3. „Zaproś” — system tworzy konto i pokazuje **hasło jednorazowe tylko raz**. Przekaż **osobiście** (nigdy e-mail/SMS/komunikator).
4. Pierwsze logowanie: wymuszona zmiana hasła, rejestracja **MFA TOTP** (aplikacja uwierzytelniająca). Konto bez MFA (aal2) nie wejdzie do aplikacji.
5. Sprawdź status w liście personelu: „aktywny, MFA zarejestrowane”.
6. Poinformuj o zasadach: blokada ekranu (idle lock), zakaz wpisywania danych pacjentów w notatkach (1.0), zgłaszanie incydentów ([incydent-bezpieczenstwa.md](incydent-bezpieczenstwa.md)).

## Utrata telefonu z MFA

„Resetuj MFA” (z powodem; wymaga `staff.manage`), potwierdź tożsamość osobiście.
