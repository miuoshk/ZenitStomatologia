import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isPatientHost } from "../lib/host";

export default async function HomePage() {
  const host = (await headers()).get("host");
  if (isPatientHost(host)) {
    redirect("/dla-pacjentow");
  }
  redirect("/oblozenie");
}
