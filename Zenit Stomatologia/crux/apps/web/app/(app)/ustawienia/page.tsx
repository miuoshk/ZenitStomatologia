import Link from "next/link";

export default function UstawieniaPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium text-[var(--text-primary)]">Ustawienia</h1>
      <ul className="mt-4 space-y-2">
        <li>
          <Link
            href="/ustawienia/o-crux"
            className="text-[var(--zenit-zielen)] underline-offset-2 hover:underline"
          >
            O Crux
          </Link>
        </li>
      </ul>
    </div>
  );
}
