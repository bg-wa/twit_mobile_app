# TWiT Mobile App

A React Native / Expo mobile application for TWiT.tv content.

## Overview

The TWiT Mobile App allows users to:
- Browse TWiT shows and episodes
- Watch live streams
- Search for content
- Manage app settings and preferences
- Cache content for offline viewing

## Prerequisites

- **Node.js**: 18.18.0 or newer
  ```bash
  # Check current version
  node --version
  
  # Install or switch using NVM
  nvm install 18.18.0
  nvm use 18.18.0
  ```

- **Android SDK**: For Android development
  ```bash
  # Set environment variable
  export ANDROID_HOME="/path/to/your/Android/Sdk"
  # Example: export ANDROID_HOME="/home/luigi/Android/Sdk"
  ```

- **Android Emulator**: A virtual device like Pixel 3a API 30
  - Set up through Android Studio's AVD Manager

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/TwitMobileAppExpo.git
   cd TwitMobileAppExpo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API credentials**
   - Ensure `src/config/credentials.js` has valid TWiT API credentials:
   ```javascript
   // src/config/credentials.js
   export const API_CREDENTIALS = {
     APP_ID: 'your-app-id',
     APP_KEY: 'your-app-key'
   };
   ```

## Running the App

1. **Set up Node and Android environment**
   ```bash
   # Use the correct Node.js version
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   nvm use 18.18.0
   
   # Set Android SDK path
   export ANDROID_HOME="/home/luigi/Android/Sdk"
   ```

2. **Start the development server with options**
   ```bash
   # Start with cache clearing and Android target (recommended)
   npx expo start --clear --android --port 8082
   
   # Basic start (may use cached data)
   npx expo start
   ```

3. **Troubleshooting commands**
   ```bash
   # Kill existing Expo processes if needed
   pkill -f "expo start"
   
   # Switch between app entry points in package.json
   # Options: "./App.js", "./SimpleApp.js", "./MinimalApp.js"
   
   # Force rebuild by clearing cache
   npx expo start --clear
   ```

4. **Run on physical device**
   - Install the Expo Go app on your device
   - Scan the QR code displayed in the terminal
   - Ensure your device is on the same network as your development machine

## Project Structure

```
/TwitMobileAppExpo
├── App.js                 # Main application entry point
├── TestApp.js             # Simple test application for diagnostics
├── SimpleApp.js           # Minimal app for debugging rendering
├── app.json               # Expo configuration
├── /src
│   ├── /components        # Reusable UI components
│   ├── /screens           # Application screens
│   ├── /services          # API and backend services
│   ├── /theme             # Colors, typography and styles
│   ├── /utils             # Helper functions and utilities
│   └── /config            # Configuration files
└── /assets                # Images, fonts and other assets
```

## Switching Between Entry Points

The application includes multiple entry points for testing and diagnostics:

1. **Main App**
   ```
   // package.json
   "main": "./App.js"
   ```

2. **Diagnostic App**
   ```
   // package.json
   "main": "./TestApp.js"
   ```

3. **Simple App**
   ```
   // package.json
   "main": "./SimpleApp.js"
   ```

## Troubleshooting

### White screen / splash screen stuck
- Clear Metro bundler cache: `npx expo start --clear`
- Check JavaScript bundle logs in Metro
- Try the SimpleApp.js entry point to verify basic rendering

### Node.js version issues
- Ensure Node.js 18.18.0+ is active: `node --version`
- Switch using NVM if needed: `nvm use 18.18.0`

### Android emulator not found
- Verify Android SDK path: `echo $ANDROID_HOME`
- Ensure emulator is running before starting Expo

### API connection issues
- Check network connectivity
- Verify API credentials in src/config/credentials.js
- Use the Diagnostic tab to test API connectivity

## License

[Insert license information here]
