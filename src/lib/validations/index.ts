// Deal validation schemas
export {
  createDealSchema,
  confirmDealSchema,
  voidDealSchema,
  duplicateDealSchema,
  nudgeDealSchema,
  dealTermSchema,
  type CreateDealInput,
  type ConfirmDealInput,
  type VoidDealInput,
  type DuplicateDealInput,
  type NudgeDealInput,
} from "./deal";

// User validation schemas
export {
  updateProfileSchema,
  emailSchema,
  verifyOtpSchema,
  type UpdateProfileInput,
  type EmailInput,
  type VerifyOtpInput,
} from "./user";
