import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../services/api';
import { colors, spacing, typography } from '../theme';
import AppIcon from '../components/AppIcon';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    enableOfflineMode: true,
    enableNotifications: false,
    enableAutoPlay: true,
    useCellularData: false,
    darkMode: false,
  });

  const toggleSetting = (key) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [key]: !prevSettings[key]
    }));
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. You will need an internet connection to reload content. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await apiService.clearCache();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
              console.error('Error clearing cache:', error);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderSettingItem = (title, description, key) => (
    <View style={styles.settingItem}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={() => toggleSetting(key)}
        trackColor={{ false: '#767577', true: colors.primary }}
        thumbColor="#f4f3f4"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <AppIcon size={60} showText={true} />
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          {renderSettingItem(
            'Enable Offline Mode',
            'Cache content for offline viewing',
            'enableOfflineMode'
          )}
          
          {renderSettingItem(
            'Dark Mode',
            'Use dark theme throughout the app',
            'darkMode'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>
          
          {renderSettingItem(
            'Auto-play Videos',
            'Automatically play videos when opened',
            'enableAutoPlay'
          )}
          
          {renderSettingItem(
            'Use Cellular Data',
            'Stream videos using cellular data',
            'useCellularData'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          {renderSettingItem(
            'Enable Notifications',
            'Get notified about new episodes',
            'enableNotifications'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={clearCache}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Clear Cache</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostics</Text>
          <TouchableOpacity 
            style={[styles.button, styles.diagnosticButton]} 
            onPress={() => navigation.navigate('DiagnosticScreen')}
          >
            <Ionicons name="bug" size={20} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Open Diagnostics</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            TWiT Mobile App provides access to TWiT.tv shows, episodes, and live streams.
            This app requires an internet connection and TWiT API credentials to function properly.
          </Text>
          <Text style={styles.copyrightText}>
            {new Date().getFullYear()} TWiT.tv
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.medium,
  },
  headerContainer: {
    alignItems: 'center',
    marginVertical: spacing.large,
  },
  versionText: {
    marginTop: spacing.small,
    color: colors.text.secondary,
    fontSize: typography.fontSize.small,
  },
  section: {
    marginBottom: spacing.large,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.medium,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: typography.fontSize.medium,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.medium,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: spacing.medium,
  },
  settingTitle: {
    fontSize: typography.fontSize.regular,
    color: colors.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: typography.fontSize.small,
    color: colors.text.secondary,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.medium,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: spacing.small,
  },
  diagnosticButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#2c3e50', // Different color to distinguish from cache button
  },
  buttonIcon: {
    marginRight: spacing.small,
  },
  buttonText: {
    color: colors.text.inverse,
    fontWeight: 'bold',
    fontSize: typography.fontSize.medium,
  },
  aboutText: {
    fontSize: typography.fontSize.small,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.medium,
  },
  copyrightText: {
    fontSize: typography.fontSize.tiny,
    color: colors.text.light,
    textAlign: 'center',
  },
});

export default SettingsScreen;
