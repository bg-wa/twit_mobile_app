import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import apiService from '../services/api';

// Helper function to strip HTML tags from text
const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
};

const HomeScreen = ({ navigation }) => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchShows = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getShows();
      setShows(data);
    } catch (err) {
      setError('Failed to load shows. Please check your API credentials.');
      console.error('Error fetching shows:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShows();
  };

  useEffect(() => {
    fetchShows();
  }, []);

  const renderShowItem = ({ item }) => {
    // Extract the appropriate image URL from the coverArt object or fall back to image if available
    let imageSource = null;
    
    if (item.coverArt) {
      // If coverArt is an object with derivatives, use the appropriate size
      if (item.coverArt.derivatives && item.coverArt.derivatives.twit_album_art_300x300) {
        imageSource = item.coverArt.derivatives.twit_album_art_300x300;
      } else if (item.coverArt.url) {
        // If derivatives aren't available but there's a direct URL
        imageSource = item.coverArt.url;
      }
    } else if (typeof item.image === 'string') {
      // Fallback to the image property if coverArt isn't available
      imageSource = item.image;
    }
    
    return (
      <TouchableOpacity
        style={styles.showCard}
        onPress={() => navigation.navigate('ShowDetail', { 
          id: item.id, 
          title: item.label || 'Show Details',
          showData: item
        })}
      >
        <View style={styles.imageContainer}>
          {imageSource ? (
            <Image
              source={{ uri: imageSource }}
              style={styles.showImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>{item.label ? item.label.charAt(0) : 'T'}</Text>
            </View>
          )}
        </View>
        <View style={styles.showInfo}>
          <Text style={styles.showTitle}>{item.label || 'Unknown Show'}</Text>
          {item.description && (
            <Text style={styles.showDescription} numberOfLines={2}>
              {stripHtmlTags(item.description)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>TWiT Shows</Text>
      <TouchableOpacity
        style={styles.streamsButton}
        onPress={() => navigation.navigate('Streams')}
      >
        <Text style={styles.streamsButtonText}>Live Streams</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff0000" />
        <Text style={styles.loadingText}>Loading shows...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchShows}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={shows}
        renderItem={renderShowItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.showsList}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No shows available</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  showsList: {
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  streamsButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  streamsButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  showCard: {
    marginBottom: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16/9,
    overflow: 'hidden',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  showImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
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
  showInfo: {
    padding: 12,
  },
  showTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  showDescription: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666666',
    marginTop: 40,
  },
});

export default HomeScreen;
