import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { ScreenContentWrapper } from 'react-native-screens';

import { Colors } from '@/constants/theme';

// Inhalt fuer iOS-formSheets. Ohne ScreenContentWrapper setzt react-native-screens die
// ScrollView auf den Rahmen des ganzen Sheets inklusive Position, sodass der Inhalt
// ausserhalb des sichtbaren Bereichs landet und das Sheet leer wirkt. Die ScrollView muss
// das erste Kind sein; eine Fusszeile darf als zweites Kind folgen.
export function SheetScroll({ footer, children, ...props }: ScrollViewProps & { footer?: React.ReactNode }) {
  return (
    <ScreenContentWrapper style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView {...props}>{children}</ScrollView>
      {footer ? (
        <View collapsable={false} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          {footer}
        </View>
      ) : null}
    </ScreenContentWrapper>
  );
}
