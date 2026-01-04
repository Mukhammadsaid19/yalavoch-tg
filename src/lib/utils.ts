import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import crypto from "crypto";

/**
 * Normalize phone number to E.164 format (+1234567890)
 * This ensures both Web and Bot use the same format for matching
 */
export function normalizePhoneNumber(phone: string): string | null {
  try {
    // Remove all whitespace and non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, "");
    
    // Add + if missing (Telegram sometimes sends without it)
    if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }

    // Validate and parse
    if (!isValidPhoneNumber(cleaned)) {
      return null;
    }

    const parsed = parsePhoneNumber(cleaned);
    return parsed?.format("E.164") || null;
  } catch {
    return null;
  }
}

/**
 * Generate a secure 6-digit OTP code
 */
export function generateOtpCode(): string {
  // Generate cryptographically secure random number between 100000 and 999999
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  const code = 100000 + (num % 900000);
  return code.toString();
}

/**
 * Calculate expiry time (5 minutes from now)
 */
export function getExpiryTime(minutes: number = 5): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Check if a date is expired
 */
export function isExpired(date: Date): boolean {
  return new Date() > date;
}

