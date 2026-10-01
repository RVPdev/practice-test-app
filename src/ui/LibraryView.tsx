import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { slugify } from '@/core/id';
import type { RunMode } from '@/core/types';
import { groupSetsByFamily } from '@/data/bundled';
import type { SetSummary } from '@/data/repository';
import { Button } from './Button';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { radius, spacing, type, useTheme } from './theme';

function SetRow({ set, onPress, isLast }: { set: SetSummary; onPress: () => void; isLast: boolean }) {
  const theme = useTheme();
  return (
    <ListRow testID={`set-card-${set.id}`} onPress={onPress} isLast={isLast}>
      <Text style={[type.heading, { color: theme.text }]}>{set.title}</Text>
      <Text style={[type.caption, { color: theme.textMuted }]}>{`${set.questionCount} questions`}</Text>
      {set.attemptCount > 0 && set.bestPercent !== null ? (
        <Text style={[type.caption, { color: theme.textMuted }]}>
          {`Best ${formatPercent(set.bestPercent)} · last ${formatDate(set.lastAttemptAt ?? '')}`}
        </Text>
      ) : null}
    </ListRow>
  );
}

function FamilySection({
  family,
  sets,
  collapsed,
  onToggle,
  onOpenSet,
}: {
  family: string;
  sets: SetSummary[];
  collapsed: boolean;
  onToggle: () => void;
  onOpenSet: (setId: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable accessibilityRole="button" testID={`family-toggle-${slugify(family)}`} onPress={onToggle}>
        <Text style={[type.label, { color: theme.text }]}>
          {`${collapsed ? '▸' : '▾'} ${family} (${sets.length})`}
        </Text>
      </Pressable>
      {collapsed ? null : (
        <Card>
          {sets.map((set, index) => (
            <SetRow key={set.id} set={set} onPress={() => onOpenSet(set.id)} isLast={index === sets.length - 1} />
          ))}
        </Card>
      )}
    </View>
  );
}

export function LibraryView({
  sets,
  loading,
  onOpenSet,
  onImport,
  onCreate,
  inProgress = null,
  onResume = () => {},
  onDiscard = () => {},
}: {
  sets: SetSummary[];
  loading: boolean;
  onOpenSet: (setId: string) => void;
  onImport: () => void;
  onCreate: () => void;
  inProgress?: { attemptId: string; setTitle: string; mode: RunMode } | null;
  onResume?: () => void;
  onDiscard?: () => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const trimmedQuery = query.trim().toLowerCase();
  const searching = trimmedQuery.length > 0;
  const searchResults = searching ? sets.filter((set) => set.title.toLowerCase().includes(trimmedQuery)) : [];

  const searchInputStyle = {
    ...type.body,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    color: theme.text,
    backgroundColor: theme.surface,
    padding: spacing.sm,
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Text style={[type.title, { color: theme.text }]}>Question sets</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Pick a set to practise, or import your own JSON.
        </Text>
      </View>

      {inProgress ? (
        <Card testID="resume-banner">
          <Text style={[type.heading, { color: theme.text }]}>Unfinished attempt</Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            {`You have a ${inProgress.mode === 'mock' ? 'mock test' : 'practice run'} in progress on "${inProgress.setTitle}".`}
          </Text>
          <Button title="Resume" onPress={onResume} testID="resume-session" />
          <Button title="Discard it" variant="secondary" onPress={onDiscard} testID="discard-session" />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button title="Import a set" onPress={onImport} variant="secondary" testID="import-button" />
        <Button title="Create a set" onPress={onCreate} variant="secondary" testID="create-button" />
      </View>

      {sets.length > 0 ? (
        <TextInput
          testID="set-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search your sets"
          placeholderTextColor={theme.textMuted}
          style={searchInputStyle}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator testID="library-loading" />
      ) : sets.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: theme.text }]}>No question sets yet.</Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            Import a JSON file or create your own to get started.
          </Text>
        </Card>
      ) : searching ? (
        searchResults.length === 0 ? (
          <Card>
            <Text style={[type.body, { color: theme.text }]}>{`No sets match "${query.trim()}".`}</Text>
          </Card>
        ) : (
          <Card>
            {searchResults.map((set, index) => (
              <SetRow
                key={set.id}
                set={set}
                onPress={() => onOpenSet(set.id)}
                isLast={index === searchResults.length - 1}
              />
            ))}
          </Card>
        )
      ) : (
        groupSetsByFamily(sets).map(({ family, sets: familySets }) => (
          <FamilySection
            key={family}
            family={family}
            sets={familySets}
            collapsed={!!collapsed[family]}
            onToggle={() => setCollapsed((prev) => ({ ...prev, [family]: !prev[family] }))}
            onOpenSet={onOpenSet}
          />
        ))
      )}
    </Screen>
  );
}
