// Cùng bộ header với các function khác trong repo; chưa có module dùng chung.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Tra cứu người nộp thuế qua XInvoice (dữ liệu từ Tổng cục Thuế).
 *
 * Thay cho cách cũ: gọi Firecrawl scrape trang masothue.com rồi bắt tên bằng
 * regex trên markdown. Cách đó hỏng theo ba đường khác nhau — trang đổi bố cục,
 * Firecrawl hết hạn mức, hoặc regex bắt trúng một dòng khác — và cả ba đều im
 * lặng: khách chỉ thấy "không tìm thấy" rồi ngồi gõ tay.
 *
 * API này trả JSON có cấu trúc nên không phải đoán gì. Ba điều nó dạy ra mà bản
 * scrape không có:
 *
 *  1. **Một mã số thuế trả về NHIỀU bản ghi.** Hộ kinh doanh có thể có cơ sở
 *     chính, chi nhánh, và bản ghi cá nhân cũ đã đóng — cùng một mã. Lấy bừa
 *     bản ghi đầu là điền nhầm địa chỉ.
 *  2. **`status` là thông tin quan trọng nhất**, không phải tên. Một mã đã
 *     "ngừng hoạt động và đã đóng MST" mà vẫn điền vào biểu mẫu như bình thường
 *     là để khách đăng ký bằng một pháp nhân không còn tồn tại.
 *  3. **Không có trường ngành nghề.** Nên ô ngành nghề vẫn phải khách tự chọn —
 *     ghi ra đây để lần sau không ai đi tìm nó trong response.
 */

const XINVOICE_URL = "https://api.xinvoice.vn/gdt-api/tax-payer-records";

/** Các trạng thái nghĩa là người nộp thuế còn hoạt động. */
function dangHoatDong(status: string): boolean {
  return status.startsWith("NNT đang hoạt động");
}

interface TaxRecord {
  orgType?: string;
  taxID?: string;
  name?: string;
  address?: string;
  taxDepartment?: string;
  status?: string;
  updatedAt?: string;
}

/**
 * Chọn bản ghi đáng tin nhất trong danh sách trả về.
 *
 * Thứ tự ưu tiên: còn hoạt động trước đã đóng; mã khớp chính xác trước mã chi
 * nhánh (chi nhánh có đuôi `-001`). Không có bản ghi nào còn hoạt động thì vẫn
 * trả về bản đầu, kèm cờ để phía trên cảnh báo — im lặng bỏ qua còn tệ hơn.
 */
function chonBanGhi(records: TaxRecord[], taxCode: string): TaxRecord | undefined {
  const diem = (r: TaxRecord) =>
    (dangHoatDong(r.status ?? "") ? 2 : 0) + (r.taxID === taxCode ? 1 : 0);
  return [...records].sort((a, b) => diem(b) - diem(a))[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { taxCode } = await req.json().catch(() => ({ taxCode: "" }));
    const ma = String(taxCode ?? "").trim();

    /*
     * 10 số cho doanh nghiệp, 12 số cho hộ kinh doanh và cá nhân — từ
     * 01/07/2025 số định danh cá nhân thay thế mã số thuế cho nhóm đó. Chốt cũ
     * chỉ nhận 10 số, tức chặn đúng nhóm khách chính của sản phẩm này.
     * Mã chi nhánh có đuôi `-001` nên độ dài đo trên phần trước dấu gạch.
     */
    const goc = ma.split("-")[0];
    if (!/^\d{10}$|^\d{12}$/.test(goc)) {
      return json({ error: "Mã số thuế phải là 10 số (doanh nghiệp) hoặc 12 số (hộ kinh doanh)" }, 400);
    }

    const clientId = Deno.env.get("XINVOICE_CLIENT_ID");
    const apiKey = Deno.env.get("XINVOICE_API_KEY");
    if (!clientId || !apiKey) {
      console.error("thiếu XINVOICE_CLIENT_ID hoặc XINVOICE_API_KEY");
      return json({ error: "Chưa cấu hình tra cứu mã số thuế" }, 503);
    }

    const res = await fetch(`${XINVOICE_URL}/${encodeURIComponent(ma)}`, {
      headers: { Accept: "application/json", "client-id": clientId, "api-key": apiKey },
    });

    if (!res.ok) {
      console.error(`xinvoice ${res.status} cho mã ${ma}`);
      return json({ found: false, error: `Tra cứu thất bại (${res.status})` }, 502);
    }

    const body = await res.json();
    const records: TaxRecord[] = Array.isArray(body?.data) ? body.data : [];
    if (!body?.success || records.length === 0) {
      return json({ found: false });
    }

    const chon = chonBanGhi(records, ma);
    const soConHoatDong = records.filter((r) => dangHoatDong(r.status ?? "")).length;

    return json({
      found: true,
      record: {
        taxID: chon?.taxID ?? ma,
        name: chon?.name ?? "",
        address: chon?.address ?? "",
        orgType: chon?.orgType ?? "",
        taxDepartment: chon?.taxDepartment ?? "",
        status: chon?.status ?? "",
      },
      // Phía giao diện dùng hai số này để nói thật với khách thay vì âm thầm
      // điền: bao nhiêu bản ghi cùng mã, và bản đang điền có còn hiệu lực không.
      tongSoBanGhi: records.length,
      soConHoatDong,
      conHoatDong: dangHoatDong(chon?.status ?? ""),
    });
  } catch (e) {
    console.error("tax-lookup lỗi", e);
    return json({ error: (e as Error)?.message ?? "Lỗi không xác định" }, 500);
  }
});
