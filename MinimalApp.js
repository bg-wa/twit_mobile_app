import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, Platform, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';
import DiagnosticScreen from './src/components/DiagnosticScreen';

// Make Platform available globally for any component that might need it
global.Platform = Platform;

// Create simple placeholder screens
const PlaceholderScreen = ({ title }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
  </View>
);

// Create a Tab Navigator
const Tab = createBottomTabNavigator();

const MinimalApp = () => {
  console.log('Rendering MinimalApp');
  
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Diagnostics') {
                iconName = focused ? 'bug' : 'bug-outline';
              } else if (route.name === 'Shows') {
                iconName = focused ? 'tv' : 'tv-outline';
              } else {
                iconName = focused ? 'settings' : 'settings-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#ff0000',
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen 
            name="Diagnostics" 
            component={DiagnosticScreen}
          />
          <Tab.Screen 
            name="Shows" 
            component={() => <PlaceholderScreen title="Shows" />}
          />
          <Tab.Screen 
            name="Settings" 
            component={() => <PlaceholderScreen title="Settings" />}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff0000'
  }
});

// Register as the root component
registerRootComponent(MinimalApp);

export default MinimalApp;
