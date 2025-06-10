import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { COLORS } from '../utils/theme';

/**
 * A reusable loading indicator component
 */
const LoadingIndicator = ({ message = 'Loading...' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.CTA} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
});

export default LoadingIndicator;
