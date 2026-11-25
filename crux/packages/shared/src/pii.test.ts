import { describe, expect, it } from "vitest";
import { generateTestPesel } from "./pesel";
import { containsPii } from "./pii";

describe("containsPii", () => {
  const pesel = generateTestPesel({ birthDate: "1992-07-08", sex: "female", serial: 3 });

  const positives: string[] = [
    `pacjent PESEL ${pesel}`,
    `tel +48 600700800`,
    `zadzwoń 600700800`,
    `mail jan.kowalski@example.com`,
    `kontakt: anna@zenit.pl proszę`,
    `+48600111222`,
    `nr 500600700`,
    `pesel:${pesel} w karcie`,
    `e-mail: a.b+tag@mail.co.uk`,
    `telefon +48-601602603`,
  ];

  const negatives: string[] = [
    "wizyta kontrolna bez danych",
    "gabinet 01 fotel 2",
    "kwota 1234,50 zł",
    "id 01900000-0000-7000-8000-000000000001",
    "kod ICD K02.1",
    "godzina 14:30",
    "12345678901", // 11 cyfr, zła suma PESEL
    "notatka kliniczna: próchnica",
    "ul. Dębowa — bez numeru telefonu w sensie PII-testu krótkiego",
    "procent 82%",
  ];

  it("wykrywa PII na przykładach pozytywnych", () => {
    expect(positives).toHaveLength(10);
    for (const sample of positives) {
      expect(containsPii(sample), sample).toBe(true);
    }
  });

  it("nie fałszywie alarmuje na przykładach negatywnych", () => {
    expect(negatives).toHaveLength(10);
    for (const sample of negatives) {
      expect(containsPii(sample), sample).toBe(false);
    }
  });
});
