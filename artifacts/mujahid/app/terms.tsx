import { Ionicons } from '@expo/vector-icons';
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

export default function TermsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.secondary }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>شروط الاستخدام</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        style={{ direction: 'rtl' } as any}
      >
        {/* Icon */}
        <View style={[styles.iconBlock, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="document-lock-outline" size={44} color={colors.primary} />
        </View>

        <Text style={[styles.mainTitle, { color: colors.foreground }]}>
          شروط الاستخدام والملكية الفكرية
        </Text>
        <Text style={[styles.appName, { color: colors.primary }]}>
          تطبيق مجاهد للتجارة
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          آخر تحديث: مايو 2025
        </Text>

        <Divider colors={colors} />

        <Section title="١. حقوق الملكية" icon="shield-checkmark-outline" colors={colors}>
          <Paragraph colors={colors}>
            تطبيق «مجاهد للتجارة» هو ملكية فكرية حصرية لمطوّره نداء الرحمن عبّود. جميع حقوق التأليف والنشر محفوظة. لا يُسمح بأي شكل من أشكال النسخ أو الاستنساخ أو التوزيع أو إعادة التوزيع لهذا التطبيق أو أي جزء منه دون الحصول على إذن خطي صريح مسبق من المطوّر.
          </Paragraph>
        </Section>

        <Section title="٢. حظر الاستخدام غير المرخّص" icon="ban-outline" colors={colors}>
          <Paragraph colors={colors}>
            يُحظر تمامًا استخدام هذا التطبيق من قِبل أي شخص أو جهة دون إذن صريح من المطوّر. يشمل الحظر ما يلي:
          </Paragraph>
          <BulletItem colors={colors} text="نسخ الكود المصدري أو أي جزء منه" />
          <BulletItem colors={colors} text="إعادة تصميم أو هندسة التطبيق عكسيًا" />
          <BulletItem colors={colors} text="توزيع نسخ معدّلة أو أصلية من التطبيق" />
          <BulletItem colors={colors} text="بيع أو تأجير أو ترخيص التطبيق لأطراف ثالثة" />
          <BulletItem colors={colors} text="استخدام واجهة التطبيق أو تصميمه في منتجات أخرى" />
        </Section>

        <Section title="٣. الاستخدام المسموح به" icon="checkmark-circle-outline" colors={colors}>
          <Paragraph colors={colors}>
            يُسمح بالاستخدام الشخصي لأصحاب النسخة المرخصة فقط. أي استخدام تجاري خارج النطاق المتفق عليه يستوجب موافقة مسبقة من المطوّر.
          </Paragraph>
        </Section>

        <Section title="٤. المسؤولية القانونية" icon="alert-circle-outline" colors={colors}>
          <Paragraph colors={colors}>
            كل من يستخدم هذا التطبيق بصورة غير مشروعة أو يقوم باستنساخه دون إذن يتحمل المسؤولية الكاملة أمام القانون، ويُعدّ مخالفًا لقوانين حقوق الملكية الفكرية المعمول بها.
          </Paragraph>
        </Section>

        <Section title="٥. التحديثات والتغييرات" icon="refresh-circle-outline" colors={colors}>
          <Paragraph colors={colors}>
            يحتفظ المطوّر بالحق في تعديل هذه الشروط في أي وقت. الاستمرار في استخدام التطبيق يعني القبول الضمني بالشروط المحدّثة.
          </Paragraph>
        </Section>

        <Section title="٦. التواصل والاستفسار" icon="chatbubble-ellipses-outline" colors={colors}>
          <Paragraph colors={colors}>
            للاستفسار عن تراخيص الاستخدام أو للإبلاغ عن انتهاكات، يرجى التواصل مع المطوّر عبر الوسائل المتاحة في صفحة "تواصل معنا".
          </Paragraph>
        </Section>

        <View style={[styles.footerBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.primary }]}>
            باستخدامك لهذا التطبيق فأنت توافق على جميع الشروط والأحكام المذكورة أعلاه.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.backBtnLarge, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={[styles.backBtnText, { color: colors.primaryForeground }]}>فهمت وأوافق</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, colors, children }: { title: string; icon: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function Paragraph({ colors, children }: { colors: any; children: React.ReactNode }) {
  return (
    <Text style={[styles.paragraph, { color: colors.foreground }]}>{children}</Text>
  );
}

function BulletItem({ colors, text }: { colors: any; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
      <Text style={[styles.bulletText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
    alignItems: 'stretch',
  },
  iconBlock: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
  },
  mainTitle: {
    fontSize: 22,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  appName: {
    fontSize: 16,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
    marginTop: -8,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    marginTop: -8,
  },
  divider: { height: 1 },
  section: { gap: 8 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'flex-end',
    paddingVertical: 2,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletText: {
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
    flex: 1,
  },
  footerBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right',
    flex: 1,
    lineHeight: 22,
  },
  backBtnLarge: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  backBtnText: {
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
  },
});
