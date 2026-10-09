import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';

import { Group, Page, Row, SecondaryButton } from '@/components/settings';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { createInvite, familyErrorText, KIND_LABELS } from '@/lib/family';
import { useAppState } from '@/state/app-state';
import { useFamily } from '@/state/family-state';

// Gruppe: Mitglieder, Einladen, gemeinsame Listen, Verlassen.
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { households, members, sharedLists, session, leaveGroup, shareListWithGroup, openSharedList } = useFamily();
  const { lists } = useAppState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const household = households.find((item) => item.id === id);

  if (!household) {
    return (
      <Page>
        <AppText>Diese Gruppe gibt es nicht mehr oder du bist kein Mitglied.</AppText>
      </Page>
    );
  }

  const groupMembers = members.filter((member) => member.householdId === household.id);
  const groupLists = sharedLists.filter((list) => list.householdId === household.id);
  const unsharedLists = lists.filter((list) => !list.shared);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (failure) {
      setError(familyErrorText(failure));
    } finally {
      setBusy(false);
    }
  };

  const invite = () =>
    run(async () => {
      const code = await createInvite(household.id);
      const link = Linking.createURL('familie/beitreten', { queryParams: { code } });
      await Share.share({
        message: `Komm in unsere Preisfuchs-Gruppe „${household.name}“! Code: ${code} (7 Tage gültig)\n${link}`,
      });
    });

  const shareList = () => {
    if (unsharedLists.length === 0) return;
    Alert.alert('Welche Liste teilen?', 'Alle in der Gruppe sehen und bearbeiten sie danach live.', [
      ...unsharedLists.slice(0, 5).map((list) => ({
        text: `${list.emoji} ${list.name}`,
        onPress: () => run(() => shareListWithGroup(list, household.id)),
      })),
      { text: 'Abbrechen', style: 'cancel' as const },
    ]);
  };

  const leave = () =>
    Alert.alert(`„${household.name}“ verlassen?`, 'Geteilte Listen bleiben als normale Listen auf deinem Gerät.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Verlassen',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await leaveGroup(household.id);
            router.back();
          }),
      },
    ]);

  return (
    <Page>
      <Stack.Screen options={{ title: `${household.emoji} ${household.name}` }} />
      <AppText size={14} color={Colors.textSecondary}>
        {KIND_LABELS[household.kind]} · bis zu 6 Mitglieder
      </AppText>

      <Group title={`Mitglieder (${groupMembers.length})`}>
        {groupMembers.map((member, index) => (
          <Row
            key={member.userId}
            label={member.userId === session?.user.id ? `${member.displayName} (du)` : member.displayName}
            badge={member.role === 'admin' ? 'Admin' : undefined}
            last={index === groupMembers.length - 1 && groupMembers.length >= 6}
          />
        ))}
        {groupMembers.length < 6 ? (
          <Row
            icon={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }}
            label="Mitglied einladen"
            subtitle="Code per Nachricht teilen"
            last
            onPress={busy ? undefined : invite}
          />
        ) : null}
      </Group>

      <Group title="Gemeinsame Listen" footer="Änderungen erscheinen bei allen sofort. Abhaken zeigt, wer es schon im Wagen hat.">
        {groupLists.map((list) => {
          const local = lists.find((item) => item.shared?.listId === list.id);
          return (
            <Row
              key={list.id}
              label={`${list.emoji} ${list.name}`}
              subtitle={local ? `${local.lines.length} Artikel` : 'Noch nicht auf diesem Gerät'}
              onPress={() =>
                run(async () => {
                  await openSharedList(list);
                  router.dismissTo('/warenkorb');
                })
              }
            />
          );
        })}
        <Row
          icon={{ ios: 'plus', android: 'add', web: 'add' }}
          label="Eigene Liste teilen"
          subtitle={unsharedLists.length === 0 ? 'Alle Listen sind schon geteilt' : undefined}
          last
          onPress={busy || unsharedLists.length === 0 ? undefined : shareList}
        />
      </Group>

      {error ? (
        <AppText size={13} color={Colors.danger}>
          {error}
        </AppText>
      ) : null}

      <View style={{ gap: Spacing.two }}>
        <SecondaryButton label="Gruppe verlassen" onPress={leave} />
      </View>
    </Page>
  );
}
