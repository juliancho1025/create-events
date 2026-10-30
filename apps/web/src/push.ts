import { useApi } from '@events/shared';
import { useCallback, useEffect, useState } from 'react';

// Web-only: Web Push needs a service worker. A React Native app would use expo-notifications instead.

export type PushState =
  | 'unsupported' // no service worker / Push API (e.g. iOS Safari outside a home-screen app)
  | 'unavailable' // the API has no VAPID keys configured
  | 'denied' // the user blocked notifications for this site
  | 'off'
  | 'on';

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const registration = () => navigator.serviceWorker.register('/sw.js');

/** VAPID keys are base64url; PushManager wants the raw bytes. */
function urlBase64ToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** This browser's push subscription for the signed-in user, with on/off controls. */
export function usePushNotifications() {
  const api = useApi();
  const [state, setState] = useState<PushState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let next: PushState;
      if (!supported()) next = 'unsupported';
      else if (Notification.permission === 'denied') next = 'denied';
      else if (!(await api.pushPublicKey()).publicKey) next = 'unavailable';
      else {
        const subscription = await (await registration()).pushManager.getSubscription();
        // Re-send it: the server copy may belong to another user who used this browser before.
        if (subscription) await api.subscribePush(subscription.toJSON() as Parameters<typeof api.subscribePush>[0]);
        next = subscription ? 'on' : 'off';
      }
      if (!cancelled) setState(next);
    })().catch((err: Error) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [api]);

  const run = useCallback(async (action: () => Promise<PushState>) => {
    setPending(true);
    setError(null);
    try {
      setState(await action());
    } catch (err) {
      setError(err as Error);
    } finally {
      setPending(false);
    }
  }, []);

  // Must run from a click: browsers only show the permission prompt on a user gesture.
  const enable = () =>
    run(async () => {
      const { publicKey } = await api.pushPublicKey();
      if (!publicKey) return 'unavailable';
      if ((await Notification.requestPermission()) !== 'granted') {
        return Notification.permission === 'denied' ? 'denied' : 'off';
      }
      const subscription = await (await registration()).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(publicKey),
      });
      await api.subscribePush(subscription.toJSON() as Parameters<typeof api.subscribePush>[0]);
      return 'on';
    });

  const disable = () => run(async () => ((await unsubscribe(api)), 'off'));

  return { state, pending, error, enable, disable };
}

/** Removes this browser's subscription locally and on the server. Call before signing out. */
export async function unsubscribe(api: ReturnType<typeof useApi>): Promise<void> {
  if (!supported()) return;
  const subscription = await (await navigator.serviceWorker.getRegistration('/sw.js'))?.pushManager.getSubscription();
  if (!subscription) return;
  await api.unsubscribePush(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe();
}
