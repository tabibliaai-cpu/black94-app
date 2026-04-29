import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../stores/app';

import { colors } from '../theme/colors';
import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import StoriesScreen from '../screens/StoriesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: focused ? '🏠' : '🏠',
    Search: focused ? '🔍' : '🔍',
    Messages: focused ? '💬' : '💬',
    Notifications: focused ? '🔔' : '🔔',
    Stories: focused ? '📡' : '📡',
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>
      {icons[name] || '●'}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0.5,
          borderTopColor: colors.tabBarBorder,
          paddingTop: 6,
          height: 60,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Home" component={FeedScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Search" focused={focused} /> }} />
      <Tab.Screen name="Messages" component={ChatListScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Messages" focused={focused} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Notifications" focused={focused} /> }} />
      <Tab.Screen name="Stories" component={StoriesScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Stories" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function CustomDrawerContent({ navigation }: any) {
  const { user } = useAppStore();

  const navItems = [
    { label: 'Home', icon: '🏠', screen: 'Home' },
    { label: 'Explore', icon: '🔍', screen: 'Search' },
    { label: 'Notifications', icon: '🔔', screen: 'Notifications' },
    { label: 'Messages', icon: '💬', screen: 'Messages' },
    { label: 'Stories', icon: '📡', screen: 'Stories' },
    { label: 'Profile', icon: '👤', screen: 'Profile' },
    { label: 'Bookmarks', icon: '🏷️', screen: 'Bookmarks' },
  ];

  return (
    <DrawerContentScrollView style={styles.drawer} contentContainerStyle={{ paddingTop: 0 }}>
      {/* Logo */}
      <View style={styles.drawerLogo}>
        <Image source={require('../../assets/logo.png')} style={{ height: 36, width: 100 }} resizeMode="contain" />
      </View>

      {/* Nav items */}
      {navItems.map(item => (
        <TouchableOpacity
          key={item.label}
          style={styles.drawerItem}
          onPress={() => {
            navigation.closeDrawer();
            navigation.navigate(item.screen);
          }}
        >
          <Text style={styles.drawerIcon}>{item.icon}</Text>
          <Text style={styles.drawerLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.drawerSpacer} />

      {/* User info at bottom */}
      {user && (
        <View style={styles.drawerUser}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.drawerAvatar} />
          ) : (
            <View style={[styles.drawerAvatar, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>?</Text>
            </View>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.drawerUserName}>{user.displayName}</Text>
              {user.isVerified && (
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.verifiedGold, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#000', fontSize: 9, fontWeight: '900' }}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.drawerUserHandle}>@{user.username}</Text>
          </View>
        </View>
      )}
    </DrawerContentScrollView>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: colors.bg, width: '72%' },
        overlayColor: 'rgba(0,0,0,0.7)',
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
      <Drawer.Screen name="Search" component={SearchScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Messages" component={ChatListScreen} />
      <Drawer.Screen name="Stories" component={StoriesScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Drawer" component={DrawerNavigator} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAppStore();

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={require('../../assets/logo.png')} style={{ width: 180, height: 60 }} resizeMode="contain" />
    </View>
  );

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={require('../screens/SignupScreen').default} />
      </Stack.Navigator>}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawer: { flex: 1, backgroundColor: colors.bg, paddingTop: 20 },
  drawerLogo: { paddingHorizontal: 20, paddingVertical: 16, marginBottom: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 18 },
  drawerIcon: { fontSize: 24, width: 30, textAlign: 'center' },
  drawerLabel: { color: colors.text, fontSize: 18, fontWeight: '600' },
  drawerSpacer: { flex: 1, minHeight: 40 },
  drawerUser: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderTopWidth: 0.5, borderTopColor: colors.border },
  drawerAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#222' },
  drawerUserName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  drawerUserHandle: { color: colors.textSecondary, fontSize: 14 },
});
