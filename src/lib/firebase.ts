import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// NOTE: @react-native-firebase/app initializes automatically from google-services.json
// Do NOT call initializeApp() manually - that's the web SDK pattern.

export { auth, firestore };
