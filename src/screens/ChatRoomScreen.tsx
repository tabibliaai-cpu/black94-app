import React from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAppStore } from '../stores/app';
import { fetchMessages, sendMessage, Message } from '../lib/api';
import { firestore, auth } from '../lib/firebase';

type RouteParams = {
  ChatRoom: {
    chatId?: string;
    userId?: string;
  };
};

export default function ChatRoomScreen() {
  const route = useRoute<RouteProp<RouteParams, 'ChatRoom'>>();
  const navigation = useNavigation();
  const params = route.params || {};
  const { chatId: routeChatId, userId: targetUserId } = params;
  const currentUser = useAppStore((s) => s.user);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [chatId, setChatId] = React.useState(routeChatId || '');

  React.useEffect(() => {
    if (chatId) loadMessages();
    else if (targetUserId) findOrCreateChat();
  }, [chatId, targetUserId]);

  const findOrCreateChat = async () => {
    const uid = auth().currentUser?.uid;
    if (!uid || !targetUserId) return;

    const snap1 = await firestore()
      .collection('chats')
      .where('user1Id', '==', uid)
      .where('user2Id', '==', targetUserId)
      .get();

    if (!snap1.empty) {
      setChatId(snap1.docs[0].id);
      return;
    }

    const snap2 = await firestore()
      .collection('chats')
      .where('user1Id', '==', targetUserId)
      .where('user2Id', '==', uid)
      .get();

    if (!snap2.empty) {
      setChatId(snap2.docs[0].id);
      return;
    }

    const docRef = await firestore().collection('chats').add({
      user1Id: uid,
      user2Id: targetUserId,
      lastMessage: '',
      lastMessageTime: firestore.FieldValue.serverTimestamp(),
      unreadCount: 0,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    setChatId(docRef.id);
  };

  const loadMessages = async () => {
    if (!chatId) return;
    try {
      const msgs = await fetchMessages(chatId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !chatId || !targetUserId) return;
    try {
      await sendMessage(chatId, targetUserId, input.trim());
      setInput('');
      loadMessages();
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === currentUser?.id;
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
          <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextOther]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity
          onPress={() => targetUserId && navigation.navigate('Report' as never, {
            contentType: 'user',
            contentId: chatId || '',
            reportedUserId: targetUserId,
            reportedUserName: 'This user',
          } as never)}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        inverted={false}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={20} color={colors.black} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.white },
  messageList: { flex: 1 },
  messageListContent: { padding: 16, gap: 6 },
  msgRow: { flexDirection: 'row' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '75%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  msgBubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: colors.surfaceLight, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTextMine: { color: colors.black },
  msgTextOther: { color: colors.text },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    color: colors.text, fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.primary, width: 40, height: 40,
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
});
