import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAppStore } from '../stores/app';
import { fetchFeed, toggleLike, toggleBookmark, createPost, Post } from '../lib/api';

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function PostCard({ post, onLike, onBookmark }: {
  post: Post;
  onLike: (id: string, liked: boolean) => void;
  onBookmark: (id: string, bookmarked: boolean) => void;
}) {
  const navigation = useNavigation<any>();
  const user = useAppStore((s) => s.user);

  return (
    <View style={styles.postCard}>
      {/* Header */}
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() => user && post.authorId !== user.id && navigation.navigate('ChatRoom', { userId: post.authorId })}
      >
        <View style={styles.avatar}>
          {post.authorProfileImage ? (
            <Image source={{ uri: post.authorProfileImage }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{post.authorDisplayName[0]?.toUpperCase()}</Text>
            </View>
          )}
          {post.authorIsVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={8} color={colors.black} />
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.authorName}>{post.authorDisplayName}</Text>
          <Text style={styles.authorUsername}>@{post.authorUsername} · {timeAgo(post.createdAt)}</Text>
        </View>
      </TouchableOpacity>

      {/* Caption */}
      {post.caption ? (
        <Text style={styles.caption}>{post.caption}</Text>
      ) : null}

      {/* Media */}
      {post.mediaUrls.length > 0 && (
        <Image
          source={{ uri: post.mediaUrls[0] }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onLike(post.id, post.liked)}
        >
          <Ionicons
            name={post.liked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.liked ? colors.likeRed : colors.textSecondary}
          />
          <Text style={[styles.actionText, post.liked && { color: colors.likeRed }]}>
            {post.likeCount || ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.actionText}>{post.commentCount || ''}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="repeat" size={20} color={colors.textSecondary} />
          <Text style={styles.actionText}>{post.repostCount || ''}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { marginLeft: 'auto' }]}
          onPress={() => onBookmark(post.id, post.bookmarked)}
        >
          <Ionicons
            name={post.bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={post.bookmarked ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [composing, setComposing] = React.useState(false);
  const [caption, setCaption] = React.useState('');

  const loadFeed = useCallback(async () => {
    try {
      const feed = await fetchFeed(20);
      setPosts(feed);
    } catch (err) {
      console.error('Failed to load feed:', err);
    }
  }, []);

  React.useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      const liked = await toggleLike(postId, currentlyLiked);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked, likeCount: p.likeCount + (liked ? 1 : -1) } : p));
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleBookmark = async (postId: string, currentlyBookmarked: boolean) => {
    try {
      const bookmarked = await toggleBookmark(postId, currentlyBookmarked);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, bookmarked } : p));
    } catch (err) {
      console.error('Bookmark failed:', err);
    }
  };

  const handlePost = async () => {
    if (!caption.trim()) return;
    try {
      await createPost(caption.trim());
      setCaption('');
      setComposing(false);
      loadFeed();
    } catch (err) {
      console.error('Post failed:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Black94</Text>
        <TouchableOpacity onPress={() => setComposing(!composing)}>
          <Ionicons name="create" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Compose bar */}
      {composing && (
        <View style={styles.composeBar}>
          <View style={styles.composeInput}>
            <Text
              style={styles.composeText}
              placeholder="What's on your mind?"
              multiline
            >{caption}</Text>
          </View>
          <TouchableOpacity
            style={[styles.composeBtn, !caption.trim() && { opacity: 0.5 }]}
            onPress={handlePost}
            disabled={!caption.trim()}
          >
            <Text style={styles.composeBtnText}>Post</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onLike={handleLike} onBookmark={handleBookmark} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.feedList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No posts yet. Be the first to post!</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  composeBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  composeInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    minHeight: 40,
  },
  composeText: {
    color: colors.text,
    fontSize: 15,
  },
  composeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  composeBtnText: {
    color: colors.black,
    fontWeight: '600',
    fontSize: 14,
  },
  feedList: {
    paddingBottom: 20,
  },
  empty: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  postCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    marginRight: 10,
    position: 'relative',
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.verified,
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  authorUsername: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 1,
  },
  caption: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    gap: 4,
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
