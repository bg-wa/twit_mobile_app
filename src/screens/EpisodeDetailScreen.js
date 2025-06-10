import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
  Animated,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';
import apiService from '../services/api';
import playerManager from '../services/playerManager';
import { decodeHtmlEntities, stripHtmlAndDecodeEntities } from '../utils/textUtils';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';

const { width, height } = Dimensions.get('window');

// Collapsible Section Component
const CollapsibleSection = ({ title, children, initiallyExpanded = false, expanded, setExpanded, rotation }) => {
  const toggleExpand = () => {
    if (expanded) {
      Animated.timing(rotation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(rotation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
    setExpanded(!expanded);
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.collapsibleContainer}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="chevron-forward" size={22} color="#666" />
        </Animated.View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.collapsibleContent}>
          {children}
        </View>
      )}
    </View>
  );
};

// Helper function to extract the best available image URL
const extractImageUrl = (episode) => {
  // Check for heroImage first (preferred for episodes)
  if (episode.heroImage) {
    // If heroImage is an object with derivatives, use the appropriate size
    if (episode.heroImage.derivatives && episode.heroImage.derivatives.twit_album_art_300x300) {
      return episode.heroImage.derivatives.twit_album_art_300x300;
    } else if (episode.heroImage.url) {
      return episode.heroImage.url;
    }
  }

  // Fall back to coverArt if heroImage isn't available
  if (episode.coverArt) {
    // If coverArt is an object with derivatives, use the appropriate size
    if (episode.coverArt.derivatives && episode.coverArt.derivatives.twit_album_art_300x300) {
      return episode.coverArt.derivatives.twit_album_art_300x300;
    } else if (episode.coverArt.url) {
      return episode.coverArt.url;
    }
  }

  // Fallback to the image property if it's a string
  if (typeof episode.image === 'string') {
    return episode.image;
  }

  return null;
};

const formatFileSize = (sizeInBytes) => {
  if (!sizeInBytes) return null;
  
  const bytes = parseInt(sizeInBytes);
  if (isNaN(bytes)) return null;
  
  // Convert to MB or GB as appropriate
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
};

const EpisodeDetailScreen = ({ route, navigation }) => {
  const { id, title, showId } = route.params;
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoStatus, setVideoStatus] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackQuality, setPlaybackQuality] = useState('auto');
  const [availableQualities, setAvailableQualities] = useState(['auto', '1080p', '720p', '480p', '360p']);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const controlsTimeout = useRef(null);
  const scrollViewRef = useRef(null);
  const playerId = useRef(`episode-${id}`).current;
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(100); // Default to 100 to avoid 0 division

  // Player manager static registry - only called once when component mounts
  useEffect(() => {
    // Register this player with the player manager
    if (videoRef.current) {
      playerManager.registerPlayer(playerId, () => {
        if (videoRef.current) {
          videoRef.current.pauseAsync().catch(err => {
            console.error('Error pausing video:', err);
          });
        }
      });
    }

    // Clean up when unmounting
    return () => {
      playerManager.unregisterPlayer(playerId);
      ScreenOrientation.unlockAsync();
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [playerId]);

  // Fetch episode data on component mount
  useEffect(() => {
    const fetchEpisodeDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const episodeData = await apiService.getEpisodeById(id, showId);
        console.log('Episode data structure:', JSON.stringify(episodeData, null, 2));

        // Log video URLs specifically to debug the issue
        console.log('Video HD:', episodeData.video_hd);
        console.log('Video Large:', episodeData.video_large);
        console.log('Video Small:', episodeData.video_small);

        setEpisode(episodeData);
        setLoading(false);

        // Try to extract video URL - but don't auto-play
        const url = getVideoUrl(episodeData);
        console.log('Video URL extracted:', url);
        
        // Set the URL without triggering auto-play
        if (url) {
          setVideoUrl(url);
          // Ensure controls are visible for manual play
          setShowControls(true);
          // Make sure we're not auto-playing
          setIsPlaying(false);
        }

      } catch (err) {
        console.error('Error fetching episode details:', err);
        setError('Failed to load episode details. Please try again later.');
        setLoading(false);
      }
    };

    fetchEpisodeDetails();
  }, [id]);

  // Register with navigation focus events to handle app state changes
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('EpisodeDetailScreen focused');
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log('EpisodeDetailScreen blurred');
      if (videoRef.current && isPlaying) {
        videoRef.current.pauseAsync().catch(err => {
          console.error('Error pausing video on blur:', err);
        });
      }
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, isPlaying]);

  // Controls auto-hide timeout
  useEffect(() => {
    if (showControls && isPlaying && !showQualityOptions) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showControls, isPlaying, showQualityOptions]);

  // Add useEffect to ensure video ref is properly reset when switching between audio and video
  useEffect(() => {
    // This effect runs when videoUrl or isAudioOnly changes
    if (videoUrl) {
      console.log(`Media source changed to ${isAudioOnly ? 'audio' : 'video'}: ${videoUrl}`);
      
      // Ensure we have a clean state for the player
      if (videoRef.current) {
        videoRef.current.loadAsync(
          { uri: videoUrl },
          { shouldPlay: false, positionMillis: 0 }
        ).catch(err => {
          console.error('Error loading media in useEffect:', err);
        });
      }
    }
  }, [videoUrl, isAudioOnly]);

  const togglePlayPause = async () => {
    try {
      if (videoRef.current) {
        // Get current status
        const status = await videoRef.current.getStatusAsync();
        
        // If currently playing, pause it
        if (status.isPlaying) {
          await videoRef.current.pauseAsync();
          setIsPlaying(false);
          return;
        }
        
        // If not playing or not loaded properly, play it
        // Stop any other playing media first
        playerManager.stopAllPlayers();
        
        // Play this media
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      
      // If we get an error, try to reload the media
      if (videoRef.current && videoUrl) {
        try {
          await videoRef.current.loadAsync(
            { uri: videoUrl },
            { shouldPlay: true }
          );
          setIsPlaying(true);
        } catch (reloadError) {
          console.error('Failed to reload media:', reloadError);
          Alert.alert('Playback Error', 'There was a problem playing this media.');
        }
      }
    }
  };

  // Add helper for checking if a URL is audio-only
  const isAudioFormat = (url, quality) => {
    if (!url) return false;
    
    // Check if quality explicitly says it's audio
    if (quality && (quality.toLowerCase().includes('audio') || quality === 'Audio')) {
      return true;
    }
    
    // Check URL extension for common audio formats
    const audioExtensions = ['.mp3', '.aac', '.m4a', '.wav', '.ogg'];
    return audioExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Updated function to handle different video formats
  const handleWatchVideo = async (url, quality) => {
    console.log(`Setting up ${quality} media with URL:`, url);

    if (!url) {
      Alert.alert(
        'Media Not Available',
        `The ${quality} quality version is not available.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Stop current playback if any
      if (videoRef.current) {
        try {
          await videoRef.current.pauseAsync();
          // Unload previous media to ensure clean state when switching formats
          await videoRef.current.unloadAsync();
        } catch (err) {
          console.log('Error stopping current media (expected if first load):', err);
        }
      }

      // Determine if this is audio-only content
      const isAudio = isAudioFormat(url, quality);
      console.log(`Is this audio-only content? ${isAudio ? 'Yes' : 'No'}`);
      
      // Update state
      setVideoUrl(url);
      setPlaybackQuality(quality);
      setIsAudioOnly(isAudio);
      setShowControls(true);
      setIsPlaying(false); // Always start paused
      
      // Scroll to player
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
      }

      // Stop any other players
      playerManager.stopAllPlayers();
      
      console.log(`Loading ${isAudio ? 'audio' : 'video'} source: ${url}`);
      
      // Wait a moment for state updates to propagate
      setTimeout(() => {
        if (videoRef.current) {
          // Load the new media
          videoRef.current.loadAsync(
            { uri: url },
            { shouldPlay: false, positionMillis: 0 }
          ).then(() => {
            console.log(`Successfully loaded ${isAudio ? 'audio' : 'video'} source`);
          }).catch(err => {
            console.error('Error loading media source:', err);
            Alert.alert('Playback Error', 'Failed to load the selected media.');
          });
        }
      }, 200);
    } catch (err) {
      console.error('Error in handleWatchVideo:', err);
    }
  };

  const toggleFullscreen = async () => {
    console.log("Toggling fullscreen, current state:", isFullscreen);
    try {
      if (isFullscreen) {
        console.log("Exiting fullscreen mode");
        await ScreenOrientation.unlockAsync();
        navigation.setOptions({ headerShown: true });
        setIsFullscreen(false);
      } else {
        console.log("Entering fullscreen mode");
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        navigation.setOptions({ headerShown: false });
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  // Improve onPlaybackStatusUpdate to better handle audio playback states
  const onPlaybackStatusUpdate = (status) => {
    //console.log('Playback status update:', JSON.stringify(status));
    
    if (status.isLoaded) {
      // Update isPlaying state to reflect actual playback status
      if (isPlaying !== status.isPlaying) {
        setIsPlaying(status.isPlaying);
      }
      
      // Update time tracking
      if (status.positionMillis !== undefined) {
        setCurrentTime(status.positionMillis);
        setPlaybackPosition(status.positionMillis / 1000);
      }
      
      if (status.durationMillis !== undefined) {
        setDuration(status.durationMillis);
        setPlaybackDuration(status.durationMillis / 1000);
      }

      // For video (not audio), auto-hide controls after a delay
      if (status.isPlaying && showControls && !isAudioOnly) {
        clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    } else if (status.error) {
      console.error(`Playback error: ${status.error}`);
      Alert.alert('Playback Error', 'There was a problem playing this media.');
    }
  };

  // Improve onSeek handler to work better with audio
  const onSeek = async (value) => {
    console.log(`Seeking to ${value} seconds`);
    try {
      if (videoRef.current) {
        // Convert to milliseconds for the expo Video component
        const seekPosition = value * 1000;
        
        // Set the new position in the player
        await videoRef.current.setPositionAsync(seekPosition);
        
        // Update UI states
        setPlaybackPosition(value);
        setCurrentTime(seekPosition);
        
        console.log(`Successfully sought to position ${seekPosition}ms`);
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleVideoPress = () => {
    console.log("Video/Audio container pressed");
    // For audio, we always want to toggle playback
    if (isAudioOnly) {
      togglePlayPause();
    } else {
      // For video, toggle controls visibility
      setShowControls(!showControls);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return '00:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const changeQuality = (quality) => {
    // In a real app, this would switch video source based on quality
    setPlaybackQuality(quality);
    setShowQualityOptions(false);

    // This is where you would implement actual quality switching
    // For this demo, we'll just show the selected quality
    console.log(`Selected quality: ${quality}`);
  };

  // Determine video URL from episode data
  const getVideoUrl = (episode) => {
    console.log('Extracting video URL from episode data...');
    
    if (!episode) return null;
    
    // Recursive function to search for video URLs in complex objects
    const findVideoUrlInObject = (obj, prefix = '') => {
      if (!obj || typeof obj !== 'object') return null;
      
      // Check if this object itself has a URL property
      if (obj.url && typeof obj.url === 'string' && 
          (obj.url.includes('.mp4') || 
           obj.url.includes('.mov') || 
           obj.url.includes('.m3u8') ||
           obj.url.includes('.mp3'))) {  // Add mp3 to supported formats
        console.log(`Found nested URL in ${prefix}.url:`, obj.url);
        return obj.url;
      }
      
      if (obj.mediaUrl && typeof obj.mediaUrl === 'string' && 
          (obj.mediaUrl.includes('.mp4') || 
           obj.mediaUrl.includes('.mov') || 
           obj.mediaUrl.includes('.m3u8') ||
           obj.mediaUrl.includes('.mp3'))) {  // Add mp3 to supported formats
        console.log(`Found nested URL in ${prefix}.mediaUrl:`, obj.mediaUrl);
        return obj.mediaUrl;
      }
      
      // Look in nested objects
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          const nestedUrl = findVideoUrlInObject(obj[key], `${prefix}.${key}`);
          if (nestedUrl) return nestedUrl;
        }
      }
      
      return null;
    };
    
    // First check the standard video fields from the TWiT API
    if (episode.video_hd && episode.video_hd.mediaUrl) {
      console.log("Found HD video URL:", episode.video_hd.mediaUrl);
      return episode.video_hd.mediaUrl;
    }
    
    if (episode.video_large && episode.video_large.mediaUrl) {
      console.log("Found large video URL:", episode.video_large.mediaUrl);
      return episode.video_large.mediaUrl;
    }
    
    if (episode.video_small && episode.video_small.mediaUrl) {
      console.log("Found small video URL:", episode.video_small.mediaUrl);
      return episode.video_small.mediaUrl;
    }
    
    // Check for audio version as well
    if (episode.video_audio && episode.video_audio.mediaUrl) {
      console.log("Found audio URL:", episode.video_audio.mediaUrl);
      return episode.video_audio.mediaUrl;
    }
    
    // Check standard naming variations
    const videoFields = [
      'video', 'videoUrl', 'videoURL', 'video_url', 'media',
      'videos', 'stream', 'streams', 'hls', 'm3u8', 
      'audio', 'audioUrl', 'audioURL', 'audio_url', 'mp3' // Added audio-related fields
    ];
    
    for (const field of videoFields) {
      if (episode[field]) {
        // If it's a string, check if it's a video URL
        if (typeof episode[field] === 'string' &&
          (episode[field].includes('.mp4') ||
            episode[field].includes('.mov') ||
            episode[field].includes('.m3u8') ||
            episode[field].includes('.mp3'))) {  // Added mp3 support
          console.log(`Found media URL in ${field}:`, episode[field]);
          return episode[field];
        }
        
        // If it's an object, try to find a video URL inside it
        if (typeof episode[field] === 'object') {
          const url = findVideoUrlInObject(episode[field], field);
          if (url) return url;
        }
      }
    }
    
    // Try to look more deeply in the structure
    const url = findVideoUrlInObject(episode, 'root');
    if (url) return url;
    
    // Fall back to YouTube URL if available
    if (episode.video_youtube) {
      console.log("Found YouTube video URL:", episode.video_youtube);
      return episode.video_youtube;
    }
    
    // Then try enclosures - these can contain video files
    if (episode.enclosures && episode.enclosures.length > 0) {
      const mediaEnclosure = episode.enclosures.find(e =>
        e.url && (e.type?.includes('video') || e.type?.includes('audio') || 
                  e.url.match(/\.(mp4|mov|wmv|avi|flv|webm|m3u8|mp3|aac|ogg)$/i))
      );
      
      if (mediaEnclosure) {
        console.log("Found media in enclosures:", mediaEnclosure.url);
        return mediaEnclosure.url;
      }
    }
    
    console.log("No media URL found for episode:", episode.id);
    return null;
  };

  // Function to extract correct mediaUrl format from different video objects
  const extractMediaUrl = (videoObj) => {
    if (!videoObj) return null;

    // Handle different possible formats of video objects
    if (typeof videoObj === 'string') {
      return videoObj;
    }

    // Check for mediaUrl property
    if (videoObj.mediaUrl) {
      return videoObj.mediaUrl;
    }

    // Check for URL property (some API responses use url instead of mediaUrl)
    if (videoObj.url) {
      return videoObj.url;
    }

    return null;
  };

  // Render video player with custom controls
  const renderVideoPlayer = () => {
    console.log("Rendering player with URL:", videoUrl);
    console.log("Is audio only:", isAudioOnly);

    return (
      <View style={[styles.videoContainer, isFullscreen && styles.fullscreenContainer]}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.videoWrapper}
          onPress={handleVideoPress}
        >
          {videoUrl ? (
            <View style={styles.videoPlayerContainer}>
              {/* Only render visible video component when not in audio mode */}
              {!isAudioOnly ? (
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  rate={1.0}
                  volume={1.0}
                  isMuted={false}
                  resizeMode={isFullscreen ? ResizeMode.CONTAIN : ResizeMode.COVER}
                  shouldPlay={false}
                  isLooping={false}
                  positionMillis={0}
                  style={styles.video}
                  onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                  useNativeControls={false}
                  posterSource={extractImageUrl(episode) ? { uri: extractImageUrl(episode) } : undefined}
                  usePoster={true}
                />
              ) : (
                /* For audio-only mode, create audio player with poster but keep the video element */
                <View style={styles.audioPlayerContainer}>
                  {/* The actual audio player - kept for playback functionality */}
                  <Video
                    ref={videoRef}
                    source={{ uri: videoUrl }}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    shouldPlay={false}
                    isLooping={false}
                    positionMillis={0}
                    style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }} /* Hidden but functional */
                    onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                  />
                  
                  {/* Audio display with poster image only - no overlay text */}
                  {extractImageUrl(episode) ? (
                    <Image
                      source={{ uri: extractImageUrl(episode) }}
                      style={styles.audioPosterImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.audioPlaceholderContainer}>
                      <Ionicons name="musical-note" size={80} color="rgba(255,255,255,0.3)" />
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noVideoContainer}>
              <Text style={styles.noVideoText}>No media available</Text>
            </View>
          )}

          {/* Always show controls in audio mode */}
          {(showControls || isAudioOnly) && videoUrl && (
            <View style={styles.controlsOverlay}>
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  style={styles.playPauseButton}
                  onPress={togglePlayPause}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={30}
                    color="white"
                  />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                  <Slider
                    style={styles.progressSlider}
                    minimumValue={0}
                    maximumValue={playbackDuration > 0 ? playbackDuration : 100}
                    value={playbackPosition}
                    onSlidingComplete={onSeek}
                    minimumTrackTintColor="#FFFFFF"
                    maximumTrackTintColor="rgba(255, 255, 255, 0.5)"
                    thumbTintColor="#FFFFFF"
                  />
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    <Text style={styles.timeText}>
                      {formatTime(duration)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity onPress={toggleFullscreen}>
                  <Ionicons
                    name={isFullscreen ? 'contract' : 'expand'}
                    size={30}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.qualityButton}
                onPress={() => setShowQualityOptions(true)}
              >
                <Text style={styles.qualityButtonText}>{playbackQuality}</Text>
                <Ionicons name="chevron-down" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // State for collapsible sections
  const [showNotesExpanded, setShowNotesExpanded] = useState(false);
  const [relatedLinksExpanded, setRelatedLinksExpanded] = useState(false);
  const [streamingExpanded, setStreamingExpanded] = useState(true); // Default expanded
  const [filesExpanded, setFilesExpanded] = useState(false);

  // Animated values for rotations
  const showNotesRotation = useRef(new Animated.Value(0)).current;
  const relatedLinksRotation = useRef(new Animated.Value(0)).current;
  const streamingRotation = useRef(new Animated.Value(1)).current; // Default expanded
  const filesRotation = useRef(new Animated.Value(0)).current;

  // Animation function
  const toggleAnimation = (expanded, setExpanded, rotation) => {
    if (expanded) {
      Animated.timing(rotation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(rotation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
    setExpanded(!expanded);
  };

  // Section for rendering streaming quality options
  const renderStreamingQualityOptions = () => {
    if (!episode) return null;
    
    // Check if we have any streaming options
    const hasStreamingOptions = 
      episode.video_hd || 
      episode.video_large || 
      episode.video_small ||
      episode.video_audio;
      
    if (!hasStreamingOptions) return null;
    
    return (
      <CollapsibleSection
        title="Streaming Options"
        expanded={streamingExpanded}
        setExpanded={setStreamingExpanded}
        rotation={streamingRotation}
      >
        <View style={styles.streamingOptions}>
          {episode.video_hd && episode.video_hd.mediaUrl && (
            <TouchableOpacity 
              style={styles.streamingButton}
              onPress={() => handleWatchVideo(extractMediaUrl(episode.video_hd), 'HD')}
            >
              <Ionicons name="videocam" size={20} color="#33A1FD" style={styles.streamingIcon} />
              <View style={styles.streamingTextContainer}>
                <Text style={styles.streamingButtonText}>HD Quality</Text>
                {episode.video_hd.size && (
                  <Text style={styles.streamingMetaText}>
                    {formatFileSize(episode.video_hd.size)} • {episode.video_hd.runningTime || 'Unknown length'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          
          {episode.video_large && episode.video_large.mediaUrl && (
            <TouchableOpacity 
              style={styles.streamingButton}
              onPress={() => handleWatchVideo(extractMediaUrl(episode.video_large), 'Large')}
            >
              <Ionicons name="videocam" size={20} color="#33A1FD" style={styles.streamingIcon} />
              <View style={styles.streamingTextContainer}>
                <Text style={styles.streamingButtonText}>Large Quality</Text>
                {episode.video_large.size && (
                  <Text style={styles.streamingMetaText}>
                    {formatFileSize(episode.video_large.size)} • {episode.video_large.runningTime || 'Unknown length'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          
          {episode.video_small && episode.video_small.mediaUrl && (
            <TouchableOpacity 
              style={styles.streamingButton}
              onPress={() => handleWatchVideo(extractMediaUrl(episode.video_small), 'Small')}
            >
              <Ionicons name="videocam" size={20} color="#33A1FD" style={styles.streamingIcon} />
              <View style={styles.streamingTextContainer}>
                <Text style={styles.streamingButtonText}>Small Quality</Text>
                {episode.video_small.size && (
                  <Text style={styles.streamingMetaText}>
                    {formatFileSize(episode.video_small.size)} • {episode.video_small.runningTime || 'Unknown length'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          
          {episode.video_audio && episode.video_audio.mediaUrl && (
            <TouchableOpacity 
              style={styles.streamingButton}
              onPress={() => handleWatchVideo(extractMediaUrl(episode.video_audio), 'Audio')}
            >
              <Ionicons name="headset" size={20} color="#33A1FD" style={styles.streamingIcon} />
              <View style={styles.streamingTextContainer}>
                <Text style={styles.streamingButtonText}>Audio Only</Text>
                {episode.video_audio.size && (
                  <Text style={styles.streamingMetaText}>
                    {formatFileSize(episode.video_audio.size)} • {episode.video_audio.runningTime || 'Unknown length'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </CollapsibleSection>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.CTA} />
        <Text style={styles.loadingText}>Loading episode details...</Text>
      </View>
    );
  }

  if (error || !episode) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Failed to load episode details.'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView ref={scrollViewRef} style={styles.container}>
      <View style={styles.headerContainer}>
        {(videoUrl) ? (
          <View style={{ flex: 1 }}>
            {renderVideoPlayer()}
          </View>
        ) : extractImageUrl(episode) ? (
          <Image
            source={{ uri: extractImageUrl(episode) }}
            style={styles.episodeImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>
              {episode.label ? episode.label.charAt(0) : 'E'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.episodeTitle}>{episode.label || title || 'Unknown Episode'}</Text>

        <View style={styles.metadataContainer}>
          {episode.episodeNumber && (
            <View style={styles.episodeNumberBadge}>
              <Text style={styles.episodeNumberText}>
                {episode.seasonNumber ? `S${episode.seasonNumber}:E${episode.episodeNumber}` : `Episode ${episode.episodeNumber}`}
              </Text>
            </View>
          )}

          {episode.airingDate && (
            <Text style={styles.episodeDate}>
              Aired: {new Date(episode.airingDate).toLocaleDateString()}
            </Text>
          )}
        </View>

        {(episode.video_hd || episode.video_large || episode.video_small || episode.video_audio) && (
          <View style={styles.videoInfoContainer}>
            {(episode.video_hd?.runningTime || episode.video_audio?.runningTime) && (
              <View style={styles.videoInfoItem}>
                <Ionicons name="time-outline" size={16} color={COLORS.TEXT_SECONDARY} style={styles.videoInfoIcon} />
                <Text style={styles.videoInfoText}>Duration: {episode.video_hd?.runningTime || episode.video_audio?.runningTime}</Text>
              </View>
            )}
          </View>
        )}

        {!videoUrl && episode.videoUrl && (
          <TouchableOpacity
            style={styles.watchButton}
            onPress={() => handleWatchVideo(episode.videoUrl)}
          >
            <Text style={styles.watchButtonText}>Watch Episode</Text>
          </TouchableOpacity>
        )}

        {episode.audioUrl && (
          <TouchableOpacity
            style={[styles.watchButton, styles.listenButton]}
            onPress={() => handleWatchVideo(episode.audioUrl)}
          >
            <Text style={styles.watchButtonText}>Listen to Episode</Text>
          </TouchableOpacity>
        )}

        {renderStreamingQualityOptions()}

        {episode.showNotes && (
          <CollapsibleSection
            title="Show Notes"
            expanded={showNotesExpanded}
            setExpanded={setShowNotesExpanded}
            rotation={showNotesRotation}
          >
            <Text style={styles.contentText}>{stripHtmlAndDecodeEntities(episode.showNotes)}</Text>
          </CollapsibleSection>
        )}

        {episode.relatedLinks && episode.relatedLinks.length > 0 && (
          <CollapsibleSection
            title="Related Links"
            expanded={relatedLinksExpanded}
            setExpanded={setRelatedLinksExpanded}
            rotation={relatedLinksRotation}
          >
            <View style={styles.linksList}>
              {episode.relatedLinks.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.linkItem}
                  onPress={() => handleWatchVideo(link.url)}
                >
                  <Ionicons name="link-outline" size={18} color="#0066cc" />
                  <Text style={styles.linkText}>
                    {link.label || link.url}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {episode.files && episode.files.length > 0 && (
          <CollapsibleSection
            title="Files"
            expanded={filesExpanded}
            setExpanded={setFilesExpanded}
            rotation={filesRotation}
          >
            <View style={styles.filesList}>
              {episode.files.map((file, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.fileItem}
                  onPress={() => handleWatchVideo(file.url)}
                >
                  <Ionicons name="document-outline" size={18} color="#0066cc" />
                  <Text style={styles.fileText}>
                    {file.label || 'Download File'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {episode.description && (
          <CollapsibleSection
            title="Full Description"
            expanded={false}
            setExpanded={() => { }}
            rotation={new Animated.Value(0)}
          >
            <Text style={styles.contentText}>{stripHtmlAndDecodeEntities(episode.description)}</Text>
          </CollapsibleSection>
        )}

        {episode.credits && episode.credits.length > 0 && (
          <View style={styles.creditsContainer}>
            <Text style={styles.creditsTitle}>Credits</Text>
            {episode.credits.map((credit, index) => (
              <View key={index} style={styles.creditItem}>
                <Text style={styles.creditRole}>{credit.role?.label || 'Unknown Role'}</Text>
                <Text style={styles.creditPerson}>{credit.person?.label || 'Unknown Person'}</Text>
              </View>
            ))}
          </View>
        )}

        {episode.topics && episode.topics.length > 0 && (
          <View style={styles.topicsContainer}>
            <Text style={styles.topicsTitle}>Topics</Text>
            <View style={styles.topicsList}>
              {episode.topics.map((topic, index) => (
                <View key={index} style={styles.topicTag}>
                  <Text style={styles.topicText}>{topic.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.LARGE,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    marginTop: SPACING.SMALL,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginBottom: SPACING.MEDIUM,
  },
  retryButton: {
    backgroundColor: COLORS.SECONDARY,
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    borderRadius: 5,
  },
  retryButtonText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '600',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.PRIMARY_LIGHT,
  },
  infoContainer: {
    padding: SPACING.MEDIUM,
    backgroundColor: COLORS.CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SMALL,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.X_LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.SMALL,
  },
  showName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '500',
    color: COLORS.SECONDARY,
    marginRight: SPACING.SMALL,
  },
  episodeNumber: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    backgroundColor: COLORS.PRIMARY,
    color: COLORS.TEXT_LIGHT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: SPACING.SMALL,
  },
  dateText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
  },
  description: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    lineHeight: 24,
    marginTop: SPACING.SMALL,
  },
  playButton: {
    backgroundColor: COLORS.SECONDARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.SMALL,
    paddingHorizontal: SPACING.MEDIUM,
    borderRadius: 8,
    marginTop: SPACING.MEDIUM,
  },
  playButtonText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '600',
    marginLeft: SPACING.SMALL,
  },
  sectionContainer: {
    marginTop: SPACING.MEDIUM,
    backgroundColor: COLORS.CARD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  sectionHeader: {
    padding: SPACING.MEDIUM,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  sectionIcon: {
    marginRight: SPACING.SMALL,
    color: COLORS.PRIMARY,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  creditsContainer: {
    marginTop: SPACING.MEDIUM,
    marginBottom: SPACING.MEDIUM,
  },
  creditsTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: SPACING.SMALL,
  },
  creditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SMALL,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  creditImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.SMALL,
    backgroundColor: COLORS.BORDER,
  },
  creditInfo: {
    flex: 1,
  },
  creditName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '500',
    color: COLORS.TEXT_DARK,
  },
  creditRole: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
  },
  linksList: {
    padding: SPACING.MEDIUM,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SMALL,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  linkIcon: {
    color: COLORS.SECONDARY,
    marginRight: SPACING.SMALL,
  },
  linkText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.SECONDARY,
  },
  collapsibleContainer: {
    marginBottom: SPACING.MEDIUM,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MEDIUM,
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
  },
  collapsibleTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  collapsibleContent: {
    padding: SPACING.MEDIUM,
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
  },
  contentText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    lineHeight: 24,
  },
  headerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    position: 'relative',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: width * (16 / 9),
    zIndex: 1,
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY_LIGHT,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  episodeImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: COLORS.TEXT_LIGHT,
  },
  contentContainer: {
    padding: SPACING.MEDIUM,
  },
  episodeTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.X_LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
    marginBottom: SPACING.SMALL,
  },
  episodeDate: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    marginBottom: SPACING.MEDIUM,
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SMALL,
  },
  episodeNumberBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  episodeNumberText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_LIGHT,
  },
  watchButton: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: SPACING.SMALL,
    paddingHorizontal: SPACING.MEDIUM,
    borderRadius: 8,
    marginBottom: SPACING.MEDIUM,
    alignItems: 'center',
  },
  listenButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  watchButtonText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '600',
  },
  streamingOptions: {
    flexDirection: 'column',
    padding: SPACING.MEDIUM,
    gap: SPACING.MEDIUM,
  },
  streamingButton: {
    backgroundColor: COLORS.CARD,
    paddingVertical: SPACING.SMALL,
    paddingHorizontal: SPACING.MEDIUM,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SMALL,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  streamingButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_DARK,
    fontWeight: '500',
  },
  streamingButtonSubtext: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
  },
  streamingIcon: {
    marginRight: SPACING.SMALL,
  },
  streamingTextContainer: {
    flex: 1,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MEDIUM,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: SPACING.MEDIUM,
  },
  progressSlider: {
    width: '100%',
    height: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_LIGHT,
  },
  qualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: SPACING.SMALL,
    borderRadius: 8,
  },
  qualityButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_LIGHT,
    marginRight: SPACING.SMALL,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.X_LARGE,
    color: COLORS.TEXT_LIGHT,
  },
  videoInfoContainer: {
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  videoInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  videoInfoIcon: {
    marginRight: 8,
  },
  videoInfoText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  videoPlayerContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  audioPlayerContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPosterImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9, // Make image more visible now that we don't have overlay text
  },
  audioPlaceholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  playPauseButton: {
    padding: 10,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});

export default EpisodeDetailScreen;
