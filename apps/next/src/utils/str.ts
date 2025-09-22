import crypto from "crypto";

/**
 * Generate a random safe string for alias or password.
 */
export function generateRandomString(length: number = 16): string {
  return crypto
    .randomBytes(length)
    .toString("base64") // Base64 is shorter than hex
    .replace(/[^a-zA-Z0-9]/g, "") // keep only alphanumeric (keeps keytool happy)
    .slice(0, length);
}
