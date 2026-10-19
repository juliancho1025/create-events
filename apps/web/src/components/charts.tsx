import { useState } from 'react';
import { Text, useThemeName, XStack, YStack } from 'tamagui';

// Chart ink. Single-series charts, so one validated blue per mode; everything
// else is text/hairline grays. Text never wears the series color.
const INK = {
  light: { series: '#2a78d6', grid: '#e1e0d9', axis: '#c3c2b7', muted: '#898781', tooltip: '#0b0b0b', tooltipText: '#f0efec' },
  dark: { series: '#3987e5', grid: '#2c2c2a', axis: '#383835', muted: '#898781', tooltip: '#f0efec', tooltipText: '#0b0b0b' },
};

export function useChartInk() {
  return useThemeName().startsWith('dark') ? INK.dark : INK.light;
}

export const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;

type Align = 'start' | 'center' | 'end';
const ALIGN_STYLE: Record<Align, object> = {
  start: { left: 0 },
  center: { left: '50%', transform: 'translateX(-50%)' },
  end: { right: 0 },
};

/** Anchored toward the inside near the edges, so it never pokes out of the card. */
function Tooltip({ title, detail, ink, align = 'center' }: { title: string; detail?: string; ink: (typeof INK)['light']; align?: Align }) {
  return (
    <YStack
      position="absolute"
      b="100%"
      mb="$1.5"
      px="$2"
      py="$1.5"
      rounded="$2"
      z={5}
      pointerEvents="none"
      style={{ background: ink.tooltip, ...ALIGN_STYLE[align] }}
    >
      <Text fontSize="$2" fontWeight="600" style={{ color: ink.tooltipText, whiteSpace: 'nowrap' }}>
        {title}
      </Text>
      {detail && (
        <Text fontSize="$2" style={{ color: ink.tooltipText, whiteSpace: 'nowrap' }}>
          {detail}
        </Text>
      )}
    </YStack>
  );
}

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  /** Text at the bar tip. */
  valueLabel: string;
  tooltip: string;
  tooltipDetail?: string;
}

/** Ranked horizontal bars: name, bar from a shared baseline, value at the tip. */
export function HorizontalBars({ data, empty }: { data: BarDatum[]; empty: string }) {
  const ink = useChartInk();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <Text color="$color10">{empty}</Text>;

  return (
    <YStack gap="$1" role="list">
      {data.map((d) => (
        <XStack
          key={d.id}
          role="listitem"
          aria-label={[d.tooltip, d.tooltipDetail].filter(Boolean).join(': ')}
          items="center"
          gap="$3"
          py="$1"
          onMouseEnter={() => setHover(d.id)}
          onMouseLeave={() => setHover(null)}
        >
          <Text width={140} fontSize="$3" numberOfLines={1}>
            {d.label}
          </Text>
          <XStack flex={1} items="center" gap="$2" position="relative" height={24} style={{ borderLeft: `1px solid ${ink.axis}` }}>
            <YStack
              height={18}
              style={{
                width: `${(d.value / max) * 75}%`,
                minWidth: d.value ? 4 : 0,
                background: ink.series,
                borderRadius: '0 4px 4px 0',
                opacity: hover && hover !== d.id ? 0.55 : 1,
              }}
            />
            <Text fontSize="$2" color="$color11" style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {d.valueLabel}
            </Text>
            {hover === d.id && <Tooltip ink={ink} align="start" title={d.tooltip} detail={d.tooltipDetail} />}
          </XStack>
        </XStack>
      ))}
    </YStack>
  );
}

export interface ColumnDatum {
  id: string;
  /** 0..1 */
  value: number;
  axisLabel: string;
  tooltip: string;
  tooltipDetail?: string;
}

const PLOT_HEIGHT = 160;
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];

/** Rate columns over time on a fixed 0–100% axis, so events compare at a glance. */
export function RateColumns({ data, empty }: { data: ColumnDatum[]; empty: string }) {
  const ink = useChartInk();
  const [hover, setHover] = useState<string | null>(null);
  if (!data.length) return <Text color="$color10">{empty}</Text>;
  // Selective x labels: first and last only.
  const labelled = new Set([data[0].id, data[data.length - 1].id]);

  return (
    <XStack gap="$2">
      <YStack height={PLOT_HEIGHT} justify="space-between" items="flex-end" style={{ flexDirection: 'column-reverse' }}>
        {Y_TICKS.map((t) => (
          <Text key={t} fontSize="$1" lineHeight={12} style={{ color: ink.muted, fontVariantNumeric: 'tabular-nums', marginBottom: -6, marginTop: -6 }}>
            {percent(t)}
          </Text>
        ))}
      </YStack>
      <YStack flex={1} minW={0}>
        <XStack height={PLOT_HEIGHT} position="relative" items="flex-end" style={{ borderBottom: `1px solid ${ink.axis}` }}>
          {Y_TICKS.slice(1).map((t) => (
            <YStack key={t} position="absolute" l={0} r={0} height={1} pointerEvents="none" style={{ bottom: `${t * 100}%`, background: ink.grid }} />
          ))}
          {data.map((d, i) => (
            // The whole slot is the hit target, not just the (possibly zero-height) column.
            <YStack
              key={d.id}
              flex={1}
              height="100%"
              items="center"
              justify="flex-end"
              position="relative"
              role="img"
              aria-label={[d.tooltip, d.tooltipDetail].filter(Boolean).join(': ')}
              onMouseEnter={() => setHover(d.id)}
              onMouseLeave={() => setHover(null)}
            >
              <YStack
                width="70%"
                style={{
                  maxWidth: 24,
                  height: `${d.value * 100}%`,
                  minHeight: d.value ? 3 : 0,
                  background: ink.series,
                  borderRadius: '4px 4px 0 0',
                  opacity: hover && hover !== d.id ? 0.55 : 1,
                }}
              />
              {hover === d.id && (
                <YStack position="absolute" b={`${d.value * 100}%`} l={0} r={0}>
                  <Tooltip
                    ink={ink}
                    title={d.tooltip}
                    detail={d.tooltipDetail}
                    align={i < data.length / 3 ? 'start' : i >= (data.length * 2) / 3 ? 'end' : 'center'}
                  />
                </YStack>
              )}
            </YStack>
          ))}
        </XStack>
        <XStack mt="$1.5">
          {data.map((d) => (
            <Text key={d.id} flex={1} fontSize="$1" numberOfLines={1} style={{ color: ink.muted, textAlign: 'center', overflow: 'visible' }}>
              {labelled.has(d.id) ? d.axisLabel : ''}
            </Text>
          ))}
        </XStack>
      </YStack>
    </XStack>
  );
}
