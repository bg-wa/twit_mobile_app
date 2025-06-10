/**
 * Utilities for handling live streams
 */
import { Linking, Platform } from 'react-native';
import playerManager from '../services/playerManager';

/**
 * Opens a stream URL in the appropriate app based on stream type and provider
 * 
 * @param {Object} stream - The stream object from the API
 * @returns {Promise} - Promise that resolves when the URL is opened
 */
export const openStreamInApp = async (stream) => {
  if (!stream || !stream.streamSource) {
    console.error('Invalid stream or missing streamSource');
    return Promise.reject('Invalid stream URL');
  }

  const streamUrl = stream.streamSource;
  const streamType = stream.streamType;
  const provider = stream.streamProviders?.label || '';
  const capabilities = Array.isArray(stream.streamCapabilities) ? stream.streamCapabilities : [];
  const streamId = stream.id || 'unknown';

  console.log(`Opening ${streamType} stream from ${provider}`);
  
  // Stop any currently playing videos
  playerManager.stopAllPlayers();
  
  // Handle specific providers with their own apps
  if (provider === 'YouTube' || provider === 'YouTube Live') {
    return openYouTubeStream(streamUrl, streamId, provider);
  } else if (provider === 'Twitch') {
    return openTwitchStream(streamUrl, streamId, provider);
  } else if (provider === 'TuneIn' || provider === 'TuneIn - Audio') {
    return openTuneInStream(streamUrl, streamId, provider);
  } else if (provider.includes('Audio') || streamType === 'audio') {
    // Generic audio streams
    return openAudioStream(streamUrl, streamId, provider);
  } else if (capabilities.includes('hls')) {
    // HLS video streams - most compatible with native video players
    return openVideoStream(streamUrl, streamId, provider);
  }

  // Default fallback - open in browser
  playerManager.registerExternalApp('Browser', streamId);
  return Linking.openURL(streamUrl);
};

/**
 * Open a YouTube stream in the YouTube app or browser
 */
const openYouTubeStream = (url, streamId, provider = 'YouTube') => {
  let videoId = '';

  // Extract video ID if possible
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu.be\/)([^&]+)/);
    if (match && match[1]) {
      videoId = match[1];
    }
  }

  // Try to open in YouTube app
  if (videoId) {
    const youtubeAppUrl = Platform.select({
      ios: `youtube://${videoId}`,
      android: `vnd.youtube:${videoId}`
    });
    
    return Linking.canOpenURL(youtubeAppUrl)
      .then(supported => {
        if (supported) {
          playerManager.registerExternalApp('YouTube', streamId);
          return Linking.openURL(youtubeAppUrl);
        } else {
          playerManager.registerExternalApp('Browser', streamId);
          return Linking.openURL(url);
        }
      })
      .catch(err => {
        console.error('Error opening YouTube URL:', err);
        playerManager.registerExternalApp('Browser', streamId);
        return Linking.openURL(url);
      });
  }

  // Fallback to browser
  playerManager.registerExternalApp('Browser', streamId);
  return Linking.openURL(url);
};

/**
 * Open a Twitch stream in the Twitch app or browser
 */
const openTwitchStream = (url, streamId, provider = 'Twitch') => {
  let channelName = '';
  
  // Extract channel name if possible
  if (url.includes('twitch.tv/')) {
    const match = url.match(/twitch\.tv\/([^\/\?]+)/);
    if (match && match[1]) {
      channelName = match[1];
    }
  }

  // Try to open in Twitch app
  if (channelName) {
    const twitchAppUrl = Platform.select({
      ios: `twitch://stream/${channelName}`,
      android: `twitch://stream/${channelName}`
    });
    
    return Linking.canOpenURL(twitchAppUrl)
      .then(supported => {
        if (supported) {
          playerManager.registerExternalApp('Twitch', streamId);
          return Linking.openURL(twitchAppUrl);
        } else {
          playerManager.registerExternalApp('Browser', streamId);
          return Linking.openURL(url);
        }
      })
      .catch(err => {
        console.error('Error opening Twitch URL:', err);
        playerManager.registerExternalApp('Browser', streamId);
        return Linking.openURL(url);
      });
  }

  // Fallback to browser
  playerManager.registerExternalApp('Browser', streamId);
  return Linking.openURL(url);
};

/**
 * Open a TuneIn stream in the TuneIn app or browser
 */
const openTuneInStream = (url, streamId, provider = 'TuneIn') => {
  // If it's a TuneIn URL, try to open it in the TuneIn app
  if (url.includes('tunein.com/')) {
    const tuneInAppUrl = url.replace('http://', 'tunein://').replace('https://', 'tunein://');
    
    return Linking.canOpenURL(tuneInAppUrl)
      .then(supported => {
        if (supported) {
          playerManager.registerExternalApp('TuneIn', streamId);
          return Linking.openURL(tuneInAppUrl);
        } else {
          playerManager.registerExternalApp('Browser', streamId);
          return Linking.openURL(url);
        }
      })
      .catch(err => {
        console.error('Error opening TuneIn URL:', err);
        playerManager.registerExternalApp('Browser', streamId);
        return Linking.openURL(url);
      });
  }

  // Fallback to browser
  playerManager.registerExternalApp('Browser', streamId);
  return Linking.openURL(url);
};

/**
 * Open an audio stream in an appropriate audio player
 */
const openAudioStream = (url, streamId, provider = 'Audio') => {
  // For audio streams, we'll try to use the system's default audio player
  playerManager.registerExternalApp(provider, streamId);
  return Linking.openURL(url);
};

/**
 * Open a video stream in an appropriate video player
 */
const openVideoStream = (url, streamId, provider = 'Video') => {
  // For video streams, we'll try to use the system's default video player
  playerManager.registerExternalApp(provider, streamId);
  return Linking.openURL(url);
};
