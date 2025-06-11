import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image 
} from 'react-native';
import { formatDate } from '../utils/apiHelpers';
import { stripHtmlAndDecodeEntities } from '../utils/textUtils';

/**
 * A reusable component for displaying an episode item in a list
 */
const EpisodeItem = ({ episode, onPress }) => {
  // Extract show name from embedded data if available
  const getShowName = () => {
    if (episode.embedded && episode.embedded.shows && episode.embedded.shows[0]) {
      return stripHtmlAndDecodeEntities(episode.embedded.shows[0].label);
    }
    // Fallback if show is directly attached to the episode
    if (episode.show && episode.show.label) {
      return stripHtmlAndDecodeEntities(episode.show.label);
    }
    // Second fallback if showId is provided but not the full object
    if (episode.showId) {
      return "Show #" + episode.showId;
    }
    return null;
  };
  
  const showName = getShowName();
  
  return (
    <TouchableOpacity
      style={styles.episodeItem}
      onPress={onPress}
    >
      {episode.image && (
        <Image
          source={{ uri: episode.image }}
          style={styles.episodeImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.episodeInfo}>
        {showName && (
          <Text style={styles.showName}>{showName}</Text>
        )}
        <Text style={styles.episodeTitle}>{episode.label || 'Unknown Episode'}</Text>
        {episode.airingDate && (
          <Text style={styles.episodeDate}>
            {formatDate(episode.airingDate)}
          </Text>
        )}
        {episode.description && (
          <Text style={styles.episodeDescription} numberOfLines={2}>
            {episode.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  showName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
    textTransform: 'uppercase',
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
});

export default EpisodeItem;
