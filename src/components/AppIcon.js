import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

/**
 * A simple app icon component that displays the TWiT logo
 * Can be used as a placeholder or in headers
 */
const AppIcon = ({ size = 40, showText = true, style }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.iconCircle, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2 
        }
      ]}>
        <Ionicons name="radio" size={size * 0.6} color="#ffffff" />
      </View>
      {showText && (
        <Text style={styles.text}>TWiT</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  }
});

export default AppIcon;
