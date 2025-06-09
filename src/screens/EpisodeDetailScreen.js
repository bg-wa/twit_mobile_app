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
  Animated
} from 'react-native';
import { Video } from 'expo-av';
import apiService from '../services/api';
import { Ionicons } from '@expo/vector-icons';

// Helper function to strip HTML tags from text
const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
};

// Collapsible Section Component
const CollapsibleSection = ({ title, children, initiallyExpanded = false }) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [height] = useState(new Animated.Value(initiallyExpanded ? 1000 : 0));
  const [rotation] = useState(new Animated.Value(initiallyExpanded ? 1 : 0));

  const toggleExpand = () => {
    if (expanded) {
      Animated.parallel([
        Animated.timing(height, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(rotation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(height, {
          toValue: 1000,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(rotation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
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
      <Animated.View 
        style={[
          styles.collapsibleContent,
          { height, overflow: 'hidden' }
        ]}
      >
        {children}
      </Animated.View>
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
  const [videoStatus, setVideoStatus] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchEpisodeDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch episode details
        console.log('Fetching episode with ID:', id);
        const episodeData = await apiService.getEpisodeById(id);
        console.log('Episode data received:', JSON.stringify(episodeData, null, 2).substring(0, 500) + '...');
        setEpisode(episodeData);
      } catch (err) {
        setError('Failed to load episode details.');
        console.error('Error fetching episode details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodeDetails();
  }, [id]);

  const handlePlaybackStatusUpdate = (status) => {
    setVideoStatus(status);
    setIsPlaying(status.isPlaying);
  };

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
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Error opening URL:', err);
      });
    }
  };

  // Determine video URL from episode data
  const getVideoUrl = (episode) => {
    if (!episode) return null;
    
    // Check for direct video URLs first
    if (episode.videoUrl) return episode.videoUrl;
    
    // Check for enclosures that might contain video
    if (episode.enclosures && episode.enclosures.length > 0) {
      const videoEnclosure = episode.enclosures.find(e => 
        e.url && (e.mimeType?.includes('video') || e.url.includes('.mp4'))
      );
      if (videoEnclosure) return videoEnclosure.url;
    }
    
    // YouTube URL if available
    if (episode.youtubeUrl) return episode.youtubeUrl;
    
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff0000" />
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

  const videoUrl = getVideoUrl(episode);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        {videoUrl ? (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode="contain"
              shouldPlay={false}
              isLooping={false}
              style={styles.video}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              useNativeControls={true}
            />
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
        
        {episode.showNotes && (
          <CollapsibleSection title="Show Notes">
            <Text style={styles.contentText}>{stripHtmlTags(episode.showNotes)}</Text>
          </CollapsibleSection>
        )}
        
        {episode.relatedLinks && episode.relatedLinks.length > 0 && (
          <CollapsibleSection title="Related Links">
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
          <CollapsibleSection title="Files">
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
          <CollapsibleSection title="Full Description">
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: '#000',
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
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  episodeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  episodeDate: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 16,
  },
  episodeDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 20,
  },
  watchButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  listenButton: {
    backgroundColor: '#0066cc',
  },
  watchButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notesContainer: {
    marginTop: 20,
    marginBottom: 16,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
  },
  creditsContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  creditsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  creditItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  creditRole: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  creditPerson: {
    fontSize: 16,
    color: '#666666',
  },
  topicsContainer: {
    marginTop: 20,
  },
  topicsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicTag: {
    backgroundColor: '#eeeeee',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  topicText: {
    color: '#666666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  collapsibleContainer: {
    marginBottom: 16,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  collapsibleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  collapsibleContent: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  contentText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  linksList: {
    flexDirection: 'column',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  linkText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 8,
  },
  filesList: {
    flexDirection: 'column',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  fileText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 8,
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  episodeNumberBadge: {
    backgroundColor: '#eeeeee',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  episodeNumberText: {
    fontSize: 16,
    color: '#666666',
  },
});

export default EpisodeDetailScreen;
