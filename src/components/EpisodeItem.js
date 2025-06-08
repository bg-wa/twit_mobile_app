import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image 
} from 'react-native';
import { formatDate } from '../utils/apiHelpers';

/**
 * A reusable component for displaying an episode item in a list
 */
const EpisodeItem = ({ episode, onPress }) => {
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
