import React, { useEffect, useState, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { onAuthStateChanged, auth } from './src/lib/firebase';
import Navigation from './src/navigation/AppNavigator';
import { useAppStore } from './src/stores/app';
import { fetchUserProfile } from './src/lib/api';

/* ── Error Boundary ───────────────────────────────────────────────────────── */

class AppErrorBoundary extends Component {
  state = { hasError: false, error: null, errorStack: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const stack = error?.stack || errorInfo?.componentStack || '';
    console.error('[App] Uncaught error:', error?.message, '\n', stack);
    this.setState({ errorStack: stack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <StatusBar style="light" />
          <ScrollView contentContainerStyle={styles.errorContainer}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{this.state.error?.message || 'Unknown error'}</Text>
            {this.state.errorStack ? (
              <Text style={styles.errorStack}>{this.state.errorStack.slice(0, 500)}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => this.setState({ hasError: false, error: null, errorStack: '' })}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

/* ── App Component ────────────────────────────────────────────────────────── */

const FORCE_READY_TIMEOUT = 3000; // Always show UI within 3 seconds

export default function App() {
  const { user, setUser, setToken, setIsReady, isReady } = useAppStore();

  useEffect(() => {
    let unsubscribe = undefined;
    let forceReady = false;

    // Safety timeout: ensure the app shows SOMETHING even if Firebase hangs
    const safetyTimer = setTimeout(() => {
      console.warn('[App] Safety timeout reached — forcing ready');
      forceReady = true;
      setIsReady(true);
    }, FORCE_READY_TIMEOUT);

    // Initialize Firebase auth
    const initTimer = setTimeout(() => {
      try {
        const authInstance = auth();

        if (!authInstance) {
          console.warn('[App] Firebase Auth null — showing login screen');
          setUser(null);
          setToken(null);
          setIsReady(true);
          return;
        }

        unsubscribe = onAuthStateChanged(authInstance, async (fbUser) => {
          if (forceReady) return; // Already past safety timeout

          try {
            if (fbUser) {
              const baseUser = {
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
              };

              try {
                const profile = await fetchUserProfile(fbUser.uid);
                if (profile) {
                  setUser(profile);
                  setToken(profile.id);
                } else {
                  setUser(baseUser);
                  setToken(baseUser.id);
                }
              } catch (firestoreErr) {
                console.warn('[App] Profile fetch failed:', firestoreErr);
                setUser(baseUser);
                setToken(baseUser.id);
              }
            } else {
              setUser(null);
              setToken(null);
            }
          } catch (err) {
            console.error('[App] Auth state error:', err);
            setUser(null);
            setToken(null);
          }
          setIsReady(true);
        });
      } catch (initErr) {
        console.error('[App] Firebase init error:', initErr);
        setUser(null);
        setToken(null);
        setIsReady(true);
      }
    }, 100);

    return () => {
      clearTimeout(safetyTimer);
      clearTimeout(initTimer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <AppErrorBoundary>
      <>
        <StatusBar style="light" />
        {!isReady ? (
          <View style={styles.container}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <Navigation />
        )}
      </>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#1d9bf0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  errorContainer: {
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e7e9ea',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  errorStack: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'left',
    marginBottom: 24,
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: '#1d9bf0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  retryText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
});
