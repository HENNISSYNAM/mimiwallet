import { describe, it, expect, vi, afterEach } from 'vitest';
import { removeGrant } from './bankhub';

/**
 * Case 4 nghiệm thu — xoá liên kết khi ngân hàng đòi OTP.
 *
 * Không ép được tình huống này trên sandbox: ngân hàng dùng để thử nghiệm cho
 * xoá thẳng, không hỏi OTP. Nhưng cái đáng kiểm không phải là Cas có hỏi OTP
 * hay không — mà là **hệ thống làm gì khi Cas hỏi**. Chỗ đó kiểm được bằng cách
 * cho `fetch` trả về đúng hai hình dạng response mà Cas có thể trả.
 *
 * Điều quan trọng nhất: cả hai đều là HTTP 200. Bên gọi buộc phải phân biệt
 * bằng trường trong body chứ không bằng mã trạng thái, và nhầm chỗ này nghĩa là
 * báo với khách rằng quyền truy cập đã đóng trong khi ngân hàng vẫn xem là còn
 * hiệu lực.
 */

const cfg = {
  baseUrl: 'https://sandbox.bankhub.dev',
  clientId: 'test-client',
  secretKey: 'test-secret',
} as Parameters<typeof removeGrant>[0];

function mockJson(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response);
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('removeGrant — hai hình dạng phản hồi của /grant/remove', () => {
  it('Cas trả grantToken ⇒ otpRequired, và grant CHƯA bị xoá', async () => {
    vi.stubGlobal('fetch', mockJson({ requestId: 'req-otp-1', grantToken: 'gt_abc123' }));

    const res = await removeGrant(cfg, 'access-token');

    expect(res.otpRequired).toBe(true);
    expect(res.grantToken).toBe('gt_abc123');
    // Bên gọi dùng đúng cờ này để quyết định KHÔNG đánh dấu disconnected.
    expect(res.requestId).toBe('req-otp-1');
  });

  it('Cas trả kết quả hoàn tất ⇒ otpRequired = false, được phép đánh dấu đã ngắt', async () => {
    vi.stubGlobal('fetch', mockJson({ requestId: 'req-done-1' }));

    const res = await removeGrant(cfg, 'access-token');

    expect(res.otpRequired).toBe(false);
    expect(res.grantToken).toBeUndefined();
  });

  it('grantToken rỗng không bị hiểu nhầm thành "cần OTP"', async () => {
    // Chuỗi rỗng đã từng gây lỗi thật ở luồng liên kết (Cas gọi onSuccess('')),
    // nên hình dạng đó được kiểm ở đây luôn thay vì giả định nó không xảy ra.
    vi.stubGlobal('fetch', mockJson({ requestId: 'req-empty', grantToken: '' }));

    const res = await removeGrant(cfg, 'access-token');

    expect(res.otpRequired).toBe(false);
  });
});
