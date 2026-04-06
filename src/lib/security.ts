/**
 * Security Utilities
 * Validasi, sanitasi, dan proteksi
 */

import { z } from 'zod';

/**
 * Sanitize string input untuk mencegah XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate dan sanitize phone number
 */
export const phoneSchema = z.string()
  .trim()
  .regex(/^(08|628)\d{8,12}$/, {
    message: 'Format nomor telepon tidak valid. Gunakan: 08xx atau 628xx (8-14 digit)',
  })
  .transform(val => val.replace(/\D/g, '')); // Remove non-digits

/**
 * Validate order ID (UUID or custom SQID format)
 */
export const orderIdSchema = z.string()
  .trim()
  .min(1, 'Order ID diperlukan')
  .max(100, 'Order ID terlalu panjang')
  .refine(
    val => /^[a-f0-9-]+$/i.test(val) || /^SQID\d{13}$/i.test(val),
    'Format Order ID tidak valid'
  );

/**
 * Validate file upload
 */
export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(file => file.size <= 5 * 1024 * 1024, 'Ukuran file maksimal 5MB')
    .refine(
      file => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type),
      'Format file tidak didukung. Gunakan: JPG, PNG, WebP, atau PDF'
    ),
});

/**
 * Generate random filename yang aman
 */
export function generateSecureFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  
  // Validate extension (security: prevent executable files)
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
  if (!allowedExtensions.includes(ext)) {
    throw new Error('Ekstensi file tidak diizinkan');
  }
  
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Validate admin password
 */
export const adminPasswordSchema = z.string()
  .min(1, 'Password diperlukan')
  .max(100, 'Password terlalu panjang');

/**
 * Escape HTML untuk mencegah XSS
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate URL (untuk redirect, dll)
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Hanya izinkan http/https
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Mask sensitive data untuk logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) return '***';
  return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify CSRF token (constant-time comparison)
 */
export function verifyCsrfToken(token: string, expected: string): boolean {
  if (token.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}
