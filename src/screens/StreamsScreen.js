import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image
} from 'react-native';
import apiService from '../services/api';

const StreamsScreen = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getStreams();
        setStreams(data);
      } catch (err) {
        setError('Failed to load streams.');
        console.error('Error fetching streams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
  }, []);

  const handleOpenStream = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Error opening stream URL:', err);
      });
    }
  };

  const renderStreamItem = ({ item }) => (
    <View style={styles.streamCard}>
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.streamImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle}>{item.label || 'Unknown Stream'}</Text>
        {item.description && (
          <Text style={styles.streamDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.streamTypeContainer}>
          <Text style={styles.streamType}>
            {item.streamType === 'video' ? '📹 Video' : '🎧 Audio'}
          </Text>
          {item.streamPreferred && (
            <Text style={styles.preferredBadge}>Preferred</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.watchButton}
          onPress={() => handleOpenStream(item.streamUrl)}
        >
          <Text style={styles.watchButtonText}>
            {item.streamType === 'video' ? 'Watch Stream' : 'Listen to Stream'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff0000" />
        <Text style={styles.loadingText}>Loading streams...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchStreams()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Live Streams</Text>
      {streams.length > 0 ? (
        <FlatList
          data={streams}
          renderItem={renderStreamItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.noStreamsContainer}>
          <Text style={styles.noStreamsText}>No streams available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
  streamCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  streamImage: {
    width: '100%',
    height: 180,
  },
  streamInfo: {
    padding: 16,
  },
  streamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  streamDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  streamTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streamType: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  preferredBadge: {
    backgroundColor: '#28a745',
    color: '#ffffff',
    fontSize: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  watchButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  watchButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
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
  noStreamsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStreamsText: {
    fontSize: 16,
    color: '#666666',
  },
});

export default StreamsScreen;
