import React, { useEffect, useState, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { onAuthStateChanged, auth } from './src/lib/firebase';
import Navigation from './src/navigation/AppNavigator';
import { useAppStore } from './src/stores/app';
import { fetchUserProfile } from './src/lib/api';

/* ── Error Boundary ───────────────────────────────────────────────────────── */

class AppErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[App] Uncaught error:', error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{this.state.error?.message || 'Unknown error'}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                this.setState({ hasError: false, error: null });
                this.props.onError(null);
              }}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

/* ── App Component ────────────────────────────────────────────────────────── */

export default function App() {
  const { user, setUser, setToken, setIsReady, isReady } = useAppStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = undefined;

    // Small delay to ensure all modules are loaded
    const timer = setTimeout(() => {
      try {
        const authInstance = auth();

        if (!authInstance) {
          // Firebase auth not available — treat as signed out
          console.warn('[App] Firebase Auth not initialized, showing login');
          setUser(null);
          setToken(null);
          setIsReady(true);
          return;
        }

        unsubscribe = onAuthStateChanged(authInstance, async (fbUser) => {
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
                console.warn('[App] Firestore profile fetch failed, using basic user');
                setUser(baseUser);
                setToken(baseUser.id);
              }
            } else {
              setUser(null);
              setToken(null);
            }
          } catch (err) {
            console.error('[App] Error processing auth state:', err);
            setUser(null);
            setToken(null);
          }
          setIsReady(true);
        });
      } catch (initErr) {
        console.error('[App] Firebase initialization error:', initErr);
        setUser(null);
        setToken(null);
        setIsReady(true);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <AppErrorBoundary
      onError={(err) => {
        if (err) {
          setError(err);
        } else {
          setError(null);
          setIsReady(false);
        }
      }}
    >
      <>
        <StatusBar style="light" />
        {!isReady ? (
          <View style={styles.container} />
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
    backgroundColor: '#07060b',
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
