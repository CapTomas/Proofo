/**
 * Demo deal constants for the verify landing page.
 * The actual demo data lives in the database (seeded by migration).
 */

export const DEMO_DEAL_ID = "demo-verify";

/**
 * Check if a deal ID is the demo deal
 */
export function isDemoDeal(publicId: string): boolean {
  return publicId === DEMO_DEAL_ID;
}
