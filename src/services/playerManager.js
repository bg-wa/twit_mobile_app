/**
 * Service for managing video playback state across the app
 * Used to ensure only one video plays at a time
 */

class PlayerManager {
  constructor() {
    this.activePlayerIds = new Set();
    this.activeExternalApp = null;
    this.activeSessions = [];
  }

  /**
   * Register a video player as active
   * @param {string} playerId - Unique ID for the player
   * @param {function} stopFunction - Function to call to stop this player
   */
  registerPlayer(playerId, stopFunction) {
    if (!playerId) return;
    
    // Stop any other active players
    this.stopAllPlayers();
    
    // Register this player
    this.activePlayerIds.add(playerId);
    this.activeSessions.push({
      id: playerId,
      stopFn: stopFunction,
      timestamp: Date.now()
    });
    
    console.log(`PlayerManager: registered player ${playerId}`);
  }

  /**
   * Unregister a video player (when it stops)
   * @param {string} playerId - Unique ID for the player to unregister
   */
  unregisterPlayer(playerId) {
    if (!playerId) return;
    
    this.activePlayerIds.delete(playerId);
    this.activeSessions = this.activeSessions.filter(session => session.id !== playerId);
    
    console.log(`PlayerManager: unregistered player ${playerId}`);
  }

  /**
   * Stop all currently active players
   */
  stopAllPlayers() {
    console.log(`PlayerManager: stopping ${this.activeSessions.length} active players`);
    
    // Stop each player by calling its stop function
    this.activeSessions.forEach(session => {
      if (typeof session.stopFn === 'function') {
        try {
          session.stopFn();
        } catch (err) {
          console.error(`Error stopping player ${session.id}:`, err);
        }
      }
    });
    
    // Clear the active players list
    this.activePlayerIds.clear();
    this.activeSessions = [];
  }

  /**
   * Register that an external app has been opened for video playback
   * @param {string} appName - Name of the external app (e.g., 'YouTube', 'Twitch')
   * @param {string} streamId - ID of the stream being played
   */
  registerExternalApp(appName, streamId) {
    // Stop any existing playback
    this.stopAllPlayers();
    
    this.activeExternalApp = {
      appName,
      streamId,
      timestamp: Date.now()
    };
    
    console.log(`PlayerManager: registered external app ${appName} for stream ${streamId}`);
  }

  /**
   * Clear the record of active external app
   */
  clearExternalApp() {
    this.activeExternalApp = null;
    console.log('PlayerManager: cleared external app record');
  }

  /**
   * Get information about the currently active playback
   * @returns {Object} Information about active playback or null
   */
  getActivePlayback() {
    if (this.activeExternalApp) {
      return {
        type: 'external',
        ...this.activeExternalApp
      };
    }
    
    if (this.activeSessions.length > 0) {
      const mostRecent = [...this.activeSessions].sort((a, b) => b.timestamp - a.timestamp)[0];
      return {
        type: 'internal',
        id: mostRecent.id,
        timestamp: mostRecent.timestamp
      };
    }
    
    return null;
  }
}

// Create singleton instance
const playerManager = new PlayerManager();

export default playerManager;
