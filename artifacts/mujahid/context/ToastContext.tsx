import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

interface ToastState {
  message: string;
  type: ToastType;
  id: number;
  actionLabel?: string;
  onAction?: () => void;
}

function ToastItem({ toast, onHide }: { toast: ToastState; onHide: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  const topOffset = Platform.OS === 'web' ? 80 : insets.top + 12;

  const iconMap: Record<ToastType, string> = {
    success: 'checkmark-circle',
    error: 'close-circle',
    warning: 'warning',
    info: 'information-circle',
  };

  const bgMap: Record<ToastType, string> = {
    success: colors.success,
    error: colors.destructive,
    warning: colors.warning,
    info: colors.primary,
  };

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }),
    ]).start();
  }, []);

  function hide() {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
    ]).start(onHide);
  }

  function handleAction() {
    toast.onAction?.();
    hide();
  }

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          top: topOffset,
          backgroundColor: bgMap[toast.type],
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity style={styles.toastInner} onPress={hide} activeOpacity={0.85}>
        <Ionicons name={iconMap[toast.type] as any} size={20} color="#fff" />
        <Text style={styles.toastText} numberOfLines={3}>
          {toast.message}
        </Text>
        {toast.actionLabel && toast.onAction && (
          <TouchableOpacity onPress={handleAction} style={styles.actionBtn}>
            <Text style={styles.actionText}>{toast.actionLabel}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback(({ message, type = 'info', duration = 3000, actionLabel, onAction }: ToastOptions) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { message, type, id, actionLabel, onAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onHide={() => removeToast(t.id)} />
      ))}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toastText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right',
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Tajawal_700Bold',
  },
});
