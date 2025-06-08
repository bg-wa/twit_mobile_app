import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image 
} from 'react-native';

/**
 * A reusable component for displaying a show item in a list
 */
const ShowItem = ({ show, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.showCard}
      onPress={onPress}
    >
      {show.image && (
        <Image
          source={{ uri: show.image }}
          style={styles.showImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.showInfo}>
        <Text style={styles.showTitle}>{show.label || 'Unknown Show'}</Text>
        {show.description && (
          <Text style={styles.showDescription} numberOfLines={2}>
            {show.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  showCard: {
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
  showImage: {
    width: '100%',
    height: 150,
  },
  showInfo: {
    padding: 12,
  },
  showTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333333',
  },
  showDescription: {
    fontSize: 14,
    color: '#666666',
  },
});

export default ShowItem;
