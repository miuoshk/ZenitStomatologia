/** Lista startowa uprawnień (docs/03 §8 + K06). Seed SQL: manual_0007. */

export const PERMISSIONS = [
  "org.manage",
  "staff.manage",
  "settings.manage",
  "audit.read",
  "patient.read",
  "patient.write",
  "patient.merge",
  "appointment.read",
  "appointment.create",
  "appointment.move",
  "appointment.cancel",
  "appointment.override_hours",
  "occupancy.read",
  "occupancy.write",
  "occupancy.write_own",
  "occupancy.void",
  "occupancy.close_day",
  "occupancy.write_closed",
  "occupancy.override_hours",
  "lab_order.read",
  "lab_order.write",
  "lab_order.cost",
  "network.view",
  "analytics.view_self",
  "analytics.view_location",
  "analytics.view_network",
  "analytics.export",
  "integrations.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
