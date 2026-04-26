import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/build/providers/Google';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { signInWithGoogle } from '../lib/api';
import { useAppStore } from '../stores/app';

WebBrowser.maybeCompleteAuthSession();

// Web OAuth client — NO SHA-1 certificate needed, works with any signing key
const WEB_CLIENT_ID = '210565807767-jtedotfd6hqn8cn31meuk2cfp2dkm88o.apps.googleusercontent.com';

export default function LoginScreen() {
  const { setUser, setToken, user } = useAppStore();
  const navigation = useNavigation<any>();
  const [busy, setBusy] = React.useState(false);

  // If user is already logged in, redirect to main tabs
  React.useEffect(() => {
    if (user) {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }
  }, [user]);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  React.useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      handleGoogleToken(response.authentication);
    }
  }, [response]);

  const handleGoogleToken = async (authResult: { idToken?: string }) => {
    if (!authResult.idToken) {
      Alert.alert('Error', 'Failed to get ID token from Google. Please try again.');
      return;
    }

    setBusy(true);
    try {
      const user = await signInWithGoogle(authResult.idToken);
      if (user) {
        setUser(user);
        setToken(user.id);
        // Navigate to main tabs after successful login
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      Alert.alert('Sign In Failed', error.message || 'Please try again');
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async () => {
    if (!request) {
      Alert.alert('Error', 'Google Sign-In is not ready. Please try again.');
      return;
    }
    setBusy(true);
    try {
      await promptAsync();
    } catch (error: any) {
      console.error('Browser auth error:', error);
      Alert.alert('Error', 'Could not open sign-in page.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.inner}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue to Black94.</Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleSignIn}
          disabled={busy || !request}
          activeOpacity={0.8}
        >
          {busy ? (
            <Text style={styles.buttonText}>Signing in...</Text>
          ) : (
            <Text style={styles.buttonText}>Sign in with Google</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Signup')}
          style={styles.switchTextContainer}
        >
          <Text style={styles.switchText}>
            New to Black94?{' '}
            <Text style={styles.switchLink}>Create Account</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://black94.web.app/privacy-policy.html')}>
            <Text style={styles.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://black94.web.app/terms-of-service.html')}>
            <Text style={styles.legalText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
  },
  googleButton: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    backgroundColor: colors.white,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginTop: 24,
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
    marginHorizontal: 12,
  },
  switchTextContainer: {
    marginTop: 4,
  },
  switchText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  switchLink: {
    color: colors.white,
    fontWeight: '600',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 12,
  },
  legalText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  legalSeparator: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
