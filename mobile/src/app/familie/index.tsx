import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Group, Page, PrimaryButton, Row, SecondaryButton } from '@/components/settings';
import { EmptyState } from '@/components/system-states';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { KIND_LABELS } from '@/lib/family';
import { useFamily } from '@/state/family-state';

// Familie & Gruppen: eigene Gruppen, neue Gruppe, mit Code beitreten.
export default function FamilyScreen() {
  const { session, households, members, sharedLists, loading } = useFamily();

  if (!session) {
    return (
      <Page>
        <EmptyState
          title="Gemeinsam einkaufen"
          text="Teile Einkaufslisten mit Familie, WG oder Freunden. Alle sehen sofort, was hinzukommt und was schon im Wagen liegt.">
          <View style={{ alignSelf: 'stretch', gap: Spacing.two }}>
            <PrimaryButton label="Anmelden mit E-Mail" onPress={() => router.push('/konto')} />
          </View>
        </EmptyState>
        <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          Ohne Konto kannst du eine Liste weiterhin als Link oder Text teilen.
        </AppText>
      </Page>
    );
  }

  return (
    <Page>
      {loading && households.length === 0 ? <ActivityIndicator color={Colors.primary} /> : null}

      {households.length > 0 ? (
        <Group title="Deine Gruppen">
          {households.map((household, index) => {
            const count = members.filter((member) => member.householdId === household.id).length;
            const listCount = sharedLists.filter((list) => list.householdId === household.id).length;
            return (
              <Row
                key={household.id}
                label={`${household.emoji} ${household.name}`}
                subtitle={`${KIND_LABELS[household.kind]} · ${count} ${count === 1 ? 'Mitglied' : 'Mitglieder'} · ${listCount} ${listCount === 1 ? 'Liste' : 'Listen'}`}
                last={index === households.length - 1}
                onPress={() => router.push({ pathname: '/familie/[id]', params: { id: household.id } })}
              />
            );
          })}
        </Group>
      ) : loading ? null : (
        <EmptyState title="Noch keine Gruppe" text="Erstelle eine Gruppe und lade andere mit einem Code ein – oder tritt mit einem Code bei." />
      )}

      <View style={{ gap: Spacing.two }}>
        <PrimaryButton label="Gruppe erstellen" onPress={() => router.push('/familie/neu')} />
        <SecondaryButton label="Mit Code beitreten" onPress={() => router.push('/familie/beitreten')} />
      </View>

      <Pressable onPress={() => router.push('/konto')} style={{ alignItems: 'center' }}>
        <AppText size={13} color={Colors.textSecondary}>
          Angemeldet als {session.user.email}
        </AppText>
      </Pressable>
    </Page>
  );
}
