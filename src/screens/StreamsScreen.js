import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';
import playerManager from '../services/playerManager';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';
import { stripHtmlAndDecodeEntities } from '../utils/textUtils';
import { openStreamInApp } from '../utils/streamUtils';

const StreamsScreen = ({ navigation }) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStreams();
    
    // Add focus listener to stop external players when returning to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      // Clear external app record when returning to this screen
      // This ensures we track when the user comes back to the app
      playerManager.clearExternalApp();
    });
    
    // Clean up the listener on unmount
    return unsubscribe;
  }, [navigation]);

  const fetchStreams = async () => {
    setLoading(true);
    setError(null);

    try {
      const streamsData = await apiService.getStreams();
      if (streamsData && Array.isArray(streamsData)) {
        // Reverse the order of streams to display the newest first
        setStreams([...streamsData].reverse());
      } else {
        setStreams([]);
      }
    } catch (err) {
      setError('Failed to load streams. Please try again later.');
      console.error('Error fetching streams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStream = async (stream) => {
    if (stream && stream.streamSource) {
      try {
        await openStreamInApp(stream);
      } catch (err) {
        console.error('Error opening stream:', err);
        Alert.alert(
          'Stream Error',
          'Unable to open this stream. Please try a different stream or check your connection.',
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert(
        'Stream Error',
        'This stream URL is not available.',
        [{ text: 'OK' }]
      );
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
        <Text style={styles.streamTitle}>{stripHtmlAndDecodeEntities(item.label) || 'Unknown Stream'}</Text>
        {item.description && (
          <Text style={styles.streamDescription} numberOfLines={2}>
            {stripHtmlAndDecodeEntities(item.description)}
          </Text>
        )}
        <View style={styles.streamTypeContainer}>
          <Text style={styles.streamType}>
            {item.streamType === 'video' ? '📹 Video' : '🎧 Audio'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.watchButton}
          onPress={() => handleOpenStream(item)}
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
        <ActivityIndicator size="large" color={COLORS.CTA} />
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
    backgroundColor: COLORS.BACKGROUND,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XX_LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
    padding: SPACING.MEDIUM,
  },
  listContent: {
    padding: SPACING.MEDIUM,
  },
  streamCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
    marginBottom: SPACING.MEDIUM,
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
    padding: SPACING.MEDIUM,
  },
  streamTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.X_LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
    marginBottom: SPACING.SMALL,
  },
  streamDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_MEDIUM,
    marginBottom: SPACING.SMALL,
  },
  streamTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SMALL
  },
  streamType: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT,
    marginRight: SPACING.SMALL,
  },
  watchButton: {
    backgroundColor: COLORS.CTA,
    padding: SPACING.SMALL,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: SPACING.SMALL,
  },
  watchButtonText: {
    color: COLORS.TEXT_DARK,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: SPACING.SMALL + 4,
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    color: COLORS.TEXT_MEDIUM,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.MEDIUM,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginBottom: SPACING.MEDIUM,
  },
  retryButton: {
    backgroundColor: COLORS.CTA,
    paddingVertical: SPACING.SMALL + 2,
    paddingHorizontal: SPACING.MEDIUM,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.TEXT_DARK,
    fontWeight: 'bold',
  },
  noStreamsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStreamsText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    color: COLORS.TEXT_MEDIUM,
  },
});

export default StreamsScreen;
