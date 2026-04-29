import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors } from '../theme/colors';
import { fetchChatList, Chat } from '../lib/api';

function Avatar({ uri, size = 48 }: { uri?: string | null; size?: number }) {
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#222' }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>?</Text>
    </View>
  );
}

function timeAgo(ms: number): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatListScreen({ navigation }: any) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [filtered, setFiltered] = useState<Chat[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'chats' | 'ads'>('chats');

  const load = useCallback(async () => {
    try {
      const data = await fetchChatList();
      setChats(data);
      setFiltered(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onSearch = (q: string) => {
    setSearch(q);
    if (!q.trim()) { setFiltered(chats); return; }
    const lower = q.toLowerCase();
    setFiltered(chats.filter(c =>
      c.otherUser?.displayName?.toLowerCase().includes(lower) ||
      c.otherUser?.username?.toLowerCase().includes(lower) ||
      c.lastMessage?.toLowerCase().includes(lower)
    ));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Text style={{ color: colors.text, fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'chats' && styles.tabActive]} onPress={() => setTab('chats')}>
          <Text style={styles.tabIcon}>💬</Text>
          <Text style={[styles.tabText, tab === 'chats' && styles.tabTextActive]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'ads' && styles.tabActive]} onPress={() => setTab('ads')}>
          <Text style={styles.tabIcon}>🪟</Text>
          <Text style={[styles.tabText, tab === 'ads' && styles.tabTextActive]}>Chat Ads</Text>
          <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={{ color: colors.textSecondary, marginRight: 8, fontSize: 15 }}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={onSearch}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatRow}
              onPress={() => navigation.navigate('ChatRoom', { chat: item })}
            >
              <Avatar uri={item.otherUser?.profileImage} size={52} />
              <View style={styles.chatInfo}>
                <View style={styles.chatTopRow}>
                  <Text style={styles.chatName} numberOfLines={1}>
                    {item.otherUser?.displayName || item.otherUser?.username || 'Unknown'}
                  </Text>
                  <Text style={styles.chatTime}>{timeAgo(item.lastMessageTime)}</Text>
                </View>
                <Text style={styles.chatLastMsg} numberOfLines={1}>
                  {item.lastMessage || 'No messages yet'}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: colors.border, marginLeft: 82 }} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No chats yet</Text>
            </View>
          }
        />
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
  settingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.text },
  tabIcon: { fontSize: 15 },
  tabText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  tabTextActive: { color: colors.text },
  newBadge: { backgroundColor: '#333', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  newBadgeText: { color: colors.text, fontSize: 10, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgInput,
    borderRadius: 25, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 11 },
  chatRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  chatInfo: { flex: 1 },
  chatTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  chatName: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  chatTime: { color: colors.textSecondary, fontSize: 13 },
  chatLastMsg: { color: colors.textSecondary, fontSize: 14 },
  unreadBadge: {
    backgroundColor: colors.accent, width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
