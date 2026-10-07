import { router } from 'expo-router';
import { View } from 'react-native';

import { Group, Page, Row } from '@/components/settings';
import { AppText, FoxLogo } from '@/components/ui';
import { APP_VERSION } from '@/constants/app';
import { Colors, Spacing } from '@/constants/theme';
import { legalDocuments } from '@/data/legal';

export default function LegalScreen() {
  return (
    <Page>
      <Group title="Dokumente">
        {legalDocuments.map((document, index) => (
          <Row
            key={document.id}
            label={document.title}
            subtitle={document.subtitle}
            onPress={() => router.push({ pathname: '/einstellungen/dokument/[doc]', params: { doc: document.id } })}
            last={index === legalDocuments.length - 1}
          />
        ))}
      </Group>

      <AppText size={13} color={Colors.textSecondary}>
        Anzeigen und gesponserte Inhalte sind immer klar gekennzeichnet und ändern nie die Preis-Rangliste.
      </AppText>

      <View style={{ alignItems: 'center', gap: Spacing.two }}>
        <FoxLogo size={44} />
        <AppText weight="bold" size={14}>
          Preisfuchs {APP_VERSION}
        </AppText>
        <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          Alle Markennamen und Logos sind Eigentum der jeweiligen Inhaber.
        </AppText>
      </View>
    </Page>
  );
}
