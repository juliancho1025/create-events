import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventMetricDto {
  @ApiProperty({ example: 'no-show' }) key: string;
  @ApiProperty({ example: 'No-show' }) label: string;
}

export class MetricCountDto {
  @ApiProperty({ description: 'Times the metric was marked' }) count: number;
  @ApiProperty({ description: 'Attendances where the metric was tracked (the rate denominator)' })
  opportunities: number;
}

export class UserMetricsDto {
  @ApiProperty() userId: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiProperty({ type: 'object', additionalProperties: { $ref: '#/components/schemas/MetricCountDto' } })
  stats: Record<string, MetricCountDto>;
}

export class EventMetricsDto {
  @ApiProperty() eventId: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, format: 'date-time' }) startsAt: string;
  @ApiProperty({ type: 'object', additionalProperties: { $ref: '#/components/schemas/MetricCountDto' } })
  stats: Record<string, MetricCountDto>;
}

export class MetricsReportDto {
  @ApiProperty({ type: [EventMetricDto], description: 'Every metric used by a started event' })
  metrics: EventMetricDto[];
  @ApiProperty({ type: [UserMetricsDto] }) users: UserMetricsDto[];
  @ApiProperty({ type: [EventMetricsDto], description: 'Oldest first' }) events: EventMetricsDto[];
}
