import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS } from '../utils/theme';

/**
 * A simple app icon component that displays the TWiT logo
 * Can be used as a placeholder or in headers
 */
const AppIcon = ({ size = 40, showText = true, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Image 
        source={require('../../assets/images/twit_logo.png')} 
        style={{ 
          width: size, 
          height: size,
          borderRadius: size / 2
        }}
        resizeMode="contain"
      />
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
  text: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
  }
});

export default AppIcon;
