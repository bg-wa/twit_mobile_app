import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking
} from 'react-native';
import apiService from '../services/api';
import { stripHtmlAndDecodeEntities, decodeHtmlEntities } from '../utils/textUtils';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const extractImageUrl = (show) => {
  if (show.coverArt) {
    // If coverArt is an object with derivatives, use the appropriate size
    if (show.coverArt.derivatives && show.coverArt.derivatives.twit_album_art_600x600) {
      return show.coverArt.derivatives.twit_album_art_600x600;
    } else if (show.coverArt.url) {
      return show.coverArt.url;
    }
  } 
  
  // Fallback to the image property if it's a string
  if (typeof show.image === 'string') {
    return show.image;
  }
  
  return null;
};

const extractEpisodeImageUrl = (episode) => {
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

const ShowDetailScreen = ({ route, navigation }) => {
  const { id, showData: initialShowData } = route.params;
  const [show, setShow] = useState(initialShowData || null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShowDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch show details
        console.log('Fetching show with ID:', id);
        const showData = await apiService.getShowById(id);
        console.log('Show data received:', JSON.stringify(showData));
        
        // Only update if we got valid show data 
        if (showData && Object.keys(showData).length > 0) {
          setShow(showData);
        } else if (!initialShowData) {
          setError('Could not load show details. Invalid data received.');
        }
        
        // Fetch episodes for this show
        const episodesData = await apiService.getEpisodes({ 'filter[shows]': id });
        console.log('Episodes count:', episodesData.length);
        
        // Log first episode data for debugging
        if (episodesData.length > 0) {
          console.log('First episode data sample:', JSON.stringify({
            id: episodesData[0].id,
            title: episodesData[0].label,
            hasHeroImage: !!episodesData[0].heroImage,
            hasCoverArt: !!episodesData[0].coverArt,
            heroImageUrl: episodesData[0].heroImage ? 
              (episodesData[0].heroImage.derivatives ? 
                episodesData[0].heroImage.derivatives.twit_album_art_300x300 : 
                episodesData[0].heroImage.url) : null
          }));
        }
        
        setEpisodes(episodesData);
      } catch (err) {
        console.error('Error fetching show details:', err);
        if (!initialShowData) {
          setError(`Failed to load show details: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchShowDetails();
  }, [id, initialShowData]);

  const renderEpisodeItem = ({ item }) => {
    const imageUrl = extractEpisodeImageUrl(item);
    
    // Extract running time from the first available video quality
    const runningTime = 
      (item.video_hd && item.video_hd.runningTime) || 
      (item.video_large && item.video_large.runningTime) || 
      (item.video_small && item.video_small.runningTime) ||
      (item.video_audio && item.video_audio.runningTime);
    
    return (
      <TouchableOpacity
        style={styles.episodeItem}
        onPress={() => navigation.navigate('EpisodeDetail', { 
          id: item.id, 
          title: item.label || 'Episode Details',
          showId: show.id
        })}
      >
        <View style={styles.episodeImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.episodeImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.episodePlaceholderImage}>
              <Text style={styles.episodePlaceholderText}>{(item.label || show.label || 'E').charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.episodeInfo}>
          {/* Episode number moved above title */}
          {item.episodeNumber && (
            <View style={styles.episodeNumberRow}>
              <View style={styles.episodeNumberBadge}>
                <Text style={styles.episodeNumberText}>
                  {item.seasonNumber ? `S${item.seasonNumber}:E${item.episodeNumber}` : `EP ${item.episodeNumber}`}
                </Text>
              </View>
            </View>
          )}
          
          <Text style={styles.episodeTitle} numberOfLines={2}>{item.label || 'Untitled Episode'}</Text>
          
          <View style={styles.episodeMetaRow}>
            {item.airingDate && (
              <Text style={[styles.episodeDate, { marginLeft: 0 }]}>
                {new Date(item.airingDate).toLocaleDateString()}
                {runningTime && (
                  <Text style={styles.episodeRunningTime}>{" • "}{runningTime}</Text>
                )}
              </Text>
            )}
          </View>
          
          {item.teaser ? (
            <Text style={styles.episodeDescription} numberOfLines={2}>
              {stripHtmlAndDecodeEntities(item.teaser)}
            </Text>
          ) : item.description ? (
            <Text style={styles.episodeDescription} numberOfLines={2}>
              {stripHtmlAndDecodeEntities(item.description)}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.CTA} />
        <Text style={styles.loadingText}>Loading show details...</Text>
      </View>
    );
  }

  if (error || !show) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Failed to load show details.'}</Text>
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
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.headerImageContainer}>
          {extractImageUrl(show) ? (
            <Image
              source={{ uri: extractImageUrl(show) }}
              style={styles.showImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>{show.label ? show.label.charAt(0) : 'T'}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.showInfoContainer}>
          <Text style={styles.showTitle}>{show.label || 'Unknown Show'}</Text>
          
          {show.description && (
            <Text style={styles.showDescription}>
              {stripHtmlAndDecodeEntities(show.description)}
            </Text>
          )}
          
          {show.tagLine && (
            <Text style={styles.showTagLine}>
              {stripHtmlAndDecodeEntities(show.tagLine)}
            </Text>
          )}
          
          {show.showNotes && (
            <Text style={styles.showNotes}>
              {stripHtmlAndDecodeEntities(show.showNotes)}
            </Text>
          )}
          
          {show.showContactInfo && (
            <Text style={styles.showContactInfo}>
              {stripHtmlAndDecodeEntities(show.showContactInfo)}
            </Text>
          )}
          
          {show.website && (
            <TouchableOpacity
              style={styles.websiteButton}
              onPress={() => Linking.openURL(show.website)}
            >
              <Text style={styles.websiteButtonText}>Visit Website</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.episodesContainer}>
          <Text style={styles.episodesTitle}>Episodes</Text>
          
          {episodes.length > 0 ? (
            <FlatList
              data={episodes}
              renderItem={renderEpisodeItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noEpisodesText}>No episodes available</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  headerImageContainer: {
    width: '100%',
    aspectRatio: 16/9,
    overflow: 'hidden',
    marginBottom: 15,
  },
  showImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.PRIMARY_LIGHT,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
  },
  showInfoContainer: {
    padding: SPACING.MEDIUM,
    backgroundColor: COLORS.CARD,
  },
  showTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XXX_LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
    marginBottom: SPACING.SMALL,
  },
  showDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    lineHeight: 22,
    marginBottom: SPACING.MEDIUM,
  },
  showTagLine: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    lineHeight: 22,
    marginBottom: SPACING.MEDIUM,
  },
  showNotes: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    lineHeight: 22,
    marginBottom: SPACING.MEDIUM,
  },
  showContactInfo: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    lineHeight: 22,
    marginBottom: SPACING.MEDIUM,
  },
  websiteButton: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: SPACING.SMALL,
    paddingHorizontal: SPACING.MEDIUM,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  websiteButtonText: {
    color: COLORS.TEXT_LIGHT,
    fontWeight: '600',
  },
  episodesContainer: {
    padding: SPACING.MEDIUM,
    marginTop: SPACING.MEDIUM,
  },
  episodesTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.X_LARGE,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: SPACING.MEDIUM,
  },
  episodeItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
    marginBottom: SPACING.MEDIUM,
    padding: SPACING.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  episodeImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: SPACING.MEDIUM,
  },
  episodeImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.BORDER,
  },
  episodePlaceholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodePlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_LIGHT,
  },
  episodeInfo: {
    flex: 1,
    padding: SPACING.MEDIUM,
  },
  episodeTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: SPACING.SMALL / 2,
  },
  episodeNumberRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  episodeNumberBadge: {
    backgroundColor: COLORS.CTA,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  episodeDate: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    marginRight: 8,
  },
  episodeRunningTime: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  episodeDescription: {
    fontSize: 13,
    color: COLORS.TEXT_MEDIUM,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    marginTop: SPACING.SMALL,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.LARGE,
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
  noEpisodesText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    textAlign: 'center',
    padding: SPACING.MEDIUM,
  },
});

export default ShowDetailScreen;
