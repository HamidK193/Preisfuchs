import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { formatEuro } from '@/lib/pricing';

const HEIGHT = 120;

// Einfache Linie fuer den Preisverlauf; der letzte Punkt ist der aktuelle Bestpreis.
export function PriceChart({ values }: { values: number[] }) {
  const [width, setWidth] = useState(0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const range = max - min || 1;
  const pad = 8;

  const x = (index: number) => pad + (index / (values.length - 1)) * (width - pad * 2);
  const y = (value: number) => pad + (1 - (value - min) / range) * (HEIGHT - pad * 2);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const last = values.length - 1;

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ height: HEIGHT }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Line x1={pad} x2={width - pad} y1={y(average)} y2={y(average)} stroke={Colors.border} strokeDasharray="4 4" strokeWidth={1} />
            <Polyline points={points} fill="none" stroke={Colors.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={x(last)} cy={y(values[last])} r={5} fill={Colors.green} />
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[
          ['Tiefstpreis', min],
          ['Durchschnitt', average],
          ['Höchstpreis', max],
        ].map(([label, value]) => (
          <View key={label as string} style={{ gap: 2 }}>
            <AppText size={12} color={Colors.textSecondary}>
              {label as string}
            </AppText>
            <AppText weight="bold" size={15}>
              {formatEuro(value as number)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
