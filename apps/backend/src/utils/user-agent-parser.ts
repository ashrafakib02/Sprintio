import { UAParser } from 'ua-parser-js';

// ── Types ────────────────────────────────────────────────────

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
  deviceType: DeviceType;
}

// ── Parser ───────────────────────────────────────────────────

/**
 * Parse a user-agent string into structured device metadata.
 * Returns readable names like "Chrome 120", "Windows 10", "iPhone".
 */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent) {
    return {
      browser: 'Unknown Browser',
      os: 'Unknown OS',
      device: 'Unknown Device',
      deviceType: 'unknown',
    };
  }

  const result = UAParser(userAgent);

  // ── Browser ──
  const browserName = result.browser.name ?? 'Unknown Browser';
  const browserVersion = result.browser.version;
  const browser = browserVersion ? `${browserName} ${browserVersion}` : browserName;

  // ── OS ──
  const osName = result.os.name ?? 'Unknown OS';
  const osVersion = result.os.version;
  const os = osVersion ? `${osName} ${osVersion}` : osName;

  // ── Device ──
  const deviceModel = result.device.model;
  const deviceVendor = result.device.vendor;
  let device: string;

  if (deviceModel) {
    device = deviceVendor ? `${deviceVendor} ${deviceModel}` : deviceModel;
  } else {
    // No device model — this is typically a desktop/laptop
    device = 'Computer';
  }

  // ── Device Type ──
  let deviceType: DeviceType = 'unknown';
  const uaDeviceType = result.device.type;

  if (uaDeviceType === 'mobile') {
    deviceType = 'mobile';
  } else if (uaDeviceType === 'tablet') {
    deviceType = 'tablet';
  } else if (!uaDeviceType) {
    // No type detected — likely a desktop browser
    deviceType = 'desktop';
  }

  // Detect bots via user-agent keywords (ua-parser-js may detect some, but not all)
  const lowerUA = userAgent.toLowerCase();
  if (
    lowerUA.includes('bot') ||
    lowerUA.includes('crawler') ||
    lowerUA.includes('spider') ||
    lowerUA.includes('curl') ||
    lowerUA.includes('wget') ||
    lowerUA.includes('python-requests')
  ) {
    deviceType = 'bot';
  }

  return { browser, os, device, deviceType };
}
