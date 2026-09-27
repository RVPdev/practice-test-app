import { useColorScheme } from 'react-native';
import { useThemeMode } from './ThemeModeProvider';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const type = {
  title: { fontSize: 26, fontFamily: 'Sora_700Bold', lineHeight: 32 },
  heading: { fontSize: 19, fontFamily: 'Sora_600SemiBold', lineHeight: 25 },
  body: { fontSize: 16, fontFamily: 'Inter_400Regular', lineHeight: 23 },
  label: { fontSize: 14, fontFamily: 'Inter_600SemiBold', lineHeight: 19 },
  caption: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  // `as const` sits on the element, not the array: React Native's TextStyle wants a
  // mutable `FontVariant[]`, so a `readonly` tuple would not narrow.
  mono: { fontSize: 18, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums' as const] },
};

export type Theme = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  highlight: string;
  highlightText: string;
  positive: string;
  positiveSurface: string;
  negative: string;
  negativeSurface: string;
};

export const shadows = {
  card: '0 1px 2px rgba(0, 0, 0, 0.06)',
  raised: '0 4px 12px rgba(0, 0, 0, 0.12)',
} as const;

export const lightTheme: Theme = {
  background: '#f6f7f9',
  surface: '#ffffff',
  surfaceAlt: '#eef0f4',
  border: '#d9dde4',
  text: '#12161c',
  textMuted: '#5d6472',
  accent: '#1e3a5f',
  accentText: '#ffffff',
  highlight: '#c2760c',
  highlightText: '#ffffff',
  positive: '#1c7a4a',
  positiveSurface: '#e4f4ea',
  negative: '#b3261e',
  negativeSurface: '#fbe6e4',
};

export const darkTheme: Theme = {
  background: '#0f1216',
  surface: '#181c22',
  surfaceAlt: '#22272f',
  border: '#2d333c',
  text: '#f2f4f7',
  textMuted: '#a2abb8',
  accent: '#3a5d8a',
  accentText: '#ffffff',
  highlight: '#f0a839',
  highlightText: '#1e1b4b',
  positive: '#5fd39b',
  positiveSurface: '#123526',
  negative: '#ff8a80',
  negativeSurface: '#3a1a17',
};

export function useTheme(): Theme {
  const { mode } = useThemeMode();
  const scheme = useColorScheme();
  const effective = mode === 'system' ? scheme : mode;
  return effective === 'dark' ? darkTheme : lightTheme;
}
