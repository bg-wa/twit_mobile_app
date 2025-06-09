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

const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
};

const PersonDetailScreen = ({ route, navigation }) => {
  const { personId } = route.params;
  const [person, setPerson] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [episodesError, setEpisodesError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for collapsible section
  const [episodesExpanded, setEpisodesExpanded] = useState(false);
  const episodesRotation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    fetchPersonDetails();
  }, [personId]);
  
  const toggleEpisodesSection = () => {
    Animated.timing(episodesRotation, {
      toValue: episodesExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setEpisodesExpanded(!episodesExpanded);
    
    // Fetch episodes if expanding for the first time and we don't have episodes yet
    if (!episodesExpanded && episodes.length === 0 && !episodesLoading) {
      fetchPersonEpisodes();
    }
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
              {stripHtmlTags(item.teaser)}
            </Text>
          ) : item.description ? (
            <Text style={styles.episodeDescription} numberOfLines={2}>
              {stripHtmlTags(item.description)}
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
                <ActivityIndicator size="small" color="#f03e3e" />
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
        <ActivityIndicator size="large" color="#f03e3e" />
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
            <Text style={styles.bioText}>{stripHtmlTags(person.bio)}</Text>
          </View>
        )}

        {/* Add the Episodes section */}
        {renderEpisodesSection()}

        {person.relatedLinks && Array.isArray(person.relatedLinks) && person.relatedLinks.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Related Links</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#343a40',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    marginVertical: 10,
    fontSize: 16,
    color: '#343a40',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f03e3e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  personImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#adb5bd',
  },
  headerInfo: {
    alignItems: 'center',
  },
  personName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 4,
  },
  personRole: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 10,
  },
  staffBadge: {
    flexDirection: 'row',
    backgroundColor: '#f03e3e',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  staffIcon: {
    marginRight: 4,
  },
  staffText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomColor: '#e9ecef',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  bioText: {
    fontSize: 16,
    color: '#495057',
    lineHeight: 24,
    padding: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  linkText: {
    fontSize: 16,
    color: '#f03e3e',
    marginLeft: 8,
  },
  episodesContainer: {
    padding: 10,
  },
  episodesList: {
    paddingBottom: 8,
  },
  episodeItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 5,
    padding: 10,
    overflow: 'hidden',
  },
  episodeImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 5,
    overflow: 'hidden',
    marginRight: 12,
  },
  episodeImage: {
    width: '100%',
    height: '100%',
  },
  placeholderEpisodeImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEpisodeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#adb5bd',
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 5,
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  episodeNumberBadge: {
    backgroundColor: '#f03e3e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  episodeNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  episodeDate: {
    fontSize: 12,
    color: '#6c757d',
    marginRight: 8,
  },
  episodeShow: {
    fontSize: 12,
    color: '#f03e3e',
    fontWeight: '500',
  },
  episodeDescription: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  episodeChevronContainer: {
    justifyContent: 'center',
    paddingLeft: 5,
  },
  episodesLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  episodesLoadingText: {
    marginTop: 8,
    color: '#6c757d',
    fontSize: 14,
  },
  episodesErrorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  episodesErrorText: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  episodesRetryButton: {
    backgroundColor: '#f03e3e',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 4,
  },
  episodesRetryText: {
    color: 'white',
    fontWeight: '500',
  },
  noEpisodesText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    padding: 20,
  },
});

export default PersonDetailScreen;
