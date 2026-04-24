import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAppStore } from '../stores/app';
import { fetchUserProfile, checkFollowing, toggleFollow, Post } from '../lib/api';
import { firestore, auth } from '../lib/firebase';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [followerCount, setFollowerCount] = React.useState(0);
  const [followingCount, setFollowingCount] = React.useState(0);

  React.useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      // Fetch user's posts
      const snapshot = await firestore()
        .collection('posts')
        .where('authorId', '==', user.id)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const list: Post[] = snapshot.docs.map(doc => ({
        id: doc.id,
        authorId: doc.data().authorId || '',
        authorUsername: doc.data().authorUsername || '',
        authorDisplayName: doc.data().authorDisplayName || '',
        authorProfileImage: doc.data().authorProfileImage || null,
        authorBadge: doc.data().authorBadge || '',
        authorIsVerified: doc.data().authorIsVerified || false,
        caption: doc.data().caption || '',
        mediaUrls: doc.data().mediaUrls || [],
        likeCount: doc.data().likeCount || 0,
        commentCount: doc.data().commentCount || 0,
        repostCount: doc.data().repostCount || 0,
        liked: false,
        bookmarked: false,
        reposted: false,
        createdAt: doc.data().createdAt?.toMillis?.() || Date.now(),
      }));
      setPosts(list);

      // Count followers/following
      const followersSnap = await firestore()
        .collection('follows')
        .where('followingId', '==', user.id)
        .limit(100)
        .get();
      setFollowerCount(followersSnap.size);

      const followingSnap = await firestore()
        .collection('follows')
        .where('followerId', '==', user.id)
        .limit(100)
        .get();
      setFollowingCount(followingSnap.size);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    }
  };

  const handleLogout = async () => {
    const { signOut } = await import('../lib/api');
    try {
      await signOut();
      useAppStore.getState().setUser(null);
      useAppStore.getState().setToken(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.displayName?.[0]?.toUpperCase()}</Text>
              </View>
            )}
            {user?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color={colors.black} />
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{user?.displayName || 'User'}</Text>
          <Text style={styles.username}>@{user?.username || 'user'}</Text>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Posts</Text>
          {posts.length > 0 ? (
            <View style={styles.postsGrid}>
              {posts.map((post) => (
                <View key={post.id} style={styles.gridItem}>
                  {post.mediaUrls.length > 0 ? (
                    <Image source={{ uri: post.mediaUrls[0] }} style={styles.gridImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.gridTextItem}>
                      <Text style={styles.gridText} numberOfLines={4}>{post.caption}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPosts}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.white },
  profileSection: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  profileImage: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: 'bold', fontSize: 32 },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: colors.verified, borderRadius: 12,
    width: 22, height: 22, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  displayName: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  username: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  bio: { color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  statsRow: {
    flexDirection: 'row', gap: 32, marginTop: 20,
    paddingVertical: 12,
  },
  stat: { alignItems: 'center' },
  statNumber: { color: colors.white, fontWeight: 'bold', fontSize: 17 },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '600' },
  postsSection: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { color: colors.white, fontWeight: '600', fontSize: 16, marginBottom: 12 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridItem: { width: '33%', aspectRatio: 1 },
  gridImage: { width: '100%', height: '100%' },
  gridTextItem: {
    backgroundColor: colors.surface,
    width: '100%', height: '100%',
    padding: 6, justifyContent: 'center',
  },
  gridText: { color: colors.textSecondary, fontSize: 11, lineHeight: 14 },
  emptyPosts: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
