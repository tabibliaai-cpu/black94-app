import { auth, db, signInWithCredential, GoogleAuthProvider, fbSignOut } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, where, addDoc, deleteDoc, increment, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';

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

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function tsToMillis(ts: any): number {
  if (!ts) return Date.now();
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts?.toMillis) return ts.toMillis();
  if (typeof ts === 'number') return ts;
  return Date.now();
}

function currentUser(): any {
  return auth.currentUser;
}

/* ── Auth ─────────────────────────────────────────────────────────────────── */

export async function signInWithGoogle(idToken: string): Promise<User | null> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const fbUser = userCredential.user;

    // Create or update user doc in Firestore
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    const username = fbUser.displayName?.replace(/\s/g, '').toLowerCase() || fbUser.uid;

    const userData: any = {
      uid: fbUser.uid,
      email: fbUser.email,
      username: username,
      usernameLower: username.toLowerCase(),
      displayName: fbUser.displayName || 'User',
      profileImage: fbUser.photoURL || null,
      role: 'personal',
      badge: '',
      subscription: 'free',
      isVerified: false,
      updatedAt: serverTimestamp(),
    };

    if (!userDocSnap.exists()) {
      userData.createdAt = serverTimestamp();
      await setDoc(userDocRef, userData);
      await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: fbUser.uid });
    } else {
      await updateDoc(userDocRef, {
        profileImage: fbUser.photoURL || null,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      id: fbUser.uid,
      email: fbUser.email || '',
      username: username,
      displayName: userData.displayName,
      bio: userDocSnap.exists() ? (userDocSnap.data()?.bio || '') : '',
      profileImage: userData.profileImage,
      coverImage: userDocSnap.exists() ? (userDocSnap.data()?.coverImage || null) : null,
      role: userDocSnap.exists() ? (userDocSnap.data()?.role || 'personal') : 'personal',
      badge: userDocSnap.exists() ? (userDocSnap.data()?.badge || '') : '',
      subscription: userDocSnap.exists() ? (userDocSnap.data()?.subscription || 'free') : 'free',
      isVerified: userDocSnap.exists() ? (userDocSnap.data()?.isVerified || false) : false,
      createdAt: userDocSnap.exists() ? tsToMillis(userDocSnap.data()?.createdAt) : Date.now(),
    };
  } catch (error: any) {
    if (error.code === '12501') return null;
    console.error('[Auth] Google sign-in error:', error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch {}
  await fbSignOut(auth);
}

export { auth, db, onAuthStateChanged };

/* ── Posts ────────────────────────────────────────────────────────────────── */

export async function fetchFeed(limitCount = 20): Promise<Post[]> {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);

  const userId = currentUser()?.uid;
  const posts: Post[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    let liked = false;
    let bookmarked = false;
    let reposted = false;

    if (userId) {
      const [likeSnap, bookmarkSnap, repostSnap] = await Promise.all([
        getDoc(doc(db, 'post_likes', `${docSnap.id}_${userId}`)),
        getDoc(doc(db, 'post_bookmarks', `${docSnap.id}_${userId}`)),
        getDoc(doc(db, 'post_reposts', `${docSnap.id}_${userId}`)),
      ]);
      liked = likeSnap.exists();
      bookmarked = bookmarkSnap.exists();
      reposted = repostSnap.exists();
    }

    posts.push({
      id: docSnap.id,
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
      createdAt: tsToMillis(data.createdAt),
    });
  }

  return posts;
}

export async function createPost(caption: string, mediaUrls: string[] = []): Promise<string> {
  const userId = currentUser()?.uid;
  if (!userId) throw new Error('Not authenticated');

  const userDocSnap = await getDoc(doc(db, 'users', userId));
  const userData = userDocSnap.data();

  const docRef = await addDoc(collection(db, 'posts'), {
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function toggleLike(postId: string, currentlyLiked: boolean): Promise<boolean> {
  const userId = currentUser()?.uid;
  if (!userId) return false;

  const likeRef = doc(db, 'post_likes', `${postId}_${userId}`);
  const postRef = doc(db, 'posts', postId);

  if (currentlyLiked) {
    await deleteDoc(likeRef);
    await updateDoc(postRef, { likeCount: increment(-1) });
    return false;
  } else {
    await setDoc(likeRef, { postId, userId, createdAt: serverTimestamp() });
    await updateDoc(postRef, { likeCount: increment(1) });
    return true;
  }
}

export async function toggleBookmark(postId: string, currentlyBookmarked: boolean): Promise<boolean> {
  const userId = currentUser()?.uid;
  if (!userId) return false;

  const bookmarkRef = doc(db, 'post_bookmarks', `${postId}_${userId}`);

  if (currentlyBookmarked) {
    await deleteDoc(bookmarkRef);
    return false;
  } else {
    await setDoc(bookmarkRef, { postId, userId, createdAt: serverTimestamp() });
    return true;
  }
}

/* ── Chat ─────────────────────────────────────────────────────────────────── */

export async function fetchChatList(): Promise<Chat[]> {
  const userId = currentUser()?.uid;
  if (!userId) return [];

  const q1 = query(collection(db, 'chats'), where('user1Id', '==', userId));
  const q2 = query(collection(db, 'chats'), where('user2Id', '==', userId));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const allDocs = [...snap1.docs, ...snap2.docs];
  const chats: Chat[] = [];

  for (const docSnap of allDocs) {
    const data = docSnap.data();
    const otherId = data.user1Id === userId ? data.user2Id : data.user1Id;

    try {
      const otherSnap = await getDoc(doc(db, 'users', otherId));
      const otherData = otherSnap.data();
      chats.push({
        id: docSnap.id,
        user1Id: data.user1Id,
        user2Id: data.user2Id,
        lastMessage: data.lastMessage || '',
        lastMessageTime: tsToMillis(data.lastMessageTime),
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
          createdAt: tsToMillis(otherData.createdAt),
        } : null,
      });
    } catch {}
  }

  return chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
}

export async function fetchMessages(chatId: string, limitCount = 50): Promise<Message[]> {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      chatId,
      senderId: data.senderId || '',
      receiverId: data.receiverId || '',
      content: data.content || '',
      createdAt: tsToMillis(data.createdAt),
    };
  });
}

export async function sendMessage(chatId: string, receiverId: string, content: string): Promise<void> {
  const userId = currentUser()?.uid;
  if (!userId) return;

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    chatId,
    senderId: userId,
    receiverId,
    content,
    messageType: 'text',
    status: 'sent',
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: content,
    lastMessageTime: serverTimestamp(),
    unreadCount: increment(1),
  });
}

/* ── User ─────────────────────────────────────────────────────────────────── */

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const docSnap = await getDoc(doc(db, 'users', userId));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
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
    createdAt: tsToMillis(data?.createdAt),
  };
}

export async function toggleFollow(targetUserId: string, currentlyFollowing: boolean): Promise<boolean> {
  const userId = currentUser()?.uid;
  if (!userId) return false;

  const followRef = doc(db, 'follows', `${userId}_${targetUserId}`);

  if (currentlyFollowing) {
    await deleteDoc(followRef);
    return false;
  } else {
    await setDoc(followRef, {
      followerId: userId,
      followingId: targetUserId,
      createdAt: serverTimestamp(),
    });
    return true;
  }
}

export async function checkFollowing(targetUserId: string): Promise<boolean> {
  const userId = currentUser()?.uid;
  if (!userId) return false;
  const docSnap = await getDoc(doc(db, 'follows', `${userId}_${targetUserId}`));
  return docSnap.exists();
}
