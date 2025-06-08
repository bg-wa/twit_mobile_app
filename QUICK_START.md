# TWiT Mobile App - Quick Start Guide

This guide provides the minimum steps to get the TWiT Mobile App up and running on an Android emulator.

## Prerequisites

- Android Studio with Android Emulator set up
- Node.js 18.18.0 or later
- Android SDK path configured

## Step 1: Set up your environment

```bash
# Set Android SDK path
export ANDROID_HOME="/home/luigi/Android/Sdk"

# Use correct Node.js version
nvm use 18.18.0
```

## Step 2: Install dependencies

```bash
# Install all required packages
cd /path/to/TwitMobileAppExpo
npm install
```

## Step 3: Start the emulator

```bash
# Start the Android emulator (Pixel 3a or similar)
cd $ANDROID_HOME/tools
./emulator -avd Pixel_3a_API_30_x86
```

## Step 4: Run the app

```bash
# Start Expo development server
cd /path/to/TwitMobileAppExpo
npx expo start --clear --android --port 8082
```

## Step 5: Switch between app modes

If you encounter issues, you can try different app entry points:

1. Edit `package.json` to use one of these options:
   ```json
   "main": "./App.js"      // Full app with all features
   "main": "./TestApp.js"  // Simple diagnostic app
   "main": "./SimpleApp.js" // Minimal app for testing rendering
   ```

2. Restart the Expo server after changing the entry point:
   ```bash
   # Kill existing Expo process
   pkill -f "expo start"
   
   # Restart with clean cache
   npx expo start --clear --android --port 8082
   ```

## Troubleshooting

- **White screen**: Try switching to SimpleApp.js entry point
- **API errors**: Verify credentials in src/config/credentials.js
- **Bundle errors**: Clear Metro cache with `npx expo start --clear`
- **Diagnostic tab**: Use the diagnostic tab in the app to test API connectivity

For more detailed information, please refer to the full README.md file.
