import React, { useState, useEffect } from 'react';
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
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/theme';
import AppIcon from '../components/AppIcon';
import { Ionicons } from '@expo/vector-icons';
import settingsManager from '../utils/settings/settingsManager';
import networkManager from '../services/NetworkManager';

const SettingsScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    useCellularData: true,
    darkMode: false,
  });

  // Load settings on component mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  // Load settings from storage
  const loadUserSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = await settingsManager.loadSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSetting = async (key) => {
    try {
      const newValue = !settings[key];
      
      // Update state
      setSettings(prevSettings => ({
        ...prevSettings,
        [key]: newValue
      }));
      
      // Save to storage and update managers
      await settingsManager.saveSettings({
        ...settings,
        [key]: newValue
      });
      
      // Special handling for cellular data
      if (key === 'useCellularData') {
        await networkManager.updateCellularSetting(newValue);
      }
    } catch (error) {
      console.error(`Error toggling ${key} setting:`, error);
      // Revert state on error
      setSettings(prevSettings => ({
        ...prevSettings
      }));
    }
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
        trackColor={{ false: '#767577', true: COLORS.PRIMARY }}
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
            'Dark Mode',
            'Use dark theme throughout the app',
            'darkMode'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>

          {renderSettingItem(
            'Use Cellular Data',
            'Stream videos using cellular data',
            'useCellularData'
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
              <ActivityIndicator size="small" color={COLORS.TEXT_LIGHT} />
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
            <Text style={styles.diagnosticButtonText}>Open Diagnostics</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            TWiT Mobile App provides access to TWiT.tv shows, episodes, and live streams.
            This app requires an internet connection to function properly.
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
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    padding: SPACING.MEDIUM,
  },
  headerContainer: {
    alignItems: 'center',
    marginVertical: SPACING.LARGE,
  },
  versionText: {
    marginTop: SPACING.SMALL,
    color: COLORS.TEXT_MEDIUM,
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
  },
  section: {
    marginBottom: SPACING.LARGE,
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
    padding: SPACING.MEDIUM,
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
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
    marginBottom: SPACING.MEDIUM,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SMALL,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: SPACING.MEDIUM,
  },
  settingTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
  },
  button: {
    backgroundColor: COLORS.CTA,
    padding: SPACING.MEDIUM,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: SPACING.SMALL,
  },
  diagnosticButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
  },
  buttonIcon: {
    marginRight: SPACING.SMALL,
  },
  buttonText: {
    color: COLORS.TEXT_DARK,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
  },
  diagnosticButtonText: {
    color: COLORS.TEXT_LIGHT,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
  },
  aboutText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
    lineHeight: 20,
    marginBottom: SPACING.MEDIUM,
  },
  copyrightText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_MEDIUM,
    textAlign: 'center',
  },
});

export default SettingsScreen;
