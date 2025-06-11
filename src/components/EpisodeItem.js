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
  const getShowName = (episode) => {
    // Debug log for tracing episode data structure
    // console.log(`Episode data for showname extraction:`, JSON.stringify(episode, null, 2));
    
    if (!episode) return "";
    
    // Case 1: Check for embedded shows data (array format)
    if (episode._embedded && episode._embedded.shows) {
      if (Array.isArray(episode._embedded.shows) && episode._embedded.shows.length > 0) {
        console.log(`Found embedded shows array: ${episode._embedded.shows[0]?.label || 'no label'}`);
        return stripHtmlAndDecodeEntities(episode._embedded.shows[0]?.label || episode._embedded.shows[0]?.title || "");
      }
      // Case 2: Check for embedded shows data (object format)
      else if (typeof episode._embedded.shows === 'object' && episode._embedded.shows !== null) {
        console.log(`Found embedded shows object: ${episode._embedded.shows?.label || 'no label'}`);
        return stripHtmlAndDecodeEntities(episode._embedded.shows?.label || episode._embedded.shows?.title || "");
      }
    }
    
    // Case 3: Check for embedded dot notation
    if (episode.embedded && episode.embedded.shows) {
      if (Array.isArray(episode.embedded.shows) && episode.embedded.shows.length > 0) {
        console.log(`Found 'embedded' dot notation array: ${episode.embedded.shows[0]?.label || 'no label'}`);
        return stripHtmlAndDecodeEntities(episode.embedded.shows[0]?.label || episode.embedded.shows[0]?.title || "");
      }
      else if (typeof episode.embedded.shows === 'object' && episode.embedded.shows !== null) {
        console.log(`Found 'embedded' dot notation object: ${episode.embedded.shows?.label || 'no label'}`);
        return stripHtmlAndDecodeEntities(episode.embedded.shows?.label || episode.embedded.shows?.title || "");
      }
    }
    
    // Case 4: Check for direct show reference
    if (episode.show && episode.show.label) {
      console.log(`Found direct show reference: ${episode.show.label}`);
      return stripHtmlAndDecodeEntities(episode.show.label);
    }
    
    // Case 5: Try to infer from episodeNumber or ID pattern
    let showName = getShowNameFromEpisodeNumber(episode);
    if (showName) {
      console.log(`Inferred show name from episode number/pattern: ${showName}`);
      return showName;
    }
    
    // Case 6: Fall back to TWiT Show
    console.log(`No show name found, using default`);
    return "TWiT Show";
  };

  // Helper function to identify show from episode number patterns
  const getShowNameFromEpisodeNumber = (epNumber) => {
    // Based on episode ranges/patterns we know:
    if (epNumber > 1000 && epNumber < 1030) {
      return "Security Now"; // SN episodes are around 1000-1030 range in 2025
    }
    if (epNumber > 950 && epNumber < 980) {
      return "MacBreak Weekly"; // MBW episodes in 970 range
    }
    if (epNumber > 1030 && epNumber < 1040) {
      return "This Week in Tech"; // TWiT numbered higher
    }
    return "TWiT Show"; // Default fallback
  };

  const showName = getShowName(episode);

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
        <Text style={styles.episodeTitle} numberOfLines={2}>
          {stripHtmlAndDecodeEntities(episode.label || 'Unknown Episode')}
        </Text>
        {episode.airingDate && (
          <Text style={styles.episodeDate}>
            {formatDate(episode.airingDate)}
          </Text>
        )}
        {episode.description && (
          <Text style={styles.episodeDescription} numberOfLines={2}>
            {stripHtmlAndDecodeEntities(episode.description)}
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
