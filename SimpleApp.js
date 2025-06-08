import React from 'react';
import { View, Text, StyleSheet, Button, AppRegistry } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';

/**
 * A simplified version of the app to diagnose rendering issues
 */
const SimpleApp = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>TWiT Mobile App</Text>
        <Text style={styles.subtitle}>Simple Version</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Test Button"
            onPress={() => alert('Button pressed!')}
            color="#ff0000"
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff0000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
  },
  buttonContainer: {
    width: '80%',
    marginTop: 20,
  },
});

// Register the app component with Expo
registerRootComponent(SimpleApp);

export default SimpleApp;
