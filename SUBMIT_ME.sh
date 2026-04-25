#!/bin/bash

echo "---------------------------------------------------"
echo "🚀 STARTING PRODUCTION BUILD (AAB)"
echo "---------------------------------------------------"
# This command builds the AAB file for the Play Store
eas build --platform android --profile production

echo ""
echo "---------------------------------------------------"
echo "🔑 FETCHING PRODUCTION KEYS (SHA-1)"
echo "---------------------------------------------------"
# This command fetches the SHA-1 you need for Firebase
eas credentials -p android

echo ""
echo "---------------------------------------------------"
echo "✅ NEXT STEPS:"
echo "1. Download the .aab file from the link above."
echo "2. Copy the SHA-1 Fingerprint shown above."
echo "3. Go to Firebase Console -> Project Settings."
echo "4. Add the SHA-1 fingerprint to your Android app."
echo "5. Upload the .aab to Google Play Console."
echo "---------------------------------------------------"
