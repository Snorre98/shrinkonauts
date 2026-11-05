/**
 * Pure PWA presentation helpers.
 *
 * This module has no DOM or service-worker imports so it can be unit tested in
 * the Node environment. The browser adapter lives in `pwa.ts`.
 */

export interface PwaEnvironment {
  userAgent: string;
  /** iOS Safari's non-standard `navigator.standalone` flag. */
  standalone: boolean;
  /** `matchMedia("(display-mode: standalone)")` for installed Chromium apps. */
  displayModeStandalone: boolean;
  /** iPadOS 13+ reports a desktop Macintosh user agent. */
  maxTouchPoints?: number;
}

export const IOS_INSTALL_HINT =
  "On iPhone or iPad: tap Share, then Add to Home Screen.";

export function isIosDevice(environment: PwaEnvironment): boolean {
  if (/iphone|ipad|ipod/i.test(environment.userAgent)) return true;
  return (
    /macintosh/i.test(environment.userAgent) &&
    (environment.maxTouchPoints ?? 0) > 1
  );
}

export function isStandaloneMode(environment: PwaEnvironment): boolean {
  return environment.standalone || environment.displayModeStandalone;
}

export function installHintFor(
  environment: PwaEnvironment,
): string | null {
  if (isStandaloneMode(environment)) return null;
  return isIosDevice(environment) ? IOS_INSTALL_HINT : null;
}
