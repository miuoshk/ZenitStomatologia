import { LoginForm } from "./login-form";

export default function LogowaniePage() {
  return (
    <div className="auth-card">
      <h1 className="mb-2 text-[32px] font-extrabold leading-9 tracking-[-0.02em] text-[var(--zenit-kosc)]">Logowanie</h1>
      <p className="mb-8 text-[15px] text-[var(--auth-muted)]">Zaloguj się kontem służbowym. Po haśle poprosimy o kod z aplikacji.</p>
      <LoginForm />
    </div>
  );
}
