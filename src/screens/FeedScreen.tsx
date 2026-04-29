import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, RefreshControl, TextInput, Modal,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { fetchFeed, createPost, toggleLike, toggleBookmark, Post } from '../lib/api';
import { auth } from '../lib/firebase';

const { width: SCREEN_W } = Dimensions.get('window');

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function Avatar({ uri, size = 44 }: { uri?: string | null; size?: number }) {
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#222' }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700' }}>?</Text>
    </View>
  );
}

function VerifiedBadge({ badge }: { badge?: string }) {
  if (!badge && badge !== 'gold') return (
    <View style={styles.badge}>
      <Text style={{ color: colors.verified, fontSize: 10, fontWeight: '900' }}>✓</Text>
    </View>
  );
  if (badge === 'gold') return (
    <View style={[styles.badge, { backgroundColor: colors.verifiedGold }]}>
      <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>✓</Text>
    </View>
  );
  return (
    <View style={styles.badge}>
      <Text style={{ color: colors.verified, fontSize: 10, fontWeight: '900' }}>✓</Text>
    </View>
  );
}

function PostCard({ post, onLike, onBookmark }: {
  post: Post;
  onLike: (id: string, liked: boolean) => void;
  onBookmark: (id: string, bookmarked: boolean) => void;
}) {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Avatar uri={post.authorProfileImage} size={44} />
        <View style={styles.postMeta}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.displayName}>{post.authorDisplayName}</Text>
            <VerifiedBadge badge={post.authorBadge} />
            <Text style={styles.handle}>@{post.authorUsername}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <Text style={styles.moreText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

      {post.mediaUrls?.length > 0 && (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: post.mediaUrls[0] }}
            style={styles.media}
            resizeMode="cover"
          />
        </View>
      )}

      <View style={styles.actions}>
        <ActionBtn icon="💬" count={post.commentCount} />
        <ActionBtn icon="🔁" count={post.repostCount} active={post.reposted} activeColor={colors.accentGreen} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id, post.liked)}>
          <Text style={{ fontSize: 16, color: post.liked ? colors.accentRed : colors.textSecondary }}>
            {post.liked ? '❤️' : '🤍'}
          </Text>
          {post.likeCount > 0 && (
            <Text style={[styles.actionCount, post.liked && { color: colors.accentRed }]}>{post.likeCount}</Text>
          )}
        </TouchableOpacity>
        <ActionBtn icon="📈" />
        <TouchableOpacity style={styles.actionBtn} onPress={() => onBookmark(post.id, post.bookmarked)}>
          <Text style={{ fontSize: 16, color: post.bookmarked ? colors.accent : colors.textSecondary }}>
            {post.bookmarked ? '🔖' : '🏷️'}
          </Text>
        </TouchableOpacity>
        <ActionBtn icon="↑" />
      </View>
    </View>
  );
}

function ActionBtn({ icon, count, active, activeColor }: {
  icon: string; count?: number; active?: boolean; activeColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn}>
      <Text style={{ fontSize: 16, color: active ? activeColor : colors.textSecondary }}>{icon}</Text>
      {count !== undefined && count > 0 && (
        <Text style={[styles.actionCount, active && { color: activeColor }]}>{count}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function FeedScreen({ navigation }: any) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composeVisible, setComposeVisible] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [posting, setPosting] = useState(false);
  const currentUser = auth()?.currentUser;

  const loadFeed = useCallback(async () => {
    try {
      const data = await fetchFeed(30);
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, []);

  const handleLike = async (postId: string, liked: boolean) => {
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked: !liked, likeCount: p.likeCount + (liked ? -1 : 1) }
      : p));
    await toggleLike(postId, liked);
  };

  const handleBookmark = async (postId: string, bookmarked: boolean) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, bookmarked: !bookmarked } : p));
    await toggleBookmark(postId, bookmarked);
  };

  const handlePost = async () => {
    if (!composeText.trim()) return;
    setPosting(true);
    try {
      await createPost(composeText.trim());
      setComposeText('');
      setComposeVisible(false);
      loadFeed();
    } catch (e) {
      Alert.alert('Error', 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Avatar uri={currentUser?.photoURL} size={34} />
        </TouchableOpacity>
        <Text style={styles.logo}>Black94</Text>
        <View style={{ width: 34 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onLike={handleLike} onBookmark={handleBookmark} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeed(); }} tintColor={colors.accent} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No posts yet</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setComposeVisible(true)}>
        <Text style={styles.fabText}>✏️</Text>
      </TouchableOpacity>

      <Modal visible={composeVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.composeSheet}>
            <View style={styles.composeHeader}>
              <TouchableOpacity onPress={() => setComposeVisible(false)}>
                <Text style={{ color: colors.text, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>New Post</Text>
              <TouchableOpacity
                style={[styles.postBtn, !composeText.trim() && { opacity: 0.4 }]}
                onPress={handlePost}
                disabled={posting || !composeText.trim()}
              >
                {posting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.postBtnText}>Post</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.composeBody}>
              <Avatar uri={currentUser?.photoURL} size={40} />
              <TextInput
                style={styles.composeInput}
                placeholder="What's happening?"
                placeholderTextColor={colors.textSecondary}
                value={composeText}
                onChangeText={setComposeText}
                multiline
                autoFocus
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  logo: { color: colors.text, fontSize: 18, fontWeight: '800' },
  postCard: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.bg },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  postMeta: { flex: 1, marginLeft: 10 },
  displayName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  handle: { color: colors.textSecondary, fontSize: 14 },
  dot: { color: colors.textSecondary, fontSize: 14 },
  time: { color: colors.textSecondary, fontSize: 14 },
  badge: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: colors.verified,
    alignItems: 'center', justifyContent: 'center',
  },
  moreBtn: { padding: 4 },
  moreText: { color: colors.textSecondary, fontSize: 20 },
  caption: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 10, marginLeft: 54 },
  mediaContainer: { marginLeft: 54, borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  media: { width: '100%', height: 260, backgroundColor: '#111' },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginLeft: 54, gap: 28 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { color: colors.textSecondary, fontSize: 13 },
  separator: { height: 0.5, backgroundColor: colors.border },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  fabText: { fontSize: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  composeSheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, minHeight: 200,
  },
  composeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  composeBody: { flexDirection: 'row', gap: 12 },
  composeInput: { flex: 1, color: colors.text, fontSize: 16, minHeight: 80 },
  postBtn: { backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  postBtnText: { color: '#fff', fontWeight: '700' },
});
