import { Stack, useLocalSearchParams } from 'expo-router';

import { Page } from '@/components/settings';
import { AppText } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { getLegalDocument } from '@/data/legal';

export default function LegalDocumentScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const document = getLegalDocument(doc);

  return (
    <Page>
      <Stack.Screen options={{ title: document?.title ?? 'Rechtliches' }} />
      {document ? (
        document.body.map((paragraph) => (
          <AppText key={paragraph} size={15} style={{ lineHeight: 22 }}>
            {paragraph}
          </AppText>
        ))
      ) : (
        <AppText color={Colors.textSecondary}>Dokument nicht gefunden.</AppText>
      )}
    </Page>
  );
}
