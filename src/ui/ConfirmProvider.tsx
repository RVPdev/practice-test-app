import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { slugify } from '@/core/id';
import { Button } from './Button';
import { Card } from './Card';
import { spacing, type, useTheme } from './theme';

export type ConfirmButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

type ConfirmRequest = {
  title: string;
  message?: string;
  buttons: ConfirmButton[];
};

type ConfirmFn = (title: string, message?: string, buttons?: ConfirmButton[]) => void;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used within a ConfirmProvider');
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback<ConfirmFn>((title, message, buttons) => {
    setRequest({ title, message, buttons: buttons ?? [{ text: 'OK' }] });
  }, []);

  const press = (button: ConfirmButton) => {
    setRequest(null);
    void button.onPress?.();
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {/*
        Not RN's `Modal`: on react-native-web it doesn't portal to a full-screen
        overlay - see WelcomeView for the same issue. A plain absolutely-
        positioned sibling covering the whole view works identically on both
        web and native.
      */}
      {request ? (
        <View
          testID="confirm-dialog"
          style={[StyleSheet.absoluteFill, styles.overlay]}
        >
          <Card style={{ backgroundColor: theme.surface, borderColor: theme.border, width: '100%', maxWidth: 420 }}>
            <Text style={[type.heading, { color: theme.text }]}>{request.title}</Text>
            {request.message ? (
              <Text style={[type.body, { color: theme.textMuted }]}>{request.message}</Text>
            ) : null}
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {request.buttons.map((button) => (
                <Button
                  key={button.text}
                  title={button.text}
                  variant={variantFor(button.style)}
                  onPress={() => press(button)}
                  testID={`confirm-button-${slugify(button.text)}`}
                />
              ))}
            </View>
          </Card>
        </View>
      ) : null}
    </ConfirmContext.Provider>
  );
}

function variantFor(style: ConfirmButton['style']): 'primary' | 'secondary' | 'danger' {
  if (style === 'cancel') return 'secondary';
  if (style === 'destructive') return 'danger';
  return 'primary';
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
});
