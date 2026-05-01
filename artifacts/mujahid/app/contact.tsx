import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';

const DEVELOPER = 'نداء الرحمن عبّود';

const CONTACTS = [
  {
    id: 'whatsapp',
    label: 'واتساب',
    icon: 'logo-whatsapp' as const,
    color: '#25D366',
    url: 'https://wa.me/963980362204',
  },
  {
    id: 'instagram',
    label: 'إنستجرام',
    icon: 'logo-instagram' as const,
    color: '#E1306C',
    url: 'https://www.instagram.com/15coder?igsh=MTZsNzR0d3RpcmZycQ==',
  },
  {
    id: 'telegram',
    label: 'تيليجرام',
    icon: 'paper-plane-outline' as const,
    color: '#2AABEE',
    url: 'https://t.me/qqq_support',
  },
  {
    id: 'facebook',
    label: 'فيسبوك',
    icon: 'logo-facebook' as const,
    color: '#1877F2',
    url: 'https://www.facebook.com/share/18kWSKvvF7/',
  },
  {
    id: 'website',
    label: 'الموقع الإلكتروني',
    icon: 'globe-outline' as const,
    color: '#0D1E3D',
    url: 'https://needaa.netlify.app/',
  },
];

export default function ContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  async function handleOpen(url: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerInner}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.secondary }]}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            تواصل مع المُبرمج
          </Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.devCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>ن</Text>
          </View>
          <Text style={[styles.devName, { color: colors.foreground }]}>{DEVELOPER}</Text>
          <Text style={[styles.devTitle, { color: colors.mutedForeground }]}>
            مطوّر تطبيق مجاهد للتجارة
          </Text>
          <Text style={[styles.devNote, { color: colors.silver }]}>
            للدعم الفني، الاقتراحات، أو الاستفسارات – تواصل معنا عبر أي من القنوات التالية
          </Text>
        </View>

        <View style={styles.grid}>
          {CONTACTS.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleOpen(c.url)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: c.color + '22' }]}>
                <Ionicons name={c.icon} size={28} color={c.color} />
              </View>
              <Text style={[styles.contactLabel, { color: colors.foreground }]}>{c.label}</Text>
              <Ionicons name="open-outline" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { width: 38 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Tajawal_700Bold',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  devCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 34,
    fontFamily: 'Tajawal_700Bold',
  },
  devName: {
    fontSize: 20,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  devTitle: {
    fontSize: 14,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
  },
  devNote: {
    fontSize: 13,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  grid: {
    gap: 12,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
  },
});
