import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Validates password strength requirements
 * Requirements: min 8 chars, at least one uppercase, one lowercase, one number
 * @param password - The password to validate
 * @returns true if password meets requirements, false otherwise
 */
export function validatePasswordStrength(password: string): boolean {
  const minLengthRegex = /.{8,}/;
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const numberRegex = /[0-9]/;

  return (
    minLengthRegex.test(password) &&
    uppercaseRegex.test(password) &&
    lowercaseRegex.test(password) &&
    numberRegex.test(password)
  );
}

/**
 * Hashes a plain text password using bcrypt with 12 rounds
 * @param password - The plain text password to hash
 * @returns Promise<string> The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compares a plain text password with its hash
 * @param password - The plain text password
 * @param hash - The hashed password to compare against
 * @returns Promise<boolean> true if passwords match, false otherwise
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
