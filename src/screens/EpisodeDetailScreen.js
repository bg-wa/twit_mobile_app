import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking
} from 'react-native';
import apiService from '../services/api';

const EpisodeDetailScreen = ({ route }) => {
  const { id } = route.params;
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEpisodeDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getEpisodeById(id);
        setEpisode(data);
      } catch (err) {
        setError('Failed to load episode details.');
        console.error('Error fetching episode details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodeDetails();
  }, [id]);

  const handleWatchVideo = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Error opening video URL:', err);
      });
    }
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
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {episode.image && (
        <Image
          source={{ uri: episode.image }}
          style={styles.episodeImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.contentContainer}>
        <Text style={styles.episodeTitle}>{episode.label || 'Unknown Episode'}</Text>
        
        {episode.airingDate && (
          <Text style={styles.episodeDate}>
            Aired: {new Date(episode.airingDate).toLocaleDateString()}
          </Text>
        )}
        
        {episode.description && (
          <Text style={styles.episodeDescription}>{episode.description}</Text>
        )}
        
        {episode.videoUrl && (
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
    backgroundColor: '#f5f5f5',
  },
  episodeImage: {
    width: '100%',
    height: 220,
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
  },
});

export default EpisodeDetailScreen;
