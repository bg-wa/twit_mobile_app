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
import * as FileSystem from 'expo-file-system';
import apiService from '../services/api';
import { stripHtmlAndDecodeEntities } from '../utils/textUtils';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';

const { width, height } = Dimensions.get('window');

// Helper function to strip HTML tags from text
const stripHtmlTags = (html) => {
  return stripHtmlAndDecodeEntities(html);
};

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

  useEffect(() => {
    const fetchEpisodeDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const episodeData = await apiService.getEpisodeById(id);
        console.log('Episode data structure:', Object.keys(episodeData));
        
        // Find potential video fields
        const videoKeys = Object.keys(episodeData).filter(key => 
          key.includes('video') || key.includes('media') || key.includes('stream')
        );
        console.log('Potential video fields:', videoKeys);
        
        if (videoKeys.length > 0) {
          videoKeys.forEach(key => {
            console.log(`Field ${key}:`, episodeData[key]);
          });
        }
        
        console.log('Episode data received:', JSON.stringify(episodeData, null, 2).substring(0, 1000) + '...');
        setEpisode(episodeData);
        const url = getVideoUrl(episodeData);
        console.log('Video URL extracted:', url);
        setVideoUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching episode details:', err);
        setError('Failed to load episode details. Please try again.');
        setLoading(false);
      }
    };

    fetchEpisodeDetails();

    // Clean up orientation lock when component unmounts
    return () => {
      ScreenOrientation.unlockAsync();
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [id]);

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

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
    }
  };

  const handleWatchVideo = (url) => {
    if (!url) {
      Alert.alert('Error', 'No video URL available for this quality');
      return;
    }
    
    setVideoUrl(url);
    // Scroll up to the video player
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
    }
    
    // Start playing after a short delay to allow the video to load
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.playAsync();
        setIsPlaying(true);
      }
    }, 500);
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

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setCurrentTime(status.positionMillis);
      setDuration(status.durationMillis);
      
      // If video finished playing
      if (status.didJustFinish) {
        setIsPlaying(false);
        setShowControls(true);
      }
    }
  };

  const handleVideoPress = () => {
    // Toggle controls visibility when video is tapped
    setShowControls(!showControls);
    
    // Reset auto-hide timer
    if (!showControls) {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    }
  };

  const handleSeek = (value) => {
    if (videoRef.current) {
      videoRef.current.setPositionAsync(value);
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
    if (!episode) return null;
    
    console.log("Checking for video URL in episode:", episode.id);
    
    // Helper function to look for video URLs deeply in the object
    const findVideoUrlInObject = (obj, prefix = '') => {
      if (!obj || typeof obj !== 'object') return null;
      
      // Check direct video URL fields
      if (obj.mediaUrl && typeof obj.mediaUrl === 'string' && 
          (obj.mediaUrl.includes('.mp4') || obj.mediaUrl.includes('.mov'))) {
        console.log(`Found video URL in ${prefix}.mediaUrl:`, obj.mediaUrl);
        return obj.mediaUrl;
      }
      
      // Check for a URL property that might contain a video
      if (obj.url && typeof obj.url === 'string' && 
          (obj.url.includes('.mp4') || obj.url.includes('.mov'))) {
        console.log(`Found video URL in ${prefix}.url:`, obj.url);
        return obj.url;
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
    
    // Check standard naming variations
    const videoFields = [
      'video', 'videoUrl', 'videoURL', 'video_url', 'media', 
      'videos', 'stream', 'streams', 'hls', 'm3u8'
    ];
    
    for (const field of videoFields) {
      if (episode[field]) {
        // If it's a string, check if it's a video URL
        if (typeof episode[field] === 'string' && 
            (episode[field].includes('.mp4') || 
             episode[field].includes('.mov') ||
             episode[field].includes('.m3u8'))) {
          console.log(`Found video URL in ${field}:`, episode[field]);
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
      const videoEnclosure = episode.enclosures.find(e => 
        e.url && (e.type?.includes('video') || e.url.match(/\.(mp4|mov|wmv|avi|flv|webm|m3u8)$/i))
      );
      
      if (videoEnclosure) {
        console.log("Found video in enclosures:", videoEnclosure.url);
        return videoEnclosure.url;
      }
    }
    
    console.log("No video URL found for episode:", episode.id);
    return null;
  };

  // Render video player with custom controls
  const renderVideoPlayer = () => {
    console.log("Rendering video player with URL:", videoUrl);
    
    return (
      <View style={[styles.videoContainer, isFullscreen && styles.fullscreenContainer]}>
        <TouchableOpacity 
          activeOpacity={1}
          style={styles.videoWrapper}
          onPress={handleVideoPress}
        >
          {videoUrl ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode={isFullscreen ? ResizeMode.CONTAIN : ResizeMode.COVER}
              shouldPlay={false}
              isLooping={false}
              style={styles.video}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
              useNativeControls={true} // Use native controls for testing
              posterSource={extractImageUrl(episode) ? { uri: extractImageUrl(episode) } : undefined}
              usePoster={true}
            />
          ) : (
            <View style={styles.noVideoContainer}>
              <Text style={styles.noVideoText}>No video available</Text>
            </View>
          )}
          
          {/* For now, we'll use native controls instead of custom ones */}
          {false && showControls && (
            <View style={styles.controlsOverlay}>
              <View style={styles.topControls}>
                <View style={styles.qualityContainer}>
                  <TouchableOpacity 
                    style={styles.qualityButton}
                    onPress={() => setShowQualityOptions(!showQualityOptions)}
                  >
                    <Text style={styles.qualityText}>{playbackQuality}</Text>
                    <Ionicons name="chevron-down" size={16} color="#fff" />
                  </TouchableOpacity>
                  
                  {showQualityOptions && (
                    <View style={styles.qualityOptions}>
                      {availableQualities.map((quality) => (
                        <TouchableOpacity
                          key={quality}
                          style={[
                            styles.qualityOption,
                            playbackQuality === quality && styles.selectedQuality
                          ]}
                          onPress={() => changeQuality(quality)}
                        >
                          <Text style={styles.qualityOptionText}>{quality}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={styles.fullscreenButton}
                  onPress={toggleFullscreen}
                >
                  <Ionicons 
                    name={isFullscreen ? "contract-outline" : "expand-outline"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.centerControls}>
                <TouchableOpacity 
                  style={styles.playPauseButton}
                  onPress={togglePlayPause}
                >
                  <Ionicons 
                    name={isPlaying ? "pause" : "play"} 
                    size={50} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.bottomControls}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <View style={styles.seekBarContainer}>
                  <View style={styles.seekBarBackground} />
                  <View 
                    style={[
                      styles.seekBarProgress, 
                      { 
                        width: duration ? 
                          `${(currentTime / duration) * 100}%` : '0%' 
                      }
                    ]} 
                  />
                  <Slider
                    style={styles.seekBarInput}
                    minimumValue={0}
                    maximumValue={duration}
                    value={currentTime}
                    onValueChange={(value) => handleSeek(value)}
                    minimumTrackTintColor="#ff0000"
                    maximumTrackTintColor="#fff"
                  />
                  <View 
                    style={[
                      styles.seekBarKnob, 
                      { 
                        left: duration ? 
                          `${(currentTime / duration) * 100}%` : '0%' 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // State for collapsible sections
  const [showNotesExpanded, setShowNotesExpanded] = useState(false);
  const [relatedLinksExpanded, setRelatedLinksExpanded] = useState(false);
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [streamingExpanded, setStreamingExpanded] = useState(true); // Default expanded
  const [downloadExpanded, setDownloadExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Animated values for rotations
  const showNotesRotation = useRef(new Animated.Value(0)).current;
  const relatedLinksRotation = useRef(new Animated.Value(0)).current;
  const filesRotation = useRef(new Animated.Value(0)).current;
  const streamingRotation = useRef(new Animated.Value(1)).current; // Default expanded
  const downloadRotation = useRef(new Animated.Value(0)).current;

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

  const downloadVideo = async (url, quality) => {
    if (!url) {
      Alert.alert('Error', `No ${quality} video available for this episode`);
      return;
    }
    
    try {
      setDownloading(true);
      setDownloadProgress(0);
      
      // Generate a safe filename from episode title
      const safeFileName = episode.title
        ? episode.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : 'twit_video';
      
      const fileUri = FileSystem.documentDirectory + 
        `${safeFileName}_${quality}_${Date.now()}.mp4`;
      
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );

      const download = await downloadResumable.downloadAsync();
      setDownloading(false);
      
      if (download && download.uri) {
        console.log('Download complete:', download.uri);
        Alert.alert(
          'Download Complete', 
          'Video saved to your device. You can access it from the Files app.',
          [
            {
              text: 'OK',
              onPress: () => {
                setDownloadProgress(0);
              }
            }
          ]
        );
      } else {
        throw new Error('Download failed');
      }
    } catch (err) {
      setDownloading(false);
      console.error('Error downloading video:', err);
      Alert.alert('Error Downloading Video', err.message);
    }
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
          <View style={{flex: 1}}>
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
        
        <CollapsibleSection 
          title="Streaming" 
          expanded={streamingExpanded} 
          setExpanded={setStreamingExpanded} 
          rotation={streamingRotation}
        >
          <View style={styles.streamingOptions}>
            <TouchableOpacity 
              style={styles.streamingOption}
              onPress={() => handleWatchVideo(episode.video_hd?.mediaUrl)}
            >
              <Ionicons name="videocam" size={24} color="#2176FF" />
              <Text style={styles.streamingOptionText}>HD Quality</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.streamingOption}
              onPress={() => handleWatchVideo(episode.video_large?.mediaUrl)}
            >
              <Ionicons name="videocam" size={24} color="#2176FF" />
              <Text style={styles.streamingOptionText}>Large Quality</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.streamingOption}
              onPress={() => handleWatchVideo(episode.video_small?.mediaUrl)}
            >
              <Ionicons name="videocam" size={24} color="#2176FF" />
              <Text style={styles.streamingOptionText}>Small Quality</Text>
            </TouchableOpacity>
          </View>
        </CollapsibleSection>
        
        <CollapsibleSection 
          title="Download" 
          expanded={downloadExpanded} 
          setExpanded={setDownloadExpanded} 
          rotation={downloadRotation}
        >
          <View style={styles.downloadOptions}>
            <TouchableOpacity 
              style={styles.downloadOption}
              onPress={() => downloadVideo(episode.video_hd?.mediaUrl, 'HD')}
              disabled={downloading}
            >
              <Ionicons name="cloud-download" size={24} color="#33A1FD" />
              <Text style={styles.downloadOptionText}>HD Quality</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.downloadOption}
              onPress={() => downloadVideo(episode.video_large?.mediaUrl, 'Large')}
              disabled={downloading}
            >
              <Ionicons name="cloud-download" size={24} color="#33A1FD" />
              <Text style={styles.downloadOptionText}>Large Quality</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.downloadOption}
              onPress={() => downloadVideo(episode.video_small?.mediaUrl, 'Small')}
              disabled={downloading}
            >
              <Ionicons name="cloud-download" size={24} color="#33A1FD" />
              <Text style={styles.downloadOptionText}>Small Quality</Text>
            </TouchableOpacity>
            {downloading && (
              <View style={styles.downloadProgressContainer}>
                <ActivityIndicator size="small" color={COLORS.CTA} />
                <Text style={styles.downloadProgressText}>
                  Downloading... {Math.floor(downloadProgress * 100)}%
                </Text>
              </View>
            )}
          </View>
        </CollapsibleSection>
        
        {episode.showNotes && (
          <CollapsibleSection 
            title="Show Notes" 
            expanded={showNotesExpanded} 
            setExpanded={setShowNotesExpanded} 
            rotation={showNotesRotation}
          >
            <Text style={styles.contentText}>{stripHtmlTags(episode.showNotes)}</Text>
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
            setExpanded={() => {}} 
            rotation={new Animated.Value(0)}
          >
            <Text style={styles.contentText}>{stripHtmlTags(episode.description)}</Text>
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
    aspectRatio: 16/9,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    position: 'relative',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: width * (16/9),
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
  streamingOption: {
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
  streamingOptionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_DARK,
    fontWeight: '500',
  },
  downloadOptions: {
    flexDirection: 'column',
    padding: SPACING.MEDIUM,
    gap: SPACING.MEDIUM,
  },
  downloadOption: {
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
  downloadOptionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_DARK,
    fontWeight: '500',
  },
  downloadProgressContainer: {
    padding: SPACING.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.SMALL,
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginTop: SPACING.SMALL,
  },
  downloadProgressText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_DARK,
    fontWeight: '500',
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
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MEDIUM,
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: SPACING.SMALL,
    borderRadius: 8,
  },
  qualityText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_LIGHT,
    marginRight: SPACING.SMALL,
  },
  qualityOptions: {
    position: 'absolute',
    top: 40,
    left: 0,
    backgroundColor: COLORS.CARD,
    padding: SPACING.SMALL,
    borderRadius: 8,
    zIndex: 1,
  },
  qualityOption: {
    padding: SPACING.SMALL,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  selectedQuality: {
    backgroundColor: COLORS.BORDER,
  },
  qualityOptionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_DARK,
  },
  fullscreenButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: SPACING.SMALL,
    borderRadius: 8,
  },
  centerControls: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: SPACING.MEDIUM,
    borderRadius: 16,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MEDIUM,
  },
  timeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_LIGHT,
  },
  seekBarContainer: {
    flex: 1,
    marginHorizontal: SPACING.MEDIUM,
  },
  seekBarBackground: {
    height: 4,
    backgroundColor: COLORS.TEXT_LIGHT,
    borderRadius: 2,
  },
  seekBarProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 2,
  },
  seekBarInput: {
    width: '100%',
    height: 20,
  },
  seekBarKnob: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
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
});

export default EpisodeDetailScreen;
