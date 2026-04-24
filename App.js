import React, { useEffect, useState } from 'react';
import { StatusBar, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import Navigation from './src/navigation/AppNavigator';
import { useAppStore } from './src/stores/app';
import { fetchUserProfile } from './src/lib/api';

function ErrorFallback({ error, retry }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{String(error?.message || 'Unknown error')}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const { user, setUser, setToken, setIsReady, isReady } = useAppStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    let subscriber;

    async function initAuth() {
      try {
        subscriber = auth().onAuthStateChanged(async (fbUser) => {
          try {
            if (fbUser) {
              const profile = await fetchUserProfile(fbUser.uid);
              if (profile) {
                setUser(profile);
                setToken(profile.id);
              } else {
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
            } else {
              setUser(null);
              setToken(null);
            }
          } catch (err) {
            console.error('Error processing auth state:', err);
            setUser(null);
            setToken(null);
          }
          setIsReady(true);
        });
      } catch (err) {
        console.error('Firebase auth init error:', err);
        setError(err);
        setIsReady(true);
      }
    }

    initAuth();

    return () => {
      if (subscriber) subscriber();
    };
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ErrorFallback
          error={error}
          retry={() => {
            setError(null);
            setIsReady(false);
          }}
        />
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07060b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#07060b',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e8f0dc',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#a3d977',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: '#07060b',
    fontSize: 15,
    fontWeight: '600',
  },
});
