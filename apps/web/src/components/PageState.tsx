import { ErrorText } from '@events/ui';
import { Paragraph, Spinner, YStack } from 'tamagui';

/** Centered loading spinner or error message for a whole page. */
export function PageState({ loading, error, empty }: { loading?: boolean; error?: Error | null; empty?: string }) {
  return (
    <YStack flex={1} items="center" justify="center" py="$10" gap="$3">
      {loading ? (
        <Spinner size="large" />
      ) : error ? (
        <ErrorText>{error.message}</ErrorText>
      ) : (
        <Paragraph color="$color10">{empty}</Paragraph>
      )}
    </YStack>
  );
}
