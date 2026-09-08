import { useColorScheme } from 'react-native';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const type = {
  title: { fontSize: 26, fontWeight: '700' as const, lineHeight: 32 },
  heading: { fontSize: 19, fontWeight: '600' as const, lineHeight: 25 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 23 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 19 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  // `as const` sits on the element, not the array: React Native's TextStyle wants a
  // mutable `FontVariant[]`, so a `readonly` tuple would not narrow.
  mono: { fontSize: 18, fontWeight: '600' as const, fontVariant: ['tabular-nums' as const] },
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
  positive: string;
  positiveSurface: string;
  negative: string;
  negativeSurface: string;
};

export const lightTheme: Theme = {
  background: '#f6f7f9',
  surface: '#ffffff',
  surfaceAlt: '#eef0f4',
  border: '#d9dde4',
  text: '#12161c',
  textMuted: '#5d6472',
  accent: '#2f5bd7',
  accentText: '#ffffff',
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
  accent: '#6d92f5',
  accentText: '#0f1216',
  positive: '#5fd39b',
  positiveSurface: '#123526',
  negative: '#ff8a80',
  negativeSurface: '#3a1a17',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
