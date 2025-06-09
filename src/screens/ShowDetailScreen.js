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

// Helper function to strip HTML tags from text
const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
};

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
  const { id } = route.params;
  const [show, setShow] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShowDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch show details
        const showData = await apiService.getShowById(id);
        setShow(showData);
        
        // Fetch episodes for this show
        const episodesData = await apiService.getEpisodes({ 'filter[shows]': id });
        setEpisodes(episodesData);
      } catch (err) {
        setError('Failed to load show details.');
        console.error('Error fetching show details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShowDetails();
  }, [id]);

  const renderEpisodeItem = ({ item }) => {
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
          {extractEpisodeImageUrl(item) ? (
            <Image
              source={{ uri: extractEpisodeImageUrl(item) }}
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
          <Text style={styles.episodeTitle} numberOfLines={2}>{item.label || 'Untitled Episode'}</Text>
          <Text style={styles.episodeDate}>
            {item.airingDate ? new Date(item.airingDate).toLocaleDateString() : 'Unknown date'}
          </Text>
          {item.description && (
            <Text style={styles.episodeDescription} numberOfLines={2}>
              {stripHtmlTags(item.description)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff0000" />
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
              {stripHtmlTags(show.description)}
            </Text>
          )}
          
          {show.tagLine && (
            <Text style={styles.showTagLine}>
              {stripHtmlTags(show.tagLine)}
            </Text>
          )}
          
          {show.showNotes && (
            <Text style={styles.showNotes}>
              {stripHtmlTags(show.showNotes)}
            </Text>
          )}
          
          {show.showContactInfo && (
            <Text style={styles.showContactInfo}>
              {stripHtmlTags(show.showContactInfo)}
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#999',
  },
  showInfoContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  showTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  showDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 16,
  },
  showTagLine: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 16,
  },
  showNotes: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 16,
  },
  showContactInfo: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 16,
  },
  websiteButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  websiteButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  episodesContainer: {
    padding: 16,
    marginTop: 8,
  },
  episodesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  episodeItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  episodeImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  episodeImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  episodePlaceholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodePlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  episodeInfo: {
    flex: 1,
    padding: 12,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  episodeDate: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 4,
  },
  episodeDescription: {
    fontSize: 14,
    color: '#666666',
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
    marginBottom: 16,
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
  },
  noEpisodesText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666666',
    marginTop: 20,
  },
});

export default ShowDetailScreen;
