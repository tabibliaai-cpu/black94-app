import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { reportContent, blockUser } from '../lib/api';

type RouteParams = {
  Report: {
    contentType: 'post' | 'message' | 'user';
    contentId: string;
    reportedUserId: string;
    reportedUserName?: string;
  };
};

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or misleading content', icon: 'mail-outline' },
  { id: 'harassment', label: 'Harassment or bullying', icon: 'person-outline' },
  { id: 'hate', label: 'Hate speech', icon: 'ban-outline' },
  { id: 'nudity', label: 'Nudity or sexual content', icon: 'eye-off-outline' },
  { id: 'violence', label: 'Violence or threats', icon: 'alert-outline' },
  { id: 'scam', label: 'Scam or fraud', icon: 'shield-outline' },
  { id: 'copyright', label: 'Copyright violation', icon: 'document-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function ReportScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = (route.params || {}) as RouteParams['Report'];
  const { contentType, contentId, reportedUserId, reportedUserName } = params;

  const [submitting, setSubmitting] = React.useState(false);
  const [selectedReason, setSelectedReason] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please select a reason for reporting this content.');
      return;
    }

    setSubmitting(true);
    try {
      await reportContent({
        contentType,
        contentId,
        reportedUserId,
        reason: selectedReason,
      });
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep Black94 safe. Our team will review this content.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlock = () => {
    Alert.alert(
      `Block ${reportedUserName || 'this user'}?`,
      'They won\'t be able to find your profile, posts, or send you messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(reportedUserId);
              Alert.alert(
                'User Blocked',
                'This user has been blocked.',
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
            } catch {
              Alert.alert('Error', 'Failed to block user.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Why are you reporting this {contentType}?
        </Text>

        {REPORT_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.id}
            style={[
              styles.reasonItem,
              selectedReason === reason.id && styles.reasonItemSelected,
            ]}
            onPress={() => setSelectedReason(reason.id)}
          >
            <Ionicons
              name={reason.icon as any}
              size={20}
              color={selectedReason === reason.id ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.reasonText,
                selectedReason === reason.id && styles.reasonTextSelected,
              ]}
            >
              {reason.label}
            </Text>
            {selectedReason === reason.id && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        {submitting ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, !selectedReason && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!selectedReason}
          >
            <Text style={styles.submitText}>Submit Report</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.blockBtn} onPress={handleBlock}>
          <Ionicons name="ban" size={18} color={colors.error} />
          <Text style={styles.blockText}>
            Block {reportedUserName || 'User'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Reports are reviewed by our moderation team. Blocking is instant and can be undone in Settings.
        </Text>
      </ScrollView>
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
  subtitle: {
    color: colors.textSecondary, fontSize: 14, padding: 16, lineHeight: 20,
  },
  reasonItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  reasonItemSelected: {
    backgroundColor: 'rgba(163,217,119,0.06)',
  },
  reasonText: {
    flex: 1, color: colors.text, fontSize: 15,
  },
  reasonTextSelected: {
    color: colors.primary, fontWeight: '600',
  },
  loader: { paddingVertical: 24 },
  submitBtn: {
    backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 16,
    paddingVertical: 14, borderRadius: 16, alignItems: 'center',
  },
  submitText: {
    color: colors.black, fontSize: 15, fontWeight: '600',
  },
  divider: {
    height: 1, backgroundColor: colors.border, marginVertical: 8,
  },
  blockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  blockText: {
    color: colors.error, fontSize: 15, fontWeight: '600',
  },
  footerNote: {
    color: colors.textMuted, fontSize: 12, lineHeight: 18,
    paddingHorizontal: 16, paddingVertical: 16, textAlign: 'center',
  },
});
