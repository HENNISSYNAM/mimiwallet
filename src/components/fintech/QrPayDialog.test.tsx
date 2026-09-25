import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/store/useAuthStore', () => ({ useAuthStore: () => ({ session: { access_token: 't' } }) }));
vi.mock('@/lib/congTyDangDung', () => ({ kemCongTy: async (du: Record<string, unknown>) => ({ ...du, company_id: 'cty-dang-chon' }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/track', () => ({ track: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toCanvas: vi.fn(async () => {}) } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) } }));

import { QrPayDialog } from './QrPayDialog';

afterEach(() => { vi.unstubAllGlobals(); });

describe('Nhận tiền QR', () => {
  it('hoá đơn minh hoạ: KHÔNG gọi máy chủ tạo mã thật, hiện đúng số tiền + nội dung, không có "không tìm thấy"', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    render(<QrPayDialog open onOpenChange={() => {}} invoiceId="a1" invoiceNumber="MH-260903" amount={5_645_000} description="MH260903" laMinhHoa />);
    const khung = await screen.findByTestId('qr-minh-hoa');
    expect(khung.textContent).toContain('MH-260903');
    expect(khung.textContent).toContain('5.645.000');
    expect(khung.textContent).toContain('MH260903');
    expect(f).not.toHaveBeenCalled();
    expect(screen.queryByText(/Không tìm thấy hoá đơn/)).toBeNull();
  });

  it('hoá đơn thật: gửi đúng id hoá đơn VÀ công ty đang chọn — không để máy chủ đoán công ty', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ error: 'x' }), { status: 400 }));
    vi.stubGlobal('fetch', f);
    render(<QrPayDialog open onOpenChange={() => {}} invoiceId="b2" invoiceNumber="HD-000777" amount={2_000_000} description="HD000777" />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ invoice_id: 'b2', amount: 2_000_000, description: 'HD000777', company_id: 'cty-dang-chon' });
  });
});
