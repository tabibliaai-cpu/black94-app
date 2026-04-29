import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, FlatList,
  StyleSheet, Dimensions, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { fetchUserProfile, fetchFeed, toggleFollow, checkFollowing, Post, User } from '../lib/api';
import { auth, firestore } from '../lib/firebase';
import { tsToMillis, parseMediaUrls } from '../lib/api';

const { width: SCREEN_W } = Dimensions.get('window');

function Avatar({ uri, size = 72 }: { uri?: string | null; size?: number }) {
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: colors.bg, backgroundColor: '#222' }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>?</Text>
    </View>
  );
}

function PostGrid({ posts, onPress }: { posts: Post[]; onPress: (p: Post) => void }) {
  if (posts.length === 0) return (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 15 }}>No posts yet</Text>
    </View>
  );
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {posts.map(post => (
        <TouchableOpacity key={post.id} style={styles.postRow} onPress={() => onPress(post)}>
          <View style={styles.postRowInner}>
            <Text style={styles.postCaption} numberOfLines={3}>{post.caption}</Text>
            {post.mediaUrls?.length > 0 && (
              <Image source={{ uri: post.mediaUrls[0] }} style={styles.postThumb} />
            )}
          </View>
          <View style={styles.postStats}>
            <Text style={styles.postStat}>🤍 {post.likeCount}</Text>
            <Text style={styles.postStat}>💬 {post.commentCount}</Text>
            <Text style={styles.postStat}>🔁 {post.repostCount}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProfileScreen({ route, navigation }: any) {
  const currentUser = auth()?.currentUser;
  const targetUserId = route?.params?.userId || currentUser?.uid;
  const isOwnProfile = targetUserId === currentUser?.uid;

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [tab, setTab] = useState<'posts' | 'store' | 'likes'>('posts');

  const load = useCallback(async () => {
    try {
      const [u, feed, isFollowing, followersSnap, followingSnap] = await Promise.all([
        fetchUserProfile(targetUserId),
        firestore().collection('posts').where('authorId', '==', targetUserId).orderBy('createdAt', 'desc').limit(20).get(),
        isOwnProfile ? Promise.resolve(false) : checkFollowing(targetUserId),
        firestore().collection('follows').where('followingId', '==', targetUserId).get(),
        firestore().collection('follows').where('followerId', '==', targetUserId).get(),
      ]);
      setUser(u);
      setFollowing(isFollowing);
      setFollowersCount(followersSnap.size);
      setFollowingCount(followingSnap.size);

      const ps: Post[] = feed.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, authorId: data.authorId || '', authorUsername: data.authorUsername || '',
          authorDisplayName: data.authorDisplayName || '', authorProfileImage: data.authorProfileImage || null,
          authorBadge: data.authorBadge || '', authorIsVerified: data.authorIsVerified || false,
          caption: data.caption || '', mediaUrls: parseMediaUrls(data.mediaUrls),
          likeCount: data.likeCount || 0, commentCount: data.commentCount || 0,
          repostCount: data.repostCount || 0, liked: false, bookmarked: false, reposted: false,
          createdAt: tsToMillis(data.createdAt),
        };
      });
      setPosts(ps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetUserId]);

  useEffect(() => { load(); }, []);

  const handleFollow = async () => {
    const newState = await toggleFollow(targetUserId, following);
    setFollowing(newState);
    setFollowersCount(c => c + (newState ? 1 : -1));
  };

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Text style={{ color: colors.text, fontSize: 24 }}>☰</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={{ color: colors.text, fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Cover */}
      <View style={styles.coverWrap}>
        {user?.coverImage ? (
          <Image source={{ uri: user.coverImage }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: '#111' }]}>
            <Image source={require('../../assets/logo.png')} style={{ width: '80%', height: '80%', opacity: 0.15 }} resizeMode="contain" />
          </View>
        )}
      </View>

      {/* Avatar + Edit / Follow */}
      <View style={styles.avatarRow}>
        <View style={{ marginTop: -40 }}>
          <Avatar uri={user?.profileImage || currentUser?.photoURL} size={80} />
        </View>
        {isOwnProfile ? (
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.editBtnText}>Edit profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.editBtn, following && styles.followingBtn]}
            onPress={handleFollow}
          >
            <Text style={[styles.editBtnText, following && { color: colors.text }]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Name / Bio */}
      <View style={styles.bioSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.displayName}>{user?.displayName || 'User'}</Text>
          {user?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={{ color: colors.verified, fontSize: 12, fontWeight: '900' }}>✓</Text>
            </View>
          )}
        </View>
        <Text style={styles.handle}>@{user?.username}</Text>
        {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        <View style={styles.statsRow}>
          <TouchableOpacity>
            <Text style={styles.statText}><Text style={styles.statNum}>{followingCount}</Text> Following</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.statText}><Text style={styles.statNum}>{followersCount}</Text> Followers</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['posts', 'store', 'likes'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'posts' && <PostGrid posts={posts} onPress={() => {}} />}
      {tab === 'store' && (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Text style={{ color: colors.textSecondary }}>No store items yet</Text>
        </View>
      )}
      {tab === 'likes' && (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Text style={{ color: colors.textSecondary }}>No liked posts yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
  },
  logo: { height: 28, width: 90 },
  coverWrap: { height: 140, width: '100%', overflow: 'hidden', backgroundColor: '#111' },
  cover: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: -4 },
  editBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8, marginBottom: 6,
  },
  followingBtn: { backgroundColor: '#1a1a1a' },
  editBtnText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  bioSection: { paddingHorizontal: 16, paddingTop: 10 },
  displayName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: colors.verified,
    alignItems: 'center', justifyContent: 'center',
  },
  handle: { color: colors.textSecondary, fontSize: 15, marginTop: 2 },
  bio: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
  statText: { color: colors.textSecondary, fontSize: 14 },
  statNum: { color: colors.text, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.border, marginTop: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.text },
  tabText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  tabTextActive: { color: colors.text },
  postRow: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  postRowInner: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  postCaption: { color: colors.text, fontSize: 14, flex: 1, lineHeight: 20 },
  postThumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#1a1a1a' },
  postStats: { flexDirection: 'row', gap: 16, marginTop: 8 },
  postStat: { color: colors.textSecondary, fontSize: 13 },
});
