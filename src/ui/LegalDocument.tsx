import { ScrollView, Text, View } from 'react-native';
import type { LegalSection } from '@/core/legalText';
import { spacing, type, useTheme } from './theme';

export function LegalDocument({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}
    >
      <Text style={[type.title, { color: theme.text }]}>{title}</Text>
      <Text style={[type.caption, { color: theme.textMuted }]}>{`Last updated: ${updated}`}</Text>
      {sections.map((section) => (
        <View key={section.heading} style={{ gap: spacing.sm }}>
          <Text style={[type.heading, { color: theme.text }]}>{section.heading}</Text>
          {section.paragraphs.map((paragraph, index) => (
            <Text key={index} style={[type.body, { color: theme.textMuted }]}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
