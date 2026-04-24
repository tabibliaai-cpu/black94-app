import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAppStore } from '../stores/app';
import { fetchChatList, Chat } from '../lib/api';

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

export default function ChatListScreen() {
  const [chats, setChats] = React.useState<Chat[]>([]);
  const navigation = useNavigation<any>();

  const loadChats = React.useCallback(async () => {
    try {
      const list = await fetchChatList();
      setChats(list);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }, []);

  React.useEffect(() => {
    loadChats();
  }, [loadChats]);

  const renderChat = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, userId: item.otherUser?.id })}
    >
      <View style={styles.avatar}>
        {item.otherUser?.profileImage ? (
          <Image source={{ uri: item.otherUser.profileImage }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.otherUser?.displayName?.[0]?.toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.otherUser?.displayName || 'User'}</Text>
          <Text style={styles.chatTime}>{timeAgo(item.lastMessageTime)}</Text>
        </View>
        <Text style={styles.chatMessage} numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No conversations yet</Text>
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
  list: { paddingBottom: 20 },
  empty: { padding: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  chatItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: { marginRight: 12 },
  avatarImg: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: 'bold', fontSize: 20 },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { color: colors.white, fontWeight: '600', fontSize: 15 },
  chatTime: { color: colors.textMuted, fontSize: 12 },
  chatMessage: { color: colors.textSecondary, fontSize: 14, marginTop: 2 },
  unreadBadge: {
    backgroundColor: colors.primary, borderRadius: 12,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  unreadText: { color: colors.black, fontWeight: '600', fontSize: 11 },
});
