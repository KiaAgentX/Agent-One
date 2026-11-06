/**
 * telegram.ts — typed, defensive wrapper over the Telegram WebApp API.
 * In production (opened from a Telegram bot button) `window.Telegram` exists;
 * in plain-browser dev (`pnpm dev`) every call degrades gracefully so the
 * same code runs everywhere. Level-B UI, RULEBOOK Law 9.
 */

interface TgUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: TgUserData };
  version: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  ready(): void;
  expand(): void;
  close(): void;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  };
  openTelegramLink(url: string): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function tg(): TgWebApp | undefined {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
}

export function isTelegram(): boolean {
  return tg() !== undefined;
}

/** Must be called once on mount — tells Telegram the app is ready. */
export function initTelegram(): void {
  const app = tg();
  if (!app) return;
  app.ready();
  app.expand();
  app.setHeaderColor?.('#05070f');
  app.setBackgroundColor?.('#05070f');
}

export function haptic(type: 'error' | 'success' | 'warning' = 'success'): void {
  tg()?.HapticFeedback?.notificationOccurred(type);
}

export function tgUser(): TgUserData | undefined {
  return tg()?.initDataUnsafe?.user;
}
