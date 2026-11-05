import { describe, expect, it } from "vitest";
import {
  IOS_INSTALL_HINT,
  installHintFor,
  isIosDevice,
  isStandaloneMode,
  type PwaEnvironment,
} from "../src/platform/pwa-model";
import {
  OFFLINE_NOTICE,
  pwaNotice,
  pwaNoticeText,
  type PwaNoticeInput,
} from "../src/ui/pwa-notice";

function environment(
  overrides: Partial<PwaEnvironment> = {},
): PwaEnvironment {
  return {
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0",
    standalone: false,
    displayModeStandalone: false,
    maxTouchPoints: 0,
    ...overrides,
  };
}

function noticeInput(
  overrides: Partial<PwaNoticeInput> = {},
): PwaNoticeInput {
  return {
    online: true,
    offlineReady: false,
    needRefresh: false,
    canInstall: false,
    installed: false,
    installHint: null,
    ...overrides,
  };
}

describe("pwa environment", () => {
  it("detects iOS phones, iPads, and iPadOS desktop user agents", () => {
    expect(
      isIosDevice(
        environment({
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
        }),
      ),
    ).toBe(true);
    expect(
      isIosDevice(
        environment({
          userAgent:
            "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
        }),
      ),
    ).toBe(true);
    expect(
      isIosDevice(
        environment({
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
          maxTouchPoints: 5,
        }),
      ),
    ).toBe(true);
    expect(isIosDevice(environment())).toBe(false);
  });

  it("treats either standalone signal as installed", () => {
    expect(
      isStandaloneMode(environment({ displayModeStandalone: true })),
    ).toBe(true);
    expect(isStandaloneMode(environment({ standalone: true }))).toBe(true);
    expect(isStandaloneMode(environment())).toBe(false);
  });

  it("shows the iOS hint only in a Safari tab", () => {
    const iphone = environment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    expect(installHintFor(iphone)).toBe(IOS_INSTALL_HINT);
    expect(installHintFor({ ...iphone, standalone: true })).toBeNull();
    expect(installHintFor(environment())).toBeNull();
  });
});

describe("hub PWA notice", () => {
  it("prioritises updates over the offline state", () => {
    expect(
      pwaNotice(noticeInput({ needRefresh: true, online: false })),
    ).toBe("update");
  });

  it("prioritises offline over ready and install", () => {
    expect(
      pwaNotice(
        noticeInput({
          online: false,
          offlineReady: true,
          canInstall: true,
        }),
      ),
    ).toBe("offline");
  });

  it("shows the one-shot offline-ready confirmation", () => {
    expect(pwaNotice(noticeInput({ offlineReady: true }))).toBe("ready");
  });

  it("offers installation only when the app is not installed", () => {
    expect(pwaNotice(noticeInput({ canInstall: true }))).toBe("install");
    expect(
      pwaNotice(noticeInput({ canInstall: true, installed: true })),
    ).toBeNull();
    expect(
      pwaNotice(
        noticeInput({
          installHint: IOS_INSTALL_HINT,
        }),
      ),
    ).toBe("install");
  });

  it("returns no notice when everything is quiet", () => {
    expect(pwaNotice(noticeInput())).toBeNull();
    expect(pwaNoticeText(noticeInput())).toBeNull();
  });

  it("renders concise, distinct messages", () => {
    expect(pwaNoticeText(noticeInput({ needRefresh: true }))).toBe(
      "A new version is ready.",
    );
    expect(pwaNoticeText(noticeInput({ online: false }))).toBe(
      OFFLINE_NOTICE,
    );
    expect(
      pwaNoticeText(noticeInput({ offlineReady: true })),
    ).toBe("Ready to play offline.");
    expect(
      pwaNoticeText(noticeInput({ installHint: IOS_INSTALL_HINT })),
    ).toBe(IOS_INSTALL_HINT);
  });
});
