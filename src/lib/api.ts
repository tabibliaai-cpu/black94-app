import { auth, firestore } from './firebase';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  profileImage: string | null;
  coverImage: string | null;
  role: string;
  badge: string;
  subscription: string;
  isVerified: boolean;
  createdAt: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImage: string | null;
  authorBadge: string;
  authorIsVerified: boolean;
  caption: string;
  mediaUrls: string[];
  likeCount: number;
  commentCount: number;
  repostCount: number;
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
  createdAt: number;
}

export interface Chat {
  id: string;
  user1Id: string;
  user2Id: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  otherUser: User | null;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: number;
}

/* ── Auth ─────────────────────────────────────────────────────────────────── */

export async function signInWithGoogle(): Promise<User | null> {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

  GoogleSignin.configure({
    webClientId: '210565807767-3sr1qs2vl.apps.googleusercontent.com',
    offlineAccess: true,
  });

  try {
    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    const userCredential = await auth().signInWithCredential(googleCredential);
    const fbUser = userCredential.user;

    // Create or update user doc in Firestore
    const userDoc = await firestore().collection('users').doc(fbUser.uid).get();
    const userData: any = {
      uid: fbUser.uid,
      email: fbUser.email,
      username: fbUser.displayName?.replace(/\s/g, '').toLowerCase() || fbUser.uid,
      usernameLower: fbUser.displayName?.replace(/\s/g, '').toLowerCase() || fbUser.uid,
      displayName: fbUser.displayName || 'User',
      profileImage: fbUser.photoURL || null,
      role: 'personal',
      badge: '',
      subscription: 'free',
      isVerified: false,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    if (!userDoc.exists) {
      userData.createdAt = firestore.FieldValue.serverTimestamp();
      await firestore().collection('users').doc(fbUser.uid).set(userData);
      // Also create username doc
      await firestore().collection('usernames').doc(userData.usernameLower).set({ uid: fbUser.uid });
    } else {
      await firestore().collection('users').doc(fbUser.uid).update({
        profileImage: fbUser.photoURL || null,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      id: fbUser.uid,
      email: fbUser.email || '',
      username: userData.username,
      displayName: userData.displayName,
      bio: userDoc.exists ? (userDoc.data()?.bio || '') : '',
      profileImage: userData.profileImage,
      coverImage: userDoc.exists ? (userDoc.data()?.coverImage || null) : null,
      role: userDoc.exists ? (userDoc.data()?.role || 'personal') : 'personal',
      badge: userDoc.exists ? (userDoc.data()?.badge || '') : '',
      subscription: userDoc.exists ? (userDoc.data()?.subscription || 'free') : 'free',
      isVerified: userDoc.exists ? (userDoc.data()?.isVerified || false) : false,
      createdAt: userDoc.exists ? (userDoc.data()?.createdAt?.toMillis?.() || Date.now()) : Date.now(),
    };
  } catch (error: any) {
    if (error.code === '12501') {
      // User cancelled
      return null;
    }
    console.error('[Auth] Google sign-in error:', error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch {}
  await auth().signOut();
}

/* ── Posts ────────────────────────────────────────────────────────────────── */

export async function fetchFeed(limit = 20): Promise<Post[]> {
  const snapshot = await firestore()
    .collection('posts')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const userId = auth().currentUser?.uid;
  const posts: Post[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let liked = false;
    let bookmarked = false;
    let reposted = false;

    if (userId) {
      const [likeDoc, bookmarkDoc, repostDoc] = await Promise.all([
        firestore().collection('post_likes').doc(`${doc.id}_${userId}`).get(),
        firestore().collection('post_bookmarks').doc(`${doc.id}_${userId}`).get(),
        firestore().collection('post_reposts').doc(`${doc.id}_${userId}`).get(),
      ]);
      liked = likeDoc.exists;
      bookmarked = bookmarkDoc.exists;
      reposted = repostDoc.exists;
    }

    posts.push({
      id: doc.id,
      authorId: data.authorId || '',
      authorUsername: data.authorUsername || '',
      authorDisplayName: data.authorDisplayName || '',
      authorProfileImage: data.authorProfileImage || null,
      authorBadge: data.authorBadge || '',
      authorIsVerified: data.authorIsVerified || false,
      caption: data.caption || '',
      mediaUrls: data.mediaUrls || [],
      likeCount: data.likeCount || 0,
      commentCount: data.commentCount || 0,
      repostCount: data.repostCount || 0,
      liked,
      bookmarked,
      reposted,
      createdAt: data.createdAt?.toMillis?.() || Date.now(),
    });
  }

  return posts;
}

export async function createPost(caption: string, mediaUrls: string[] = []): Promise<string> {
  const userId = auth().currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  const userDoc = await firestore().collection('users').doc(userId).get();
  const userData = userDoc.data();

  const docRef = await firestore().collection('posts').add({
    authorId: userId,
    authorUsername: userData?.username || '',
    authorDisplayName: userData?.displayName || '',
    authorProfileImage: userData?.profileImage || null,
    authorBadge: userData?.badge || '',
    authorIsVerified: userData?.isVerified || false,
    caption,
    mediaUrls,
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function toggleLike(postId: string, currentlyLiked: boolean): Promise<boolean> {
  const userId = auth().currentUser?.uid;
  if (!userId) return false;

  const likeRef = firestore().collection('post_likes').doc(`${postId}_${userId}`);
  const postRef = firestore().collection('posts').doc(postId);

  if (currentlyLiked) {
    await likeRef.delete();
    await postRef.update({ likeCount: firestore.FieldValue.increment(-1) });
    return false;
  } else {
    await likeRef.set({ postId, userId, createdAt: firestore.FieldValue.serverTimestamp() });
    await postRef.update({ likeCount: firestore.FieldValue.increment(1) });
    return true;
  }
}

export async function toggleBookmark(postId: string, currentlyBookmarked: boolean): Promise<boolean> {
  const userId = auth().currentUser?.uid;
  if (!userId) return false;

  const bookmarkRef = firestore().collection('post_bookmarks').doc(`${postId}_${userId}`);

  if (currentlyBookmarked) {
    await bookmarkRef.delete();
    return false;
  } else {
    await bookmarkRef.set({ postId, userId, createdAt: firestore.FieldValue.serverTimestamp() });
    return true;
  }
}

/* ── Chat ─────────────────────────────────────────────────────────────────── */

export async function fetchChatList(): Promise<Chat[]> {
  const userId = auth().currentUser?.uid;
  if (!userId) return [];

  const snapshot = await firestore()
    .collection('chats')
    .where('user1Id', '==', userId)
    .get();

  const snapshot2 = await firestore()
    .collection('chats')
    .where('user2Id', '==', userId)
    .get();

  const allDocs = [...snapshot.docs, ...snapshot2.docs];
  const chats: Chat[] = [];

  for (const doc of allDocs) {
    const data = doc.data();
    const otherId = data.user1Id === userId ? data.user2Id : data.user1Id;

    try {
      const otherDoc = await firestore().collection('users').doc(otherId).get();
      const otherData = otherDoc.data();
      chats.push({
        id: doc.id,
        user1Id: data.user1Id,
        user2Id: data.user2Id,
        lastMessage: data.lastMessage || '',
        lastMessageTime: data.lastMessageTime?.toMillis?.() || 0,
        unreadCount: data.unreadCount || 0,
        otherUser: otherData ? {
          id: otherId,
          email: otherData.email || '',
          username: otherData.username || '',
          displayName: otherData.displayName || '',
          bio: otherData.bio || '',
          profileImage: otherData.profileImage || null,
          coverImage: otherData.coverImage || null,
          role: otherData.role || 'personal',
          badge: otherData.badge || '',
          subscription: otherData.subscription || 'free',
          isVerified: otherData.isVerified || false,
          createdAt: otherData.createdAt?.toMillis?.() || Date.now(),
        } : null,
      });
    } catch {}
  }

  return chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
}

export async function fetchMessages(chatId: string, limit = 50): Promise<Message[]> {
  const snapshot = await firestore()
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      chatId,
      senderId: data.senderId || '',
      receiverId: data.receiverId || '',
      content: data.content || '',
      createdAt: data.createdAt?.toMillis?.() || Date.now(),
    };
  });
}

export async function sendMessage(chatId: string, receiverId: string, content: string): Promise<void> {
  const userId = auth().currentUser?.uid;
  if (!userId) return;

  await firestore()
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .add({
      chatId,
      senderId: userId,
      receiverId,
      content,
      messageType: 'text',
      status: 'sent',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

  await firestore().collection('chats').doc(chatId).update({
    lastMessage: content,
    lastMessageTime: firestore.FieldValue.serverTimestamp(),
    unreadCount: firestore.FieldValue.increment(1),
  });
}

/* ── User ─────────────────────────────────────────────────────────────────── */

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const doc = await firestore().collection('users').doc(userId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: userId,
    email: data?.email || '',
    username: data?.username || '',
    displayName: data?.displayName || '',
    bio: data?.bio || '',
    profileImage: data?.profileImage || null,
    coverImage: data?.coverImage || null,
    role: data?.role || 'personal',
    badge: data?.badge || '',
    subscription: data?.subscription || 'free',
    isVerified: data?.isVerified || false,
    createdAt: data?.createdAt?.toMillis?.() || Date.now(),
  };
}

export async function toggleFollow(targetUserId: string, currentlyFollowing: boolean): Promise<boolean> {
  const userId = auth().currentUser?.uid;
  if (!userId) return false;

  const followRef = firestore().collection('follows').doc(`${userId}_${targetUserId}`);

  if (currentlyFollowing) {
    await followRef.delete();
    return false;
  } else {
    await followRef.set({
      followerId: userId,
      followingId: targetUserId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return true;
  }
}

export async function checkFollowing(targetUserId: string): Promise<boolean> {
  const userId = auth().currentUser?.uid;
  if (!userId) return false;
  const doc = await firestore().collection('follows').doc(`${userId}_${targetUserId}`).get();
  return doc.exists;
}
