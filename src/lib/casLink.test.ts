import { describe, expect, it, beforeEach } from 'vitest';
import {
  NEN_LINK_PRODUCTION,
  NEN_LINK_SANDBOX,
  dongKhungCasLink,
  moKhungCasLink,
  nenLinkHopLe,
  urlCasLink,
} from './casLink';

const CO_BAN = { redirectUri: 'https://mimiwallet.vercel.app/bank/callback', grantToken: 'gt_1' };

describe('nền Cas Link', () => {
  it('production thì mở link.bankhub.dev, không phải dev', () => {
    const u = new URL(urlCasLink({ ...CO_BAN, linkBaseUrl: NEN_LINK_PRODUCTION }));
    expect(u.origin).toBe(NEN_LINK_PRODUCTION);
  });

  it('không có nền từ máy chủ thì về sandbox — sai môi trường còn hơn gửi khách đi đâu không rõ', () => {
    expect(new URL(urlCasLink(CO_BAN)).origin).toBe(NEN_LINK_SANDBOX);
    expect(new URL(urlCasLink({ ...CO_BAN, linkBaseUrl: null })).origin).toBe(NEN_LINK_SANDBOX);
  });

  it('nền lạ bị bỏ, không mang grant token ra khỏi bankhub.dev', () => {
    for (const xau of [
      'https://bankhub.dev.evil.com',
      'https://evil.com',
      'http://link.bankhub.dev',
      'javascript:alert(1)',
      'https://notbankhub.dev',
    ]) {
      expect(nenLinkHopLe(xau)).toBeNull();
      expect(new URL(urlCasLink({ ...CO_BAN, linkBaseUrl: xau })).origin).toBe(NEN_LINK_SANDBOX);
    }
  });

  it('nhận mọi tên miền con https của bankhub.dev', () => {
    expect(nenLinkHopLe('https://link.bankhub.dev/')).toBe('https://link.bankhub.dev');
    expect(nenLinkHopLe('https://dev.link.bankhub.dev')).toBe(NEN_LINK_SANDBOX);
    expect(nenLinkHopLe('https://bankhub.dev')).toBe('https://bankhub.dev');
  });
});

describe('tham số gửi sang Cas Link', () => {
  it('mang đủ grantToken, redirectUri, iframe, feature, state', () => {
    const u = new URL(
      urlCasLink({
        ...CO_BAN,
        linkBaseUrl: NEN_LINK_PRODUCTION,
        iframe: true,
        feature: 'qrpay',
        fiServiceType: 'all',
        state: 'abc123',
      }),
    );
    expect(u.searchParams.get('grantToken')).toBe('gt_1');
    expect(u.searchParams.get('redirectUri')).toBe(CO_BAN.redirectUri);
    expect(u.searchParams.get('iframe')).toBe('true');
    expect(u.searchParams.get('feature')).toBe('qrpay');
    expect(u.searchParams.get('fiServiceType')).toBe('all');
    expect(u.searchParams.get('state')).toBe('abc123');
  });

  it('không kèm feature khi liên kết đọc sao kê — lọc theo QR sẽ giấu mất ngân hàng dùng được', () => {
    const u = new URL(urlCasLink({ ...CO_BAN, linkBaseUrl: NEN_LINK_PRODUCTION, iframe: true }));
    expect(u.searchParams.has('feature')).toBe(false);
  });

  it('thiếu grantToken hoặc redirectUri thì ném lỗi thay vì mở màn trống', () => {
    expect(() => urlCasLink({ ...CO_BAN, grantToken: '' })).toThrow();
    expect(() => urlCasLink({ ...CO_BAN, redirectUri: '' })).toThrow();
  });

  it('state có dấu cách thì ném lỗi', () => {
    expect(() => urlCasLink({ ...CO_BAN, state: 'a b' })).toThrow();
  });
});

describe('khung iframe', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('mở một lần, lần hai không chồng thêm', () => {
    expect(moKhungCasLink('https://link.bankhub.dev?x=1')).toBe(true);
    expect(moKhungCasLink('https://link.bankhub.dev?x=1')).toBe(false);
    expect(document.querySelectorAll('#bankhub-iframe').length).toBe(1);
  });

  it('đóng thì gỡ hẳn khỏi trang', () => {
    moKhungCasLink('https://link.bankhub.dev?x=1');
    dongKhungCasLink();
    expect(document.getElementById('bankhub-iframe')).toBeNull();
  });
});
