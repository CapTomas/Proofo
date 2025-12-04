import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate user initials from name or email
 * @param name - User's display name
 * @param email - User's email (fallback)
 * @returns 1-2 character initials string
 */
export function getUserInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0]?.toUpperCase() || "U";
  }
  return "U";
}
