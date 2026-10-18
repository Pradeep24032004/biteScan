// Small vibrations that make taps and wins feel physical. Never throws: haptics are optional.
import * as Haptics from 'expo-haptics';

export const tap = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const select = () => void Haptics.selectionAsync().catch(() => {});
export const bump = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
export const success = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
