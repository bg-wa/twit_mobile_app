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
  SafeAreaView,
  Animated,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';
import { stripHtmlAndDecodeEntities } from '../utils/textUtils';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';

// Legacy function for backward compatibility
const stripHtmlTags = (html) => {
  return stripHtmlAndDecodeEntities(html);
};

const PersonDetailScreen = ({ route, navigation }) => {
  const { personId } = route.params;
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Episodes section state
  const [episodesExpanded, setEpisodesExpanded] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [episodesError, setEpisodesError] = useState(null);
  const [episodesLoaded, setEpisodesLoaded] = useState(false);
  const episodesRotation = useRef(new Animated.Value(0)).current;

  // Related Links section state
  const [linksExpanded, setLinksExpanded] = useState(false);
  const linksRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchPersonDetails();
  }, [personId]);
  
  const toggleEpisodesSection = () => {
    if (episodesExpanded) {
      Animated.timing(episodesRotation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Load episodes on first expand
      if (!episodesLoaded) {
        fetchPersonEpisodes();
        setEpisodesLoaded(true);
      }
      
      Animated.timing(episodesRotation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    
    setEpisodesExpanded(!episodesExpanded);
  };

  const toggleLinksSection = () => {
    if (linksExpanded) {
      Animated.timing(linksRotation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(linksRotation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    
    setLinksExpanded(!linksExpanded);
  };

  const fetchPersonDetails = async () => {
    setLoading(true);
    try {
      const personData = await apiService.getPersonById(personId);
      setPerson(personData.people);
      
      // Set the screen title to the person's name
      if (personData.people && personData.people.label) {
        navigation.setOptions({ title: personData.people.label });
      }
    } catch (err) {
      console.error('Error fetching person details:', err);
      setError('Failed to load person details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonEpisodes = async () => {
    if (episodesLoading) return;
    
    setEpisodesLoading(true);
    setEpisodesError(null);
    
    try {
      const episodesData = await apiService.getEpisodesByPersonId(personId);
      setEpisodes(episodesData);
    } catch (err) {
      console.error('Error fetching person episodes:', err);
      setEpisodesError('Failed to load episodes');
    } finally {
      setEpisodesLoading(false);
    }
  };

  const navigateToEpisode = (episode) => {
    navigation.navigate('EpisodeDetail', { 
      id: episode.id,
      title: episode.label || 'Episode Details'
    });
  };

  // Helper function to extract image URL from episode
  const extractEpisodeImageUrl = (episode) => {
    if (!episode) return null;
    
    // Try to get from heroImage
    if (episode.heroImage) {
      // Try different derivative sizes
      if (episode.heroImage.derivatives) {
        return episode.heroImage.derivatives.thumbnail || 
               episode.heroImage.derivatives.twit_album_art_600x600 ||
               episode.heroImage.url;
      }
      return episode.heroImage.url;
    }
    
    return null;
  };

  const renderEpisodeItem = ({ item }) => {
    // Extract image URL
    const imageUrl = extractEpisodeImageUrl(item);
    
    return (
      <TouchableOpacity
        style={styles.episodeItem}
        onPress={() => navigateToEpisode(item)}
      >
        <View style={styles.episodeImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.episodeImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderEpisodeImage}>
              <Text style={styles.placeholderEpisodeText}>
                {(item.label || 'E').charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.episodeInfo}>
          <Text style={styles.episodeTitle} numberOfLines={2}>
            {item.label || 'Untitled Episode'}
          </Text>
          
          <View style={styles.episodeMetaRow}>
            {item.episodeNumber && (
              <View style={styles.episodeNumberBadge}>
                <Text style={styles.episodeNumberText}>
                  {item.seasonNumber ? `S${item.seasonNumber}:E${item.episodeNumber}` : `EP ${item.episodeNumber}`}
                </Text>
              </View>
            )}
            <Text style={styles.episodeDate}>
              {item.airingDate ? new Date(item.airingDate).toLocaleDateString() : 'Unknown date'}
            </Text>
            
            {item.embedded && item.embedded.shows && item.embedded.shows[0] && (
              <Text style={styles.episodeShow}>
                {item.embedded.shows[0].label}
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
        <View style={styles.episodeChevronContainer}>
          <Ionicons name="chevron-forward" size={16} color="#adb5bd" />
        </View>
      </TouchableOpacity>
    );
  };

  const handleRelatedLinkPress = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Error opening URL:', err);
      });
    }
  };

  const renderEpisodesSection = () => {
    const rotateInterpolation = episodesRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    return (
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={[
            styles.sectionHeader,
            { borderBottomWidth: episodesExpanded ? 1 : 0 }
          ]} 
          onPress={toggleEpisodesSection}
        >
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="tv-outline" size={20} color="#f03e3e" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Episodes</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
            <Ionicons name="chevron-down" size={20} color="#6c757d" />
          </Animated.View>
        </TouchableOpacity>
        
        {episodesExpanded && (
          <View style={styles.episodesContainer}>
            {episodesLoading ? (
              <View style={styles.episodesLoadingContainer}>
                <ActivityIndicator size="small" color={COLORS.CTA} />
                <Text style={styles.episodesLoadingText}>Loading episodes...</Text>
              </View>
            ) : episodesError ? (
              <View style={styles.episodesErrorContainer}>
                <Text style={styles.episodesErrorText}>{episodesError}</Text>
                <TouchableOpacity 
                  style={styles.episodesRetryButton}
                  onPress={fetchPersonEpisodes}
                >
                  <Text style={styles.episodesRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : episodes.length === 0 ? (
              <Text style={styles.noEpisodesText}>No episodes found for this person</Text>
            ) : (
              <FlatList
                data={episodes}
                renderItem={renderEpisodeItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                contentContainerStyle={styles.episodesList}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.CTA} />
        <Text style={styles.loadingText}>Loading person details...</Text>
      </View>
    );
  }

  if (error || !person) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#f03e3e" />
        <Text style={styles.errorText}>{error || 'Failed to load person'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPersonDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = person.picture?.derivatives?.twit_album_art_600x600 || 
                   person.picture?.url || 
                   null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.personImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>
                  {person.label ? person.label.substring(0, 2).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={styles.personName}>{person.label}</Text>
            {person.positionTitle && (
              <Text style={styles.personRole}>{person.positionTitle}</Text>
            )}
            {person.staff && (
              <View style={styles.staffBadge}>
                <Ionicons name="star" size={14} color="#fff" style={styles.staffIcon} />
                <Text style={styles.staffText}>TWiT Staff</Text>
              </View>
            )}
          </View>
        </View>

        {person.bio && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Biography</Text>
            <Text style={styles.bioText}>{stripHtmlAndDecodeEntities(person.bio)}</Text>
          </View>
        )}

        {/* Add the Episodes section */}
        {renderEpisodesSection()}

        {person.relatedLinks && Array.isArray(person.relatedLinks) && person.relatedLinks.length > 0 && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity 
              style={[
                styles.sectionHeader, 
                { borderBottomWidth: linksExpanded ? 1 : 0 }
              ]} 
              onPress={toggleLinksSection}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="link" size={20} color="#f03e3e" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Related Links</Text>
              </View>
              <Animated.View style={{ 
                transform: [{ 
                  rotate: linksRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  })
                }] 
              }}>
                <Ionicons name="chevron-down" size={20} color="#6c757d" />
              </Animated.View>
            </TouchableOpacity>
            
            {linksExpanded && (
              <View style={styles.linksContainer}>
                {person.relatedLinks.map((link, index) => (
                  <TouchableOpacity 
                    key={`link-${index}`}
                    style={styles.linkButton}
                    onPress={() => handleRelatedLinkPress(link.url)}
                  >
                    <Ionicons name="link" size={16} color="#f03e3e" />
                    <Text style={styles.linkText}>{link.title || link.url}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  contentContainer: {
    padding: SPACING.MEDIUM,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: SPACING.SMALL,
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
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
    marginTop: SPACING.MEDIUM,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.LARGE,
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    backgroundColor: COLORS.SECONDARY,
    borderRadius: 5,
  },
  retryButtonText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '600',
  },
  headerContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.LARGE,
  },
  imageContainer: {
    marginRight: SPACING.MEDIUM,
  },
  personImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.BORDER,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.X_LARGE,
    color: COLORS.TEXT_LIGHT,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  personName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.X_LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
    marginBottom: SPACING.SMALL / 2,
  },
  personRole: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    marginBottom: SPACING.SMALL,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.SMALL,
    paddingVertical: SPACING.SMALL / 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  staffIcon: {
    marginRight: 4,
  },
  staffText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_LIGHT,
    fontWeight: '500',
  },
  sectionContainer: {
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
    marginBottom: SPACING.MEDIUM,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MEDIUM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: SPACING.SMALL,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  bioText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    lineHeight: 22,
    padding: SPACING.MEDIUM,
  },
  episodesContainer: {
    padding: SPACING.MEDIUM,
  },
  episodesList: {
    paddingBottom: 0,
  },
  episodesLoadingContainer: {
    padding: SPACING.MEDIUM,
    alignItems: 'center',
  },
  episodesLoadingText: {
    marginTop: SPACING.SMALL,
    color: COLORS.TEXT_MEDIUM,
  },
  episodesErrorContainer: {
    padding: SPACING.MEDIUM,
    alignItems: 'center',
  },
  episodesErrorText: {
    color: COLORS.ERROR,
    marginBottom: SPACING.MEDIUM,
  },
  episodesRetryButton: {
    paddingHorizontal: SPACING.SMALL,
    paddingVertical: SPACING.SMALL / 2,
    backgroundColor: COLORS.SECONDARY,
    borderRadius: 5,
  },
  episodesRetryText: {
    color: COLORS.TEXT_LIGHT,
  },
  noEpisodesText: {
    color: COLORS.TEXT_MEDIUM,
    textAlign: 'center',
    padding: SPACING.MEDIUM,
  },
  episodeItem: {
    flexDirection: 'row',
    padding: SPACING.MEDIUM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  episodeImageContainer: {
    marginRight: SPACING.MEDIUM,
  },
  episodeImage: {
    width: 80,
    height: 45,
    borderRadius: 4,
    backgroundColor: COLORS.BORDER,
  },
  episodeContent: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  episodeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
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
    marginBottom: 2,
  },
  episodeDate: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
    marginRight: SPACING.SMALL,
    marginBottom: 2,
  },
  episodeShow: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.SECONDARY,
    marginBottom: 2,
  },
  episodeDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
    marginTop: 2,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MEDIUM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  linkText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.SECONDARY,
    marginLeft: SPACING.SMALL,
  },
  linksContainer: {
    paddingTop: SPACING.SMALL,
  },
});

export default PersonDetailScreen;
