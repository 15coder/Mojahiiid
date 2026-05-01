import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { useProducts } from '@/context/ProductsContext';
import { useColors } from '@/hooks/useColors';
import { Product } from '@/types/product';
import { searchProducts } from '@/utils/fuzzySearch';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, isLoading } = useProducts();
  const [query, setQuery] = useState('');
  const fabScale = useSharedValue(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    return searchProducts(query, products);
  }, [query, products]);

  function handleAddPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/product/add');
  }

  function handleFabPressIn() {
    fabScale.value = withSpring(0.92, { damping: 20, stiffness: 400 });
  }

  function handleFabPressOut() {
    fabScale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        entering={FadeInDown.duration(400).springify().damping(20)}
        style={[
          styles.header,
          {
            paddingTop: topInset + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.push('/scanner')}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="barcode-outline" size={22} color={colors.primary} />
          </Pressable>

          <View style={styles.headerTitleBlock}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>المنتجات</Text>
            <Text style={[styles.headerCount, { color: colors.silver }]}>
              {products.length} منتج
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <SearchBar value={query} onChangeText={setQuery} />
      </Animated.View>

      {isLoading ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </Animated.View>
      ) : filtered.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.center}>
          <Ionicons name="cube-outline" size={60} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {query ? 'لا توجد نتائج' : 'لا توجد منتجات'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {query ? 'جرّب كلمة بحث مختلفة' : 'اضغط + لإضافة أول منتج'}
          </Text>
        </Animated.View>
      ) : (
        <FlatList<Product>
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ProductCard
              product={item}
              index={index}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Animated.View
        entering={FadeInDown.delay(200).springify().damping(16).stiffness(150)}
        style={[
          styles.fab,
          {
            bottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24,
          },
        ]}
      >
        <AnimatedPressable
          style={[
            styles.fabInner,
            { backgroundColor: colors.primary },
            fabStyle,
          ]}
          onPress={handleAddPress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
        >
          <Ionicons name="add" size={30} color={colors.primaryForeground} />
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleBlock: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  headerCount: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingTop: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
