import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED, TERMS_SECTIONS, TERMS_UPDATED } from '@/core/legalText';
import { Button } from './Button';
import { LegalDocument } from './LegalDocument';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function WelcomeView({ onAccept }: { onAccept: () => void }) {
  const theme = useTheme();
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Text style={[type.title, { color: theme.text }]}>Welcome</Text>
        <Text style={[type.body, { color: theme.textMuted }]}>
          Practice Test App helps you study for certification exams with mock tests and practice
          sessions. Everything you do stays on this device - nothing is sent to a server.
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Button
            title="View Privacy Policy"
            variant="secondary"
            onPress={() => setShowPrivacy(true)}
            testID="view-privacy"
          />
          <Button
            title="View Terms of Service"
            variant="secondary"
            onPress={() => setShowTerms(true)}
            testID="view-terms"
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Switch testID="consent-toggle" value={agreed} onValueChange={setAgreed} />
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>
            I have read and agree to the Privacy Policy and Terms of Service.
          </Text>
        </View>

        <Button
          title="Get Started"
          onPress={onAccept}
          disabled={!agreed}
          testID="consent-continue"
        />
      </Screen>

      {/*
        Not RN's `Modal`: on react-native-web it doesn't portal to a full-screen
        overlay - it renders inline in normal document flow, pushing its own
        Close button off-screen below the welcome content. A plain absolutely-
        positioned sibling covering the whole view works identically on both
        web and native.
      */}
      {showPrivacy ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
          <LegalDocument title="Privacy Policy" updated={PRIVACY_UPDATED} sections={PRIVACY_SECTIONS} />
          <View style={{ padding: spacing.md }}>
            <Button title="Close" onPress={() => setShowPrivacy(false)} testID="close-privacy" />
          </View>
        </View>
      ) : null}

      {showTerms ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
          <LegalDocument title="Terms of Service" updated={TERMS_UPDATED} sections={TERMS_SECTIONS} />
          <View style={{ padding: spacing.md }}>
            <Button title="Close" onPress={() => setShowTerms(false)} testID="close-terms" />
          </View>
        </View>
      ) : null}
    </View>
  );
}
