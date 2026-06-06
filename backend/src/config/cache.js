/**
 * Simple In-Memory Cache Utility
 * Replaces Redis functionality for simple caching needs
 */

const logger = require('../utils/logger');

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttlTimers = new Map();
  }

  /**
   * Set key with optional TTL (in seconds)
   */
  async set(key, value, ttl = null) {
    try {
      // Clear existing TTL timer if any
      if (this.ttlTimers.has(key)) {
        clearTimeout(this.ttlTimers.get(key));
        this.ttlTimers.delete(key);
      }

      this.cache.set(key, value);

      // Set TTL if specified
      if (ttl && ttl > 0) {
        const timer = setTimeout(() => {
          this.cache.delete(key);
          this.ttlTimers.delete(key);
        }, ttl * 1000);
        
        this.ttlTimers.set(key, timer);
      }

      return true;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get key value
   */
  async get(key) {
    try {
      return this.cache.get(key) || null;
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete key
   */
  async del(key) {
    try {
      // Clear TTL timer if exists
      if (this.ttlTimers.has(key)) {
        clearTimeout(this.ttlTimers.get(key));
        this.ttlTimers.delete(key);
      }
      
      return this.cache.delete(key);
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      return this.cache.has(key);
    } catch (error) {
      logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key, ttl) {
    try {
      if (!this.cache.has(key)) {
        return false;
      }

      // Clear existing timer
      if (this.ttlTimers.has(key)) {
        clearTimeout(this.ttlTimers.get(key));
      }

      // Set new timer
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.ttlTimers.delete(key);
      }, ttl * 1000);
      
      this.ttlTimers.set(key, timer);
      return true;
    } catch (error) {
      logger.error(`Cache EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all keys matching pattern (simple string matching)
   */
  async keys(pattern) {
    try {
      const keys = Array.from(this.cache.keys());
      
      if (pattern === '*') {
        return keys;
      }
      
      // Simple pattern matching (replace * with regex)
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      
      return keys.filter(key => regex.test(key));
    } catch (error) {
      logger.error(`Cache KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Increment counter
   */
  async incr(key) {
    try {
      const currentValue = this.cache.get(key) || 0;
      const newValue = parseInt(currentValue) + 1;
      this.cache.set(key, newValue);
      return newValue;
    } catch (error) {
      logger.error(`Cache INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set if not exists
   */
  async setnx(key, value, ttl = null) {
    try {
      if (this.cache.has(key)) {
        return false;
      }
      
      await this.set(key, value, ttl);
      return true;
    } catch (error) {
      logger.error(`Cache SETNX error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      keys: this.cache.size,
      memory: process.memoryUsage().heapUsed,
      uptime: process.uptime()
    };
  }

  /**
   * Clear all cache
   */
  clear() {
    // Clear all TTL timers
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.ttlTimers.clear();
    
    logger.info('Cache cleared');
  }

  /**
   * Clean up expired entries (manual cleanup)
   */
  cleanup() {
    // TTL cleanup is automatic via setTimeout
    // This method is for manual cleanup if needed
    logger.debug('Cache cleanup completed (automatic via TTL)');
  }
}

// Create singleton instance
const memoryCache = new MemoryCache();

// Cache key generators
const cacheKeys = {
  userSession: (sessionId) => `session:${sessionId}`,
  userCache: (userId) => `user:${userId}`,
  vendorCache: (vendorId) => `vendor:${vendorId}`,
  rfqCache: (rfqId) => `rfq:${rfqId}`,
  quotationCache: (quotationId) => `quotation:${quotationId}`,
  orgCache: (orgId) => `org:${orgId}`,
  rateLimit: (ip, endpoint) => `rate_limit:${ip}:${endpoint}`,
  emailVerification: (token) => `email_verify:${token}`,
  passwordReset: (token) => `password_reset:${token}`,
  notification: (userId) => `notifications:${userId}`
};

// Graceful shutdown cleanup
const closeCache = async () => {
  try {
    memoryCache.clear();
    logger.info('Memory cache closed');
  } catch (error) {
    logger.error('Error closing memory cache:', error);
  }
};

process.on('SIGINT', closeCache);
process.on('SIGTERM', closeCache);

module.exports = {
  memoryCache,
  cacheKeys,
  closeCache
};