/**
 * Settings Manager for TWiT Mobile App
 * 
 * Provides utilities for saving and retrieving user settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const SETTINGS_KEYS = {
  DARK_MODE: 'twit_settings_dark_mode',
  USE_CELLULAR_DATA: 'twit_settings_use_cellular_data',
};

// Default settings
const DEFAULT_SETTINGS = {
  darkMode: false,
  useCellularData: true,
};

/**
 * Save a setting to persistent storage
 * @param {string} key - Settings key
 * @param {any} value - Setting value
 * @returns {Promise<void>}
 */
export const saveSetting = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving setting:', error);
  }
};

/**
 * Get a setting from persistent storage
 * @param {string} key - Settings key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>} The setting value
 */
export const getSetting = async (key, defaultValue) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return JSON.parse(value);
    }
    return defaultValue;
  } catch (error) {
    console.error('Error reading setting:', error);
    return defaultValue;
  }
};

/**
 * Load all app settings
 * @returns {Promise<Object>} Object containing all settings
 */
export const loadSettings = async () => {
  try {
    const settings = { ...DEFAULT_SETTINGS };
    
    // Load each setting
    settings.darkMode = await getSetting(SETTINGS_KEYS.DARK_MODE, DEFAULT_SETTINGS.darkMode);
    settings.useCellularData = await getSetting(SETTINGS_KEYS.USE_CELLULAR_DATA, DEFAULT_SETTINGS.useCellularData);
    
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Save all app settings
 * @param {Object} settings - Settings object
 * @returns {Promise<void>}
 */
export const saveSettings = async (settings) => {
  try {
    // Save each setting individually
    await saveSetting(SETTINGS_KEYS.DARK_MODE, settings.darkMode ?? DEFAULT_SETTINGS.darkMode);
    await saveSetting(SETTINGS_KEYS.USE_CELLULAR_DATA, settings.useCellularData ?? DEFAULT_SETTINGS.useCellularData);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export default {
  SETTINGS_KEYS,
  DEFAULT_SETTINGS,
  saveSetting,
  getSetting,
  loadSettings,
  saveSettings,
};
