import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { API_CREDENTIALS } from './src/config/credentials';

const TestApp = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>TWiT Mobile App</Text>
        <Text style={styles.subtitle}>Diagnostic Screen</Text>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>App ID: {API_CREDENTIALS.APP_ID}</Text>
          <Text style={styles.infoText}>App Key: {API_CREDENTIALS.APP_KEY ? '✓ Present' : '✗ Missing'}</Text>
        </View>
        
        <Button 
          title="Test Connection" 
          onPress={() => {
            alert('Button pressed - connection test would go here');
          }} 
        />
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
    padding: 20,
  },
  title: {
    fontSize:.28,
    fontWeight: 'bold',
    color: '#ff0000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#333',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default TestApp;
