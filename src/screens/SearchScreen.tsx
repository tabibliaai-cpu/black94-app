import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAppStore } from '../stores/app';
import { auth, firestore } from '../lib/firebase';

interface SearchResult {
  id: string;
  displayName: string;
  username: string;
  profileImage: string | null;
  bio: string;
  isVerified: boolean;
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const snapshot = await firestore()
        .collection('users')
        .where('usernameLower', '>=', text.toLowerCase())
        .where('usernameLower', '<=', text.toLowerCase() + '\uf8ff')
        .limit(20)
        .get();

      const items: SearchResult[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          displayName: data.displayName || '',
          username: data.username || '',
          profileImage: data.profileImage || null,
          bio: data.bio || '',
          isVerified: data.isVerified || false,
        };
      });
      setResults(items);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate('ChatRoom', { userId: item.id })}
    >
      <View style={styles.avatar}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.displayName[0]?.toUpperCase()}</Text>
          </View>
        )}
        {item.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={8} color={colors.black} />
          </View>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.displayName}</Text>
        <Text style={styles.resultUsername}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.followBtn}
        onPress={() => navigation.navigate('ChatRoom', { userId: item.id })}
      >
        <Text style={styles.followText}>Chat</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search users..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderResult}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {query.length > 0 ? 'No results found' : 'Search for users by username'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.white },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, backgroundColor: colors.surface,
    borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  list: { paddingBottom: 20 },
  empty: { padding: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: { marginRight: 12, position: 'relative' },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: 'bold', fontSize: 18 },
  verifiedBadge: {
    position: 'absolute', bottom: -1, right: -1,
    backgroundColor: colors.verified, borderRadius: 10,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  resultInfo: { flex: 1 },
  resultName: { color: colors.white, fontWeight: '600', fontSize: 15 },
  resultUsername: { color: colors.textMuted, fontSize: 13, marginTop: 1 },
  followBtn: {
    backgroundColor: colors.primary, borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  followText: { color: colors.black, fontWeight: '600', fontSize: 13 },
});
