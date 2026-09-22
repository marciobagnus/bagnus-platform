export const INTERNAL_SESSION_COOKIE =
  "bagnus_session";

export function sessionCookieOptions(
  expires: Date,
) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    expires,
  };
}