import { useMetricsReport, type MetricCount, type MetricsReport } from '@events/shared';
import { ArrowDown } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { Card, H2, H4, Paragraph, Text, XStack, YStack } from 'tamagui';
import { HorizontalBars, percent, RateColumns } from '../components/charts';
import { PageState } from '../components/PageState';

const TOP_USERS = 10;
const RECENT_EVENTS = 24;
const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

const rate = (c?: MetricCount) => (c?.opportunities ? c.count / c.opportunities : 0);
const sum = (counts: (MetricCount | undefined)[]) =>
  counts.reduce<MetricCount>((acc, c) => ({ count: acc.count + (c?.count ?? 0), opportunities: acc.opportunities + (c?.opportunities ?? 0) }), {
    count: 0,
    opportunities: 0,
  });
const timesLabel = (n: number) => `${n} ${n === 1 ? 'time' : 'times'}`;

export function MetricsPage() {
  const { data: report, isPending, error } = useMetricsReport();
  const [selected, setSelected] = useState<string | null>(null);

  if (isPending || error) return <PageState loading={isPending} error={error} />;
  if (!report.metrics.length) {
    return (
      <YStack gap="$4">
        <H2>Attendee metrics</H2>
        <PageState empty="No started event tracks metrics yet. Add metrics to an event, then mark attendees after it starts." />
      </YStack>
    );
  }

  const metric = report.metrics.find((m) => m.key === selected) ?? report.metrics[0];
  return (
    <YStack gap="$5">
      <YStack gap="$1">
        <H2>Attendee metrics</H2>
        <Paragraph color="$color10">
          Across {report.events.length} {report.events.length === 1 ? 'event' : 'events'} that have started. Rate = times
          marked ÷ tracked events the person attended.
        </Paragraph>
      </YStack>

      {/* The tiles double as the metric filter for everything below. */}
      <XStack gap="$3" flexWrap="wrap" role="radiogroup" aria-label="Metric">
        {report.metrics.map((m) => {
          const total = sum(report.users.map((u) => u.stats[m.key]));
          const active = m.key === metric.key;
          return (
            <Card
              key={m.key}
              role="radio"
              aria-checked={active}
              flex={1}
              minW={180}
              p="$4"
              gap="$1"
              cursor="pointer"
              borderWidth={active ? 2 : 1}
              borderColor={active ? '$accent9' : '$borderColor'}
              onPress={() => setSelected(m.key)}
            >
              <Text fontSize="$3" color="$color11">
                {m.label}
              </Text>
              <Text fontSize="$9" fontWeight="600">
                {percent(rate(total))}
              </Text>
              <Text fontSize="$2" color="$color10">
                {total.count} of {total.opportunities} attendances
              </Text>
            </Card>
          );
        })}
      </XStack>

      <XStack gap="$4" flexWrap="wrap" items="stretch">
        <ChartCard title={`Most ${metric.label.toLowerCase()}`} subtitle={`Top ${TOP_USERS} people by times marked`}>
          <HorizontalBars
            empty="Nobody has been marked yet."
            data={report.users
              .filter((u) => u.stats[metric.key]?.count)
              .sort((a, b) => b.stats[metric.key].count - a.stats[metric.key].count || rate(b.stats[metric.key]) - rate(a.stats[metric.key]))
              .slice(0, TOP_USERS)
              .map((u) => {
                const s = u.stats[metric.key];
                return {
                  id: u.userId,
                  label: u.name,
                  value: s.count,
                  valueLabel: `${s.count} · ${percent(rate(s))}`,
                  tooltip: u.name,
                  tooltipDetail: `${timesLabel(s.count)} in ${s.opportunities} tracked events (${percent(rate(s))})`,
                };
              })}
          />
        </ChartCard>
        <ChartCard title={`${metric.label} rate per event`} subtitle={`Last ${RECENT_EVENTS} events tracking it, oldest first`}>
          <RateColumns
            empty="No events track this metric."
            data={report.events
              .filter((e) => e.stats[metric.key])
              .slice(-RECENT_EVENTS)
              .map((e) => {
                const s = e.stats[metric.key];
                return {
                  id: e.eventId,
                  value: rate(s),
                  axisLabel: shortDate.format(new Date(e.startsAt)),
                  tooltip: `${e.name} · ${shortDate.format(new Date(e.startsAt))}`,
                  tooltipDetail: `${s.count} of ${s.opportunities} attendees (${percent(rate(s))})`,
                };
              })}
          />
        </ChartCard>
      </XStack>

      <PeopleTable report={report} sortBy={metric.key} onSort={setSelected} />
    </YStack>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card flex={1} flexBasis={420} minW={280} p="$4" gap="$3" borderWidth={1} borderColor="$borderColor">
      <YStack>
        <H4>{title}</H4>
        <Text fontSize="$2" color="$color10">
          {subtitle}
        </Text>
      </YStack>
      {children}
    </Card>
  );
}

/** Every person × metric: the full numbers behind the charts, and the accessible view of them. */
function PeopleTable({ report, sortBy: key, onSort }: { report: MetricsReport; sortBy: string; onSort: (key: string) => void }) {
  const rows = [...report.users].sort(
    (a, b) => (b.stats[key]?.count ?? 0) - (a.stats[key]?.count ?? 0) || rate(b.stats[key]) - rate(a.stats[key]) || a.name.localeCompare(b.name),
  );
  const cell = { padding: '8px 12px', textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' };

  return (
    <Card p="$4" gap="$3" borderWidth={1} borderColor="$borderColor">
      <H4>Everyone</H4>
      <YStack style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: 'left' }}>
                <Text fontSize="$2" color="$color10">
                  Person
                </Text>
              </th>
              {report.metrics.map((m) => (
                <th key={m.key} style={cell} aria-sort={m.key === key ? 'descending' : 'none'}>
                  <button
                    type="button"
                    onClick={() => onSort(m.key)}
                    style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', gap: 4, alignItems: 'center' }}
                  >
                    <Text fontSize="$2" color={m.key === key ? '$color12' : '$color10'} fontWeight={m.key === key ? '600' : '400'}>
                      {m.label}
                    </Text>
                    {m.key === key && <ArrowDown size={12} />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.userId} style={{ borderTop: '1px solid var(--borderColor)' }}>
                <td style={{ ...cell, textAlign: 'left' }}>
                  <Text fontSize="$3">{u.name}</Text>
                  <Text fontSize="$1" color="$color10" display="block">
                    {u.email}
                  </Text>
                </td>
                {report.metrics.map((m) => {
                  const s = u.stats[m.key];
                  return (
                    <td key={m.key} style={cell}>
                      {s ? (
                        <Text fontSize="$3" fontWeight={s.count ? '600' : '400'} color={s.count ? '$color12' : '$color10'}>
                          {s.count}/{s.opportunities}
                          <Text fontSize="$2" color="$color10">
                            {' '}
                            ({percent(rate(s))})
                          </Text>
                        </Text>
                      ) : (
                        <Text fontSize="$3" color="$color8" aria-label="Not tracked">
                          –
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </YStack>
    </Card>
  );
}
