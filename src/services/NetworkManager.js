/**
 * Network Manager for TWiT Mobile App
 * 
 * Handles network connection state and settings
 */

import NetInfo from '@react-native-community/netinfo';
import settingsManager from '../utils/settings/settingsManager';

class NetworkManager {
  constructor() {
    this.connectionType = null;
    this.isConnected = false;
    this.useCellularData = true; // Default to true as requested
    this.listeners = [];
    
    // Initialize network monitoring
    this.initNetworkMonitoring();
    this.loadSettings();
  }

  /**
   * Initialize network state monitoring
   */
  initNetworkMonitoring() {
    // Subscribe to network state updates
    NetInfo.addEventListener(state => {
      this.isConnected = state.isConnected;
      this.connectionType = state.type;
      this.notifyListeners();
    });
  }

  /**
   * Load user settings
   */
  async loadSettings() {
    try {
      const settings = await settingsManager.loadSettings();
      this.useCellularData = settings.useCellularData;
    } catch (error) {
      console.error('Failed to load network settings:', error);
    }
  }

  /**
   * Update cellular data usage setting
   * @param {boolean} useCell - Whether cellular data should be used
   */
  async updateCellularSetting(useCell) {
    this.useCellularData = useCell;
    try {
      await settingsManager.saveSetting(
        settingsManager.SETTINGS_KEYS.USE_CELLULAR_DATA, 
        useCell
      );
    } catch (error) {
      console.error('Failed to save cellular data setting:', error);
    }
    this.notifyListeners();
  }

  /**
   * Check if media should be allowed to play based on current settings and connection
   * @returns {boolean} True if media should be allowed to play
   */
  canPlayMedia() {
    // If on WiFi, always allow playback
    if (this.connectionType === 'wifi') {
      return true;
    }
    
    // If on cellular, check settings
    if (this.connectionType === 'cellular') {
      return this.useCellularData;
    }
    
    // For other types (none, unknown, etc.), check if we're connected
    return this.isConnected;
  }

  /**
   * Get current connection information
   * @returns {Object} Connection info
   */
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      useCellularData: this.useCellularData,
      canPlayMedia: this.canPlayMedia()
    };
  }

  /**
   * Add a listener for network state changes
   * @param {function} listener - Callback function
   * @returns {function} Unsubscribe function
   */
  addListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
      
      // Return unsubscribe function
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }
  }

  /**
   * Notify all listeners of network state change
   */
  notifyListeners() {
    const info = this.getConnectionInfo();
    this.listeners.forEach(listener => {
      try {
        listener(info);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }
}

// Create singleton instance
const networkManager = new NetworkManager();

export default networkManager;
