export type InternalUserRole =
  | "ADMIN"
  | "STAFF";

export function canAuthorizeDebtHandover(
  role: InternalUserRole,
): boolean {
  return role === "ADMIN";
}