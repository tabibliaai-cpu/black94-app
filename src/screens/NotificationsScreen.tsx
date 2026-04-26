import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { auth, firestore } from '../lib/firebase';
import { tsToMillis } from '../lib/api';

interface Notification {
  id: string;
  type: string;
  actorName: string;
  actorUsername: string;
  message: string;
  read: boolean;
  time: number;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  React.useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) return;

      const snapshot = await firestore()
        .collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();

      const list: Notification[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || 'like',
          actorName: data.actorName || '',
          actorUsername: data.actorUsername || '',
          message: data.message || '',
          read: data.read || false,
          time: tsToMillis(data.createdAt),
        };
      });

      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return 'heart';
      case 'comment': return 'chatbubble';
      case 'follow': return 'person-add';
      case 'repost': return 'repeat';
      default: return 'notifications';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={[styles.notifItem, !item.read && styles.unread]}>
      <View style={[styles.iconContainer, !item.read && styles.iconUnread]}>
        <Ionicons
          name={getIcon(item.type) as any}
          size={18}
          color={!item.read ? colors.primary : colors.textMuted}
        />
      </View>
      <View style={styles.notifContent}>
        <Text style={styles.notifText}>
          <Text style={styles.notifName}>{item.actorName}</Text>{' '}
          {item.message}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No notifications yet</Text>
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
  notifItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  unread: { backgroundColor: 'rgba(29,155,240,0.04)' },
  iconContainer: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  iconUnread: { backgroundColor: 'rgba(29,155,240,0.15)' },
  notifContent: { flex: 1 },
  notifText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  notifName: { fontWeight: '600', color: colors.white },
});
