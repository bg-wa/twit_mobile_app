import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { API_CREDENTIALS } from '../config/credentials';
import apiService from '../services/api';
import cacheManager from '../utils/cacheManager';

/**
 * A diagnostic screen to help troubleshoot API and other issues
 */
const DiagnosticScreen = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [apiStatus, setApiStatus] = useState('Not tested');
  const [showsData, setShowsData] = useState(null);
  const [errors, setErrors] = useState([]);

  const checkNetworkStatus = async () => {
    try {
      const online = await cacheManager.isOnline();
      setIsOnline(online);
      return online;
    } catch (error) {
      setErrors(prev => [...prev, `Network check error: ${error.message}`]);
      return false;
    }
  };

  const testApiConnection = async () => {
    try {
      setApiStatus('Testing...');
      const shows = await apiService.getShows();
      setShowsData(shows);
      setApiStatus('Connected! Found ' + shows.length + ' shows');
      return true;
    } catch (error) {
      setApiStatus(`Error: ${error.message}`);
      setErrors(prev => [...prev, `API error: ${error.message}`]);
      return false;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>TWiT App Diagnostics</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Credentials</Text>
        <Text>App ID: {API_CREDENTIALS?.APP_ID || 'Missing'}</Text>
        <Text>App Key: {API_CREDENTIALS?.APP_KEY ? '✓ Present' : '✗ Missing'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Status</Text>
        <Text>Online: {isOnline ? '✓ Yes' : '✗ No'}</Text>
        <Button 
          title="Check Network" 
          onPress={checkNetworkStatus}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Connection</Text>
        <Text>Status: {apiStatus}</Text>
        <Button 
          title="Test API Connection" 
          onPress={testApiConnection}
        />
      </View>

      {errors.length > 0 && (
        <View style={styles.errorSection}>
          <Text style={styles.sectionTitle}>Errors</Text>
          {errors.map((error, index) => (
            <Text key={index} style={styles.errorText}>{error}</Text>
          ))}
          <Button 
            title="Clear Errors" 
            onPress={() => setErrors([])}
          />
        </View>
      )}

      {showsData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shows Data</Text>
          <Text>Found {showsData.length} shows:</Text>
          {showsData.slice(0, 3).map((show, index) => (
            <Text key={index}>{show.label || show.title || `Show ${index}`}</Text>
          ))}
          {showsData.length > 3 && <Text>... and {showsData.length - 3} more</Text>}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#ff0000',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorSection: {
    backgroundColor: '#fff8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff0000',
  },
  errorText: {
    color: '#cc0000',
    marginBottom: 5,
  }
});

export default DiagnosticScreen;
