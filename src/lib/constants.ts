/**
 * Global application constants
 * Centralizes magic numbers and configuration values
 */

/**
 * Timing constants for UI feedback and delays
 * All values in milliseconds unless otherwise noted
 */
export const TIMING = {
  /** Duration to show copy-to-clipboard success feedback */
  COPY_FEEDBACK: 2000,
  /** Debounce delay for dashboard refresh */
  REFRESH_DEBOUNCE: 500,
  /** Interval for checking session validity (10 minutes) */
  SESSION_CHECK_INTERVAL: 10 * 60 * 1000,
  /** Animation duration for modals and transitions */
  MODAL_ANIMATION: 200,
  /** Delay before auto-dismissing toasts */
  TOAST_DURATION: 4000,
} as const;

/**
 * Feature limits and constraints
 */
export const LIMITS = {
  /** Days until access tokens expire */
  TOKEN_EXPIRY_DAYS: 7,
  /** Maximum terms allowed per deal */
  MAX_TERMS: 20,
  /** Maximum characters in deal title */
  MAX_TITLE_LENGTH: 200,
  /** Maximum characters in deal description */
  MAX_DESCRIPTION_LENGTH: 1000,
  /** Maximum characters in term label */
  MAX_TERM_LABEL_LENGTH: 100,
  /** Maximum characters in term value */
  MAX_TERM_VALUE_LENGTH: 500,
  /** Maximum file uploads per deal (future feature) */
  MAX_ATTACHMENTS: 5,
} as const;

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
  /** Main app state (Zustand) */
  APP_STATE: "proofo-storage",
  /** Onboarding completion flag */
  ONBOARDING_COMPLETE: "proofo-onboarding-complete",
  /** Theme preference */
  THEME: "proofo-theme",
  /** Hidden contacts on People page */
  HIDDEN_CONTACTS: "proofo-hidden-contacts",
} as const;

/**
 * Profile completion weights for percentage calculation
 */
export const PROFILE_COMPLETION_WEIGHTS = {
  name: 25,
  email: 25,
  signatureUrl: 25,
  jobTitle: 10,
  location: 10,
  currency: 5,
} as const;
