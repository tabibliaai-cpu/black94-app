import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Dimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors } from '../theme/colors';
import { firestore } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { tsToMillis } from '../lib/api';

const { width: SCREEN_W } = Dimensions.get('window');
const STORY_CARD_W = (SCREEN_W - 48) / 2;

const STORY_CATEGORIES = [
  { id: 'all', label: '✨ All' },
  { id: 'voice', label: '🎙️ Voice' },
  { id: 'polls', label: '📊 Polls' },
  { id: 'cricket', label: '🏏 Cricket' },
  { id: 'festival', label: '🎉 Festival' },
];

interface Story {
  id: string;
  authorId: string;
  authorDisplayName: string;
  authorUsername: string;
  authorProfileImage: string | null;
  content: string;
  mediaUrl: string | null;
  type: string;
  viewCount: number;
  likeCount: number;
  createdAt: number;
  category?: string;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function Avatar({ uri, size = 48, withGradientBorder = false }: { uri?: string | null; size?: number; withGradientBorder?: boolean }) {
  return (
    <View style={withGradientBorder ? {
      width: size + 4, height: size + 4, borderRadius: (size + 4) / 2,
      borderWidth: 2, borderColor: '#f09433', alignItems: 'center', justifyContent: 'center',
    } : {}}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#222' }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>?</Text>
        </View>
      )}
    </View>
  );
}

export default function StoriesScreen({ navigation }: any) {
  const [stories, setStories] = useState<Story[]>([]);
  const [filtered, setFiltered] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const currentUser = auth()?.currentUser;

  const load = useCallback(async () => {
    try {
      const snap = await firestore()
        .collection('stories')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const now = Date.now();
      const s: Story[] = snap.docs
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            authorId: data.authorId || '',
            authorDisplayName: data.authorDisplayName || '',
            authorUsername: data.authorUsername || '',
            authorProfileImage: data.authorProfileImage || null,
            content: data.content || data.text || '',
            mediaUrl: data.mediaUrl || null,
            type: data.type || 'text',
            viewCount: data.viewCount || 0,
            likeCount: data.likeCount || 0,
            createdAt: tsToMillis(data.createdAt),
            category: data.category || 'all',
          };
        })
        .filter(s => now - s.createdAt < 24 * 60 * 60 * 1000);

      setStories(s);
      setFiltered(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const filterCategory = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'all') setFiltered(stories);
    else setFiltered(stories.filter(s => s.category === cat));
  };

  // Group stories by author for the top bubble row
  const authorBubbles = React.useMemo(() => {
    const seen = new Set<string>();
    const result: Story[] = [];
    for (const s of stories) {
      if (!seen.has(s.authorId)) {
        seen.add(s.authorId);
        result.push(s);
      }
    }
    return result;
  }, [stories]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stories</Text>
        <TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
        >
          {/* Stories + count */}
          <View style={styles.storiesCountRow}>
            <Text style={styles.storiesTitle}>Stories</Text>
            {stories.length > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{stories.length} new</Text>
              </View>
            )}
          </View>

          {/* Story Bubbles */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bubblesRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
            {/* Your Story */}
            <TouchableOpacity style={styles.bubbleItem}>
              <View style={styles.addStoryCircle}>
                <Text style={styles.addStoryPlus}>+</Text>
              </View>
              <Text style={styles.bubbleLabel}>Your Story</Text>
            </TouchableOpacity>

            {/* Others */}
            {authorBubbles.map(s => (
              <TouchableOpacity key={s.authorId} style={styles.bubbleItem}>
                <View style={styles.gradientBorder}>
                  <Avatar uri={s.authorProfileImage} size={58} />
                </View>
                <Text style={styles.bubbleLabel} numberOfLines={1}>
                  {s.authorUsername || s.authorDisplayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {STORY_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}
                onPress={() => filterCategory(cat.id)}
              >
                <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Discover */}
          <View style={styles.discoverHeader}>
            <Text style={styles.discoverTitle}>Discover</Text>
            <Text style={styles.discoverCount}>{filtered.length} stories</Text>
          </View>

          {/* Story Cards Grid */}
          <View style={styles.grid}>
            {filtered.map(story => (
              <TouchableOpacity key={story.id} style={styles.storyCard}>
                {story.mediaUrl ? (
                  <Image source={{ uri: story.mediaUrl }} style={styles.storyCardBg} resizeMode="cover" />
                ) : (
                  <View style={[styles.storyCardBg, styles.storyCardGradient]}>
                    <Text style={styles.storyCardText}>{story.content}</Text>
                  </View>
                )}
                <View style={styles.storyCardOverlay} />
                <View style={styles.storyTypeBadge}>
                  <Text style={styles.storyTypeBadgeText}>💬 {story.type || 'Text'}</Text>
                </View>
                <View style={styles.storyCardBottom}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Avatar uri={story.authorProfileImage} size={28} />
                    <Text style={styles.storyAuthor} numberOfLines={1}>{story.authorDisplayName}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <Text style={styles.storyStat}>👁 {story.viewCount}</Text>
                    <Text style={styles.storyStat}>👍 {story.likeCount}</Text>
                    <Text style={styles.storyTime}>{timeAgo(story.createdAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {filtered.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>No stories yet</Text>
            </View>
          )}
        </ScrollView>
      )}
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.text, fontSize: 22 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  storiesCountRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  storiesTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  newBadge: { backgroundColor: '#1a2a3a', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  newBadgeText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  bubblesRow: { marginTop: 16, marginBottom: 4 },
  bubbleItem: { alignItems: 'center', width: 72 },
  addStoryCircle: {
    width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  addStoryPlus: { color: colors.text, fontSize: 30, fontWeight: '300' },
  gradientBorder: {
    width: 70, height: 70, borderRadius: 35, borderWidth: 2.5,
    borderColor: '#f09433', alignItems: 'center', justifyContent: 'center',
  },
  bubbleLabel: { color: colors.text, fontSize: 12, marginTop: 5, textAlign: 'center', maxWidth: 68 },
  categoriesRow: { marginTop: 16, marginBottom: 4 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  categoryTextActive: { color: '#fff', fontWeight: '700' },
  discoverHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  discoverTitle: { color: colors.accentGreen, fontSize: 16, fontWeight: '700' },
  discoverCount: { color: colors.textSecondary, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  storyCard: { width: STORY_CARD_W, height: STORY_CARD_W * 1.4, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
  storyCardBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  storyCardGradient: { backgroundColor: '#4a2080', alignItems: 'center', justifyContent: 'center', padding: 16 },
  storyCardText: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  storyCardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', backgroundColor: 'rgba(0,0,0,0.55)' },
  storyTypeBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  storyTypeBadgeText: { color: '#fff', fontSize: 11 },
  storyCardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  storyAuthor: { color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 },
  storyStat: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  storyTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
});
