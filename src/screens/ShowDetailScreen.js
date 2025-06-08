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

  const renderEpisodeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.episodeItem}
      onPress={() => navigation.navigate('EpisodeDetail', { 
        id: item.id, 
        title: item.label || 'Episode Details'
      })}
    >
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.episodeImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle}>{item.label || 'Unknown Episode'}</Text>
        {item.airingDate && (
          <Text style={styles.episodeDate}>
            {new Date(item.airingDate).toLocaleDateString()}
          </Text>
        )}
        {item.description && (
          <Text style={styles.episodeDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

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
        {show.image && (
          <Image
            source={{ uri: show.image }}
            style={styles.showImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.showInfoContainer}>
          <Text style={styles.showTitle}>{show.label || 'Unknown Show'}</Text>
          
          {show.description && (
            <Text style={styles.showDescription}>{show.description}</Text>
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
  showImage: {
    width: '100%',
    height: 200,
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
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  episodeImage: {
    width: 100,
    height: 100,
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
