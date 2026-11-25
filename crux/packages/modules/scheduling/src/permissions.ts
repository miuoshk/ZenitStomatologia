/** Uprawnienia modułu obłożenia (seed w `@crux/identity`). */
export const OCCUPANCY_PERMISSIONS = [
  "occupancy.read",
  "occupancy.write",
  "occupancy.write_own",
  "occupancy.void",
  "occupancy.close_day",
  "occupancy.write_closed",
  "occupancy.override_hours",
] as const;

export type OccupancyPermission = (typeof OCCUPANCY_PERMISSIONS)[number];
