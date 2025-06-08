import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../theme';

/**
 * A component that monitors network connectivity and displays a status bar
 * when the device is offline
 */
const NetworkStatusBar = () => {
  const [isConnected, setIsConnected] = useState(true);
  const translateY = new Animated.Value(-50);

  useEffect(() => {
    // Wrap in try/catch to prevent crashes
    try {
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsConnected(state.isConnected);

        // Animate the status bar in or out based on connection status
        Animated.timing(translateY, {
          toValue: state.isConnected ? -50 : 0,
          duration: 300,
          useNativeDriver: true
        }).start();
      });

      return () => {
        try {
          unsubscribe();
        } catch (err) {
          console.error('Error unsubscribing from NetInfo:', err);
        }
      };
    } catch (err) {
      console.error('Error setting up NetInfo listener:', err);
    }
  }, []);

  return (
      <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY }] }
          ]}
      >
        <Text style={styles.text}>
          No Internet Connection
        </Text>
      </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.warning,
    padding: 10,
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    color: colors.text.primary,
    fontWeight: 'bold',
  }
});

export default NetworkStatusBar;
