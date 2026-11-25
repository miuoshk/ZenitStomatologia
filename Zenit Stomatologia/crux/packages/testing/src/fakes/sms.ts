/** Minimalny port SMS (docelowo w `@crux/integrations`; do tego czasu definicja tutaj). */
export type SmsPort = {
  send(to: string, body: string): Promise<{ id: string }>;
};

export type FakeSms = SmsPort & { readonly sent: Array<{ id: string; to: string; body: string }> };

/** Atrapa SMS — nic nie wysyła, zapamiętuje wiadomości. Wiązanie przez FAKE_INTEGRATIONS=1. */
export function createFakeSms(): FakeSms {
  const sent: FakeSms["sent"] = [];
  return {
    sent,
    send(to, body) {
      const id = `fake-sms-${String(sent.length + 1)}`;
      sent.push({ id, to, body });
      return Promise.resolve({ id });
    },
  };
}
