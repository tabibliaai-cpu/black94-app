import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import auth from '@react-native-firebase/auth';
import Navigation from './src/navigation/AppNavigator';
import { useAppStore } from './src/stores/app';
import { fetchUserProfile } from './src/lib/api';

export default function App() {
  const { user, setUser, setToken, setIsReady, isReady } = useAppStore();

  useEffect(() => {
    // Listen for auth state changes
    const subscriber = auth().onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await fetchUserProfile(fbUser.uid);
          if (profile) {
            setUser(profile);
            setToken(profile.id);
          } else {
            // Fallback: create minimal user from Firebase auth
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              username: fbUser.displayName?.replace(/\s/g, '').toLowerCase() || fbUser.uid,
              displayName: fbUser.displayName || 'User',
              bio: '',
              profileImage: fbUser.photoURL || null,
              coverImage: null,
              role: 'personal',
              badge: '',
              subscription: 'free',
              isVerified: false,
              createdAt: Date.now(),
            });
            setToken(fbUser.uid);
          }
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setIsReady(true);
    });

    return subscriber;
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#07060b', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#a3d977" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Navigation />
    </>
  );
}
