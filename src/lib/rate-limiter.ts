/**
 * Rate Limiter Utility
 * Mencegah brute force, spam, dan DDoS
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';

// Login rate limiter: 5 attempts per 10 minutes
export const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 600, // 10 minutes
});

// API rate limiter: 100 requests per 15 minutes
export const apiLimiter = new RateLimiterMemory({
  points: 100,
  duration: 900, // 15 minutes
});

// Upload rate limiter: 10 uploads per hour
export const uploadLimiter = new RateLimiterMemory({
  points: 10,
  duration: 3600, // 1 hour
});

// General rate limiter: 30 requests per minute
export const generalLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60, // 1 minute
});

/**
 * Helper untuk consume rate limit
 * Returns true jika masih dalam limit, false jika exceeded
 */
export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<{ success: boolean; remainingPoints?: number; msBeforeNext?: number }> {
  try {
    const res = await limiter.consume(key);
    return {
      success: true,
      remainingPoints: res.remainingPoints,
      msBeforeNext: res.msBeforeNext,
    };
  } catch (rejRes: any) {
    return {
      success: false,
      remainingPoints: 0,
      msBeforeNext: rejRes.msBeforeNext,
    };
  }
}
