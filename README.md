# Black94 — React Native App

## 📱 Overview
A native React Native (Expo) social media app for Black94.

## 🔧 How to Build the APK

### Option 1: EAS Build (Cloud — Easiest)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to your Expo account (create one at expo.dev if needed)
eas login

# Build APK for Android
eas build --platform android --profile preview
```
The APK will be available for download from the Expo dashboard.

### Option 2: Local Build (Android Studio)
```bash
# Prebuild native Android project
npx expo prebuild --platform android

# Open in Android Studio
# File → Open → android/ folder
# Build → Build Bundle(s) / APK(s) → Build APK(s)

# OR build from command line:
cd android && ./gradlew assembleRelease
```

### Option 3: Expo Go (Testing only)
```bash
# Start dev server
npx expo start

# Scan QR code with Expo Go app on your phone
```

## 🔑 Google Sign-In Setup

You need to set up Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project `black94`
3. Go to **APIs & Services → Credentials**
4. The OAuth 2.0 Client ID for Android needs to be added to `app.json`:
   ```json
   "plugins": [
     [
       "@react-native-google-signin/google-signin",
       {
         "iosUrlScheme": "com.black94.app"
       }
     ]
   ]
   ```
5. Create an Android OAuth Client with package name `com.black94.app`
6. Get the web client ID and update it in `src/lib/api.ts` (line with `webClientId`)

## 📦 Project Structure
```
src/
├── lib/
│   ├── firebase.ts     # Firebase config & init
│   └── api.ts          # All API calls (auth, posts, chat, users)
├── navigation/
│   └── AppNavigator.tsx  # Tab + Stack navigation
├── screens/
│   ├── LoginScreen.tsx    # Google Sign In
│   ├── SignupScreen.tsx   # Google Sign Up
│   ├── FeedScreen.tsx     # Posts feed with compose
│   ├── SearchScreen.tsx   # User search
│   ├── NotificationsScreen.tsx  # Notifications
│   ├── ChatListScreen.tsx # Chat list
│   ├── ChatRoomScreen.tsx # Chat messages
│   ├── ProfileScreen.tsx  # User profile + logout
│   └── SettingsScreen.tsx # Edit profile + settings
├── stores/
│   └── app.ts            # Zustand global state
└── theme/
    └── colors.ts         # Dark theme colors
```

## 🔥 Firebase
- **Project ID:** `black94`
- **Auth:** Google Sign-In (native)
- **Firestore:** Users, posts, chats, messages, notifications, follows

## 🚀 Deployment
1. Build APK using one of the methods above
2. Submit `.apk` or `.aab` to app stores (Google Play, Indus App Store, etc.)
3. This is a **native app** — not a WebView wrapper — so it should be accepted

## ⚠️ Important Notes
- Do NOT modify `src/lib/firebase.ts` — Firebase configuration is locked
- The app uses the same Firebase project as the web version
- All data is shared between web and mobile apps
