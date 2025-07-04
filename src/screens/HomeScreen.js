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
import { setStatusBarStyle } from 'expo-status-bar';
import apiService from '../services/api';
import { stripHtmlAndDecodeEntities } from '../utils/textUtils';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';

// Legacy function for backward compatibility
const stripHtmlTags = (html) => {
  return stripHtmlAndDecodeEntities(html);
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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.CTA} />
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
    backgroundColor: COLORS.BACKGROUND,
  },
  showsList: {
    flexGrow: 1,
    padding: SPACING.MEDIUM,
    paddingTop: SPACING.LARGE,
  },
  showCard: {
    marginBottom: 15,
    backgroundColor: COLORS.CARD,
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
    backgroundColor: COLORS.BORDER,
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
    color: COLORS.TEXT_MEDIUM,
  },
  showInfo: {
    padding: 12,
  },
  showTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: SPACING.SMALL / 2,
  },
  showDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
    marginBottom: SPACING.SMALL,
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
    fontWeight: 'bold',
    color: COLORS.ERROR,
    marginBottom: SPACING.SMALL,
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
  emptyText: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    marginTop: 40,
  },
  streamsButtonContainer: {
    paddingVertical: SPACING.SMALL,
    paddingHorizontal: SPACING.MEDIUM,
    marginBottom: SPACING.SMALL,
  },
  streamsButton: {
    backgroundColor: COLORS.CTA,
    padding: SPACING.MEDIUM,
    borderRadius: 8,
    alignItems: 'center',
  },
  streamsButtonText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: TYPOGRAPHY.SIZE_MEDIUM,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
