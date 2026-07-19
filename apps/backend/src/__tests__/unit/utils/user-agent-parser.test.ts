import { describe, it, expect } from 'vitest';
import { parseUserAgent } from '../../../utils/user-agent-parser.js';

describe('user-agent-parser', () => {
  describe('Chrome on Windows desktop', () => {
    const chromeWindows =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    it('should detect Chrome browser with version', () => {
      const result = parseUserAgent(chromeWindows);
      expect(result.browser).toContain('Chrome');
      expect(result.browser).toContain('120');
    });

    it('should detect Windows OS', () => {
      const result = parseUserAgent(chromeWindows);
      expect(result.os).toContain('Windows');
    });

    it('should classify as desktop device', () => {
      const result = parseUserAgent(chromeWindows);
      expect(result.deviceType).toBe('desktop');
    });

    it('should show "Computer" for device name (no mobile model)', () => {
      const result = parseUserAgent(chromeWindows);
      expect(result.device).toBe('Computer');
    });
  });

  describe('Safari on iPhone', () => {
    const safariIPhone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    it('should detect Safari browser', () => {
      const result = parseUserAgent(safariIPhone);
      expect(result.browser).toContain('Safari');
    });

    it('should detect iOS', () => {
      const result = parseUserAgent(safariIPhone);
      expect(result.os).toContain('iOS');
    });

    it('should classify as mobile device', () => {
      const result = parseUserAgent(safariIPhone);
      expect(result.deviceType).toBe('mobile');
    });

    it('should detect iPhone device', () => {
      const result = parseUserAgent(safariIPhone);
      expect(result.device).toContain('iPhone');
    });
  });

  describe('Safari on iPad', () => {
    const safariIPad =
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    it('should classify as tablet device', () => {
      const result = parseUserAgent(safariIPad);
      expect(result.deviceType).toBe('tablet');
    });
  });

  describe('Bot detection', () => {
    it('should detect Googlebot', () => {
      const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
      const result = parseUserAgent(ua);
      expect(result.deviceType).toBe('bot');
    });

    it('should detect "bot" keyword', () => {
      const ua = 'SomeBot/1.0 crawler';
      const result = parseUserAgent(ua);
      expect(result.deviceType).toBe('bot');
    });

    it('should detect "crawler" keyword', () => {
      const ua = 'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)';
      const result = parseUserAgent(ua);
      expect(result.deviceType).toBe('bot');
    });

    it('should detect "spider" keyword', () => {
      const ua = 'Mozilla/5.0 (compatible; SpiderBot/1.0)';
      const result = parseUserAgent(ua);
      expect(result.deviceType).toBe('bot');
    });

    it('should detect "curl" keyword', () => {
      const ua = 'curl/7.88.1';
      const result = parseUserAgent(ua);
      expect(result.deviceType).toBe('bot');
    });

    it('should detect "wget" keyword', () => {
      const ua = 'Wget/1.21.3';
      const result = parseUserAgent(ua);
      expect(result.deviceType).toBe('bot');
    });

    it('should detect "python-requests" keyword', () => {
      const ua = 'python-requests/2.31.0';
      const result = parseUserAgent(ua);
      expect(result.deviceType).toBe('bot');
    });
  });

  describe('null and undefined handling', () => {
    it('should return defaults for null user-agent', () => {
      const result = parseUserAgent(null);
      expect(result).toEqual({
        browser: 'Unknown Browser',
        os: 'Unknown OS',
        device: 'Unknown Device',
        deviceType: 'unknown',
      });
    });

    it('should return defaults for undefined user-agent', () => {
      const result = parseUserAgent(undefined);
      expect(result).toEqual({
        browser: 'Unknown Browser',
        os: 'Unknown OS',
        device: 'Unknown Device',
        deviceType: 'unknown',
      });
    });

    it('should return defaults for empty string', () => {
      const result = parseUserAgent('');
      expect(result).toEqual({
        browser: 'Unknown Browser',
        os: 'Unknown OS',
        device: 'Unknown Device',
        deviceType: 'unknown',
      });
    });
  });

  describe('Firefox on Linux', () => {
    const firefoxLinux = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';

    it('should detect Firefox', () => {
      const result = parseUserAgent(firefoxLinux);
      expect(result.browser).toContain('Firefox');
      expect(result.browser).toContain('121');
    });

    it('should detect Linux OS', () => {
      const result = parseUserAgent(firefoxLinux);
      expect(result.os).toContain('Linux');
    });

    it('should classify as desktop', () => {
      const result = parseUserAgent(firefoxLinux);
      expect(result.deviceType).toBe('desktop');
    });
  });

  describe('Chrome on Android', () => {
    const chromeAndroid =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

    it('should classify as mobile', () => {
      const result = parseUserAgent(chromeAndroid);
      expect(result.deviceType).toBe('mobile');
    });

    it('should detect Android OS', () => {
      const result = parseUserAgent(chromeAndroid);
      expect(result.os).toContain('Android');
    });
  });
});
