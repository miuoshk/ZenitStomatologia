/** Hostnames for the public patient site (ADR-033). Never show Crux branding here. */
const PATIENT_HOSTS = new Set([
  "zenitstomatologia.pl",
  "www.zenitstomatologia.pl",
]);

/** Canonical Crux app host. */
export const CRUX_HOST = "crux.zenitstomatologia.pl";

export function isPatientHost(host: string | null): boolean {
  if (!host) return false;
  const bare = host.split(":")[0]?.toLowerCase() ?? "";
  return PATIENT_HOSTS.has(bare);
}
