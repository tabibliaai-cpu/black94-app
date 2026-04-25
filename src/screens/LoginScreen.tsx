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
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { signInWithGoogle } from '../lib/api';
import { useAppStore } from '../stores/app';

export default function LoginScreen() {
  const { setUser, setToken } = useAppStore();
  const navigation = useNavigation();
  const [busy, setBusy] = React.useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      // Step 1: Get Google Sign-In token
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: '210565807767-3sr1qs2vl.apps.googleusercontent.com',
        offlineAccess: true,
      });

      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();

      if (!idToken) {
        Alert.alert('Error', 'Failed to get authentication token');
        return;
      }

      // Step 2: Sign in with Firebase using the token
      const user = await signInWithGoogle(idToken);
      if (user) {
        setUser(user);
        setToken(user.id);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.code !== '12501') {
        Alert.alert('Sign In Failed', error.message || 'Please try again');
      }
    } finally {
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
          disabled={busy}
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
          onPress={() => navigation.navigate('Signup' as never)}
          style={styles.switchTextContainer}
        >
          <Text style={styles.switchText}>
            New to Black94?{' '}
            <Text style={styles.switchLink}>Create Account</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://black94.web.app/privacy-policy')}>
            <Text style={styles.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://black94.web.app/terms')}>
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
