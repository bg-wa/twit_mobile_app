import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, LogBox, ActivityIndicator, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { registerRootComponent } from 'expo';

// Make Platform available globally to fix reference errors
global.Platform = Platform;

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import ShowDetailScreen from './src/screens/ShowDetailScreen';
import EpisodeDetailScreen from './src/screens/EpisodeDetailScreen';
import StreamsScreen from './src/screens/StreamsScreen';
import SearchScreen from './src/screens/SearchScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Import components
import NetworkStatusBar from './src/components/NetworkStatusBar';
import AppIcon from './src/components/AppIcon';
import DiagnosticScreen from './src/components/DiagnosticScreen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

// Ignore specific warnings if needed
LogBox.ignoreLogs(['Warning: ...', 'Animated: `useNativeDriver`']);

// Error boundary component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('App Error:', error);
    console.log('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong!</Text>
          <Text style={{ marginBottom: 20 }}>{this.state.error?.toString() || 'Unknown error'}</Text>
          <Text style={{ fontSize: 16 }}>Please restart the app</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main stack navigator for each tab
const ShowsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ShowsList" 
      component={HomeScreen} 
      options={{ 
        title: 'TWiT Shows',
        headerLeft: () => <AppIcon size={30} showText={false} style={{ marginLeft: 10 }} />
      }} 
    />
    <Stack.Screen 
      name="ShowDetail" 
      component={ShowDetailScreen} 
      options={({ route }) => ({ title: route.params?.title || 'Show Details' })} 
    />
    <Stack.Screen 
      name="EpisodeDetail" 
      component={EpisodeDetailScreen} 
      options={({ route }) => ({ title: route.params?.title || 'Episode Details' })} 
    />
  </Stack.Navigator>
);

const StreamsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="StreamsList" 
      component={StreamsScreen} 
      options={{ 
        title: 'Live Streams',
        headerLeft: () => <AppIcon size={30} showText={false} style={{ marginLeft: 10 }} />
      }} 
    />
  </Stack.Navigator>
);

const SearchStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="SearchContent" 
      component={SearchScreen} 
      options={{ 
        title: 'Search',
        headerLeft: () => <AppIcon size={30} showText={false} style={{ marginLeft: 10 }} />
      }} 
    />
    <Stack.Screen 
      name="ShowDetail" 
      component={ShowDetailScreen} 
      options={({ route }) => ({ title: route.params?.title || 'Show Details' })} 
    />
    <Stack.Screen 
      name="EpisodeDetail" 
      component={EpisodeDetailScreen} 
      options={({ route }) => ({ title: route.params?.title || 'Episode Details' })} 
    />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="SettingsScreen" 
      component={SettingsScreen} 
      options={{ 
        title: 'Settings',
        headerLeft: () => <AppIcon size={30} showText={false} style={{ marginLeft: 10 }} />
      }} 
    />
    <Stack.Screen 
      name="DiagnosticScreen" 
      component={DiagnosticScreen} 
      options={{ 
        title: 'Diagnostics',
        headerTintColor: '#ff0000'
      }} 
    />
  </Stack.Navigator>
);

// Diagnostic stack for troubleshooting
const DiagnosticStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="DiagnosticScreen" 
      component={DiagnosticScreen} 
      options={{ 
        title: 'Diagnostics',
        headerLeft: () => <AppIcon size={30} showText={false} style={{ marginLeft: 10 }} />
      }} 
    />
  </Stack.Navigator>
);

// Tab navigator
const TabNavigator = () => {
  console.log('Rendering TabNavigator');
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Shows') {
            iconName = focused ? 'tv' : 'tv-outline';
          } else if (route.name === 'Streams') {
            iconName = focused ? 'radio' : 'radio-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff0000',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Shows" 
        component={ShowsStack} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Streams" 
        component={StreamsStack} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchStack} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack} 
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [appError, setAppError] = useState(null);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('App preparing...');
        
        // Log available screens and components
        console.log('HomeScreen available:', !!HomeScreen);
        console.log('ShowDetailScreen available:', !!ShowDetailScreen);
        console.log('StreamsScreen available:', !!StreamsScreen);
        console.log('SearchScreen available:', !!SearchScreen);
        console.log('SettingsScreen available:', !!SettingsScreen);
        console.log('NetworkStatusBar available:', !!NetworkStatusBar);
        console.log('DiagnosticScreen available:', !!DiagnosticScreen);

        // Set app ready immediately rather than waiting
        setAppIsReady(true);
      } catch (e) {
        console.warn('Error loading app:', e);
        setAppError(e);
        setAppIsReady(true); // Still mark as ready so we can show error UI
      } 
    }

    prepare();
  }, []);

  // Handle splash screen hiding in a separate useEffect
  useEffect(() => {
    if (appIsReady) {
      // Hide the splash screen after a short delay
      const hideSplash = async () => {
        try {
          console.log('Hiding splash screen...');
          await SplashScreen.hideAsync();
          console.log('Splash screen hidden successfully');
        } catch (e) {
          console.warn('Error hiding splash screen:', e);
        }
      };
      
      hideSplash();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#ff0000" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  if (appError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>App Error</Text>
        <Text style={{ marginBottom: 20 }}>{appError.toString()}</Text>
        <Text style={{ fontSize: 16 }}>Please restart the app</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <TabNavigator />
          <NetworkStatusBar />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

registerRootComponent(App);

export default App;
