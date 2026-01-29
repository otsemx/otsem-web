// src/lib/2fa.ts
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

/**
 * Generate a TOTP secret for a user
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate OTP Auth URL for QR code
 */
export function generateOtpAuthUrl(email: string, secret: string, issuer: string = 'OtsemPay'): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Generate QR code data URL from OTP Auth URL
 */
export async function generateQRCode(otpAuthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpAuthUrl);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP token against a secret
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

/**
 * Generate backup codes (8-digit codes)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-digit code
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
  }
  return codes;
}

/**
 * Format backup code for display (XXXX-XXXX)
 */
export function formatBackupCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Validate TOTP code format (6 digits)
 */
export function isValidTotpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Validate backup code format (8 digits)
 */
export function isValidBackupCodeFormat(code: string): boolean {
  // Allow both formatted (XXXX-XXXX) and unformatted (XXXXXXXX)
  return /^\d{8}$/.test(code) || /^\d{4}-\d{4}$/.test(code);
}

/**
 * Remove formatting from backup code
 */
export function normalizeBackupCode(code: string): string {
  return code.replace(/-/g, '');
}

/**
 * Get current TOTP token (for testing purposes)
 */
export function getCurrentToken(secret: string): string {
  return authenticator.generate(secret);
}
