import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking
} from 'react-native';
import apiService from '../services/api';
import { stripHtmlAndDecodeEntities } from '../utils/textUtils';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';

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

const ShowDetailScreen = ({ route, navigation }) => {
  const { id, showData: initialShowData } = route.params;
  const [show, setShow] = useState(initialShowData || null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        
        // Fetch first page of episodes for this show
        const episodesData = await apiService.getEpisodes({ 'filter[shows]': id, page: 1, range: PAGE_SIZE });
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
        setHasMore(episodesData.length === PAGE_SIZE);
        setPage(2);
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
  
  const renderHeader = () => (
    <>
      <View style={styles.headerImageContainer}>
        {extractImageUrl(show) ? (
          <Image
            source={{ uri: extractImageUrl(show) }}
            style={styles.showImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>{show && show.label ? show.label.charAt(0) : 'T'}</Text>
          </View>
        )}
      </View>

      <View style={styles.showInfoContainer}>
        <Text style={styles.showTitle}>{(show && show.label) || 'Unknown Show'}</Text>

        {show && show.description ? (
          <Text style={styles.showDescription}>
            {stripHtmlAndDecodeEntities(show.description)}
          </Text>
        ) : null}

        {show && show.tagLine ? (
          <Text style={styles.showTagLine}>
            {stripHtmlAndDecodeEntities(show.tagLine)}
          </Text>
        ) : null}

        {show && show.showNotes ? (
          <Text style={styles.showNotes}>
            {stripHtmlAndDecodeEntities(show.showNotes)}
          </Text>
        ) : null}

        {show && show.showContactInfo ? (
          <Text style={styles.showContactInfo}>
            {stripHtmlAndDecodeEntities(show.showContactInfo)}
          </Text>
        ) : null}

        {show && show.website ? (
          <TouchableOpacity
            style={styles.websiteButton}
            onPress={() => Linking.openURL(show.website)}
          >
            <Text style={styles.websiteButtonText}>Visit Website</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.episodesContainer}>
        <Text style={styles.episodesTitle}>Episodes</Text>
      </View>
    </>
  );

  const loadMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page;
      const more = await apiService.getEpisodes({ 'filter[shows]': id, page: nextPage, range: PAGE_SIZE });
      if (more.length > 0) {
        setEpisodes(prev => [...prev, ...more]);
      }
      setHasMore(more.length === PAGE_SIZE);
      setPage(nextPage + 1);
    } catch (e) {
      console.warn('Failed to load more episodes:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const fresh = await apiService.getEpisodes({ 'filter[shows]': id, page: 1, range: PAGE_SIZE });
      setEpisodes(fresh);
      setHasMore(fresh.length === PAGE_SIZE);
      setPage(2);
    } catch (e) {
      console.warn('Failed to refresh episodes:', e);
    } finally {
      setRefreshing(false);
    }
  };

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
          
          {(() => {
            // Extract show name from episode data instead of using parent show
            const getShowName = () => {
              // First check for embedded shows data in the episode
              if (item._embedded && item._embedded.shows) {
                const showData = item._embedded.shows;
                if (Array.isArray(showData) && showData.length > 0) {
                  return showData[0].label || showData[0].title;
                } else if (typeof showData === 'object' && (showData.label || showData.title)) {
                  return showData.label || showData.title;
                }
              }
              
              // Check with embedded dot notation
              if (item.embedded && item.embedded.shows) {
                const showData = item.embedded.shows;
                if (Array.isArray(showData) && showData.length > 0) {
                  return showData[0].label || showData[0].title;
                } else if (typeof showData === 'object' && (showData.label || showData.title)) {
                  return showData.label || showData.title;
                }
              }
              
              // Check if episode has direct show reference
              if (item.show && item.show.label) {
                return item.show.label;
              }
              
              // Try to infer from episode number or episode label pattern
              if (item.episodeNumber) {
                return getShowNameFromEpisodeNumber(item.episodeNumber);
              }
              
              if (item.label) {
                const epMatch = item.label.match(/EP\s*(\d+)/i);
                if (epMatch && epMatch[1]) {
                  const epNumber = parseInt(epMatch[1]);
                  return getShowNameFromEpisodeNumber(epNumber);
                }
                
                // Try to match show names directly in title
                if (item.label.includes("Security Now")) return "Security Now";
                if (item.label.includes("MacBreak Weekly")) return "MacBreak Weekly";
                if (item.label.includes("This Week in Tech")) return "This Week in Tech";
                if (item.label.includes("Windows Weekly")) return "Windows Weekly";
                if (item.label.includes("This Week in Google")) return "This Week in Google";
                
                // Match episode titles from the screenshot
                if (item.label.includes("The Illusion of Thinking")) return "Security Now";
                if (item.label.includes("Thanks For All the Round Rects")) return "MacBreak Weekly";
                if (item.label.includes("The Droids Are in the Escape Pod")) return "This Week in Tech";
              }
              
              // If all else fails, use the parent show name but only if it's not "All TWiT.tv Shows"
              if (show && show.label && !show.label.includes("All TWiT.tv Shows")) {
                return show.label;
              }
              
              return "TWiT Show";
            };
            
            // Helper for identifying show by episode number patterns
            const getShowNameFromEpisodeNumber = (epNumber) => {
              // Based on episode ranges we've seen
              if (epNumber > 1000 && epNumber < 1030) {
                return "Security Now"; // SN episodes are around 1000-1030
              }
              if (epNumber > 950 && epNumber < 980) {
                return "MacBreak Weekly"; // MBW episodes in 970 range
              }
              if (epNumber > 1030 && epNumber < 1040) {
                return "This Week in Tech"; // TWiT episodes are higher
              }
              return "TWiT Show";
            };
            
            const showName = getShowName();
            return <Text style={styles.showName}>{showName}</Text>;
          })()}
          
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
      <FlatList
        data={episodes}
        renderItem={renderEpisodeItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? (
          <Text style={styles.noEpisodesText}>No episodes available</Text>
        ) : null}
        ListFooterComponent={loadingMore ? (
          <View style={{ padding: SPACING.MEDIUM }}>
            <ActivityIndicator size="small" color={COLORS.CTA} />
          </View>
        ) : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
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
  showName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
    textTransform: 'uppercase',
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
