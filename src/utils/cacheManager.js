/**
 * Cache Manager for TWiT Mobile App
 * 
 * Provides utilities for caching API responses and managing offline data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Cache expiration time (10 minutes in milliseconds)
const CACHE_EXPIRY = 10 * 60 * 1000;

// Cache keys
const CACHE_KEYS = {
  SHOWS: 'twit_cache_shows',
  EPISODES: 'twit_cache_episodes',
  STREAMS: 'twit_cache_streams',
  SHOW_DETAIL: 'twit_cache_show_',
  EPISODE_DETAIL: 'twit_cache_episode_',
};

// Approx. maximum size per cached item (in characters). AsyncStorage stores strings
// and is ultimately backed by SQLite on Android. Very large values can cause SQLITE_FULL.
// Keep a conservative limit to avoid filling storage with a single entry.
const MAX_ITEM_SIZE_CHARS = 500_000; // ~500 KB

/**
 * Check if the device is currently online
 * @returns {Promise<boolean>} True if online, false if offline
 */
export const isOnline = async () => {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected && netInfo.isInternetReachable;
};

/**
 * Save data to cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @returns {Promise<void>}
 */
export const saveToCache = async (key, data) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      data,
    };
    const serialized = JSON.stringify(cacheData);

    // Skip caching overly large payloads to prevent storage pressure
    if (serialized.length > MAX_ITEM_SIZE_CHARS) {
      console.warn(`Skipping cache for key ${key}: payload too large (~${Math.round(serialized.length / 1024)} KB)`);
      return;
    }

    await AsyncStorage.setItem(key, serialized);
  } catch (error) {
    console.error('Error saving to cache:', error);
    const message = String(error && (error.message || error));
    if (message.includes('SQLITE_FULL') || message.includes('database or disk is full')) {
      // Best-effort recovery: clear app cache namespace to free space
      try {
        console.warn('Cache storage full. Clearing cached entries to recover...');
        await clearAllCache();
      } catch (clearErr) {
        console.error('Error while clearing cache after SQLITE_FULL:', clearErr);
      }
    }
  }
};

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @param {boolean} ignoreExpiry - Whether to ignore cache expiration
 * @returns {Promise<any|null>} Cached data or null if not found or expired
 */
export const getFromCache = async (key, ignoreExpiry = false, expiryMs = CACHE_EXPIRY) => {
  try {
    const cachedData = await AsyncStorage.getItem(key);
    
    if (!cachedData) {
      return null;
    }
    
    const { timestamp, data } = JSON.parse(cachedData);
    
    // Check if cache is expired
    if (!ignoreExpiry && Date.now() - timestamp > expiryMs) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return null;
  }
};

/**
 * Clear specific cache
 * @param {string} key - Cache key to clear
 * @returns {Promise<void>}
 */
export const clearCache = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Clear all cache entries that start with a prefix
 * @param {string} prefix - Key prefix to clear
 * @returns {Promise<void>}
 */
export const clearCacheByPrefix = async (prefix) => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matched = keys.filter(key => key.startsWith(prefix));
    if (matched.length) {
      await AsyncStorage.multiRemove(matched);
    }
  } catch (error) {
    console.error('Error clearing cache by prefix:', error);
  }
};

/**
 * Clear all app cache
 * @returns {Promise<void>}
 */
export const clearAllCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('twit_cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
};

export default {
  CACHE_KEYS,
  isOnline,
  saveToCache,
  getFromCache,
  clearCache,
  clearCacheByPrefix,
  clearAllCache,
};
