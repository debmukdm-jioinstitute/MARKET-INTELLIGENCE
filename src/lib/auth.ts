export type SessionUser = {
  name: string;
  email: string;
  guest?: boolean;
  role?: "user" | "admin";
};

export const GUEST_EMAIL = "guest@explore.market-intelligence";

export const GUEST_SESSION: SessionUser = {
  name: "Guest",
  email: GUEST_EMAIL,
  guest: true,
};

export function isGuestUser(user: SessionUser | null | undefined) {
  return Boolean(user?.guest || user?.email === GUEST_EMAIL);
}
