/**
 * Cache Manager for TWiT Mobile App
 * 
 * Provides utilities for caching API responses and managing offline data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// Cache keys
const CACHE_KEYS = {
  SHOWS: 'twit_cache_shows',
  EPISODES: 'twit_cache_episodes',
  STREAMS: 'twit_cache_streams',
  SHOW_DETAIL: 'twit_cache_show_',
  EPISODE_DETAIL: 'twit_cache_episode_',
};

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
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
};

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @param {boolean} ignoreExpiry - Whether to ignore cache expiration
 * @returns {Promise<any|null>} Cached data or null if not found or expired
 */
export const getFromCache = async (key, ignoreExpiry = false) => {
  try {
    const cachedData = await AsyncStorage.getItem(key);
    
    if (!cachedData) {
      return null;
    }
    
    const { timestamp, data } = JSON.parse(cachedData);
    
    // Check if cache is expired
    if (!ignoreExpiry && Date.now() - timestamp > CACHE_EXPIRY) {
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
  clearAllCache,
};
