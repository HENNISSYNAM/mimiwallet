/**
 * Chữ cho màn hình bối cảnh thị trường tài sản số.
 *
 * Mã sự kiện do `_shared/web3/tin-hieu.ts` sinh ra; chỗ này dịch chúng. Logic
 * quyết định **cái gì đáng nói**, còn file này quyết định **nói bằng chữ nào**.
 *
 * Thiếu một mã ở đây thì i18next trả về chính khoá đó, hiện lên màn hình dưới
 * dạng `web3.suKien.gia.hien_tai` — xấu, và thấy ngay. Đó là chủ ý: một sự kiện
 * mới chưa được dịch phải lộ ra chứ không được im lặng hiện sai ngôn ngữ.
 */
export default {
  web3: {
    tieuDe: 'Bối cảnh thị trường tài sản số',
    phuDe: 'Giá từ nhiều sàn, tin vĩ mô, và lịch hiệu lực văn bản pháp luật',
    dangTai: 'Đang đọc dữ liệu…',
    lamMoi: 'Đọc lại',
    capNhatLuc: 'Đọc lúc {{gio}}',
    khongCoBangChung: 'Chưa có dữ liệu nào để dựng bối cảnh.',

    mucChuY: {
      binh_thuong: 'Bình thường',
      dang_chu_y: 'Đáng chú ý',
      can_doc_ky: 'Cần đọc kỹ',
    },

    nguon: {
      thi_truong: 'Thị trường',
      vi_mo: 'Vĩ mô',
      phap_ly: 'Pháp lý',
    },

    moDau: {
      'tong.khong_co_gi': 'Không có sự kiện nào nổi bật trong kỳ.',
      'tong.co_vi_mo': 'Có {{soTin}} tin vĩ mô đáng chú ý trong kỳ.',
      'tong.lech_gia': 'Giá của {{soMa}} tài sản đang lệch bất thường giữa các sàn.',
      'tong.co_phap_ly':
        'Có {{soVanBan}} văn bản pháp luật sắp hoặc vừa có hiệu lực ({{quocGia}}).',
    },

    suKien: {
      'gia.hien_tai': '{{ma}} ở mức {{gia}} USD, theo {{soSan}} sàn.',
      'gia.hien_tai_kem_doi': '{{ma}} ở mức {{gia}} USD, {{huong}} {{doi24h}}% trong 24 giờ, theo {{soSan}} sàn.',
      'gia.khong_doc_duoc': 'Không đọc được giá {{ma}}.',
      'gia.lech_bat_thuong': 'Các sàn báo giá {{ma}} lệch nhau {{lech}}%.',
      'vi_mo.tin': '{{tieuDe}}',
      'phap_ly.sap_hieu_luc': '{{soHieu}} — {{ten}}. Còn {{ngay}} ngày nữa hiệu lực.',
      'phap_ly.hieu_luc_hom_nay': '{{soHieu}} — {{ten}}. Hiệu lực từ hôm nay.',
      'phap_ly.vua_hieu_luc': '{{soHieu}} — {{ten}}. Đã hiệu lực {{ngay}} ngày.',
    },

    huong: { tang: 'tăng', giam: 'giảm' },
    apDungCho: 'Áp dụng cho {{doiTuong}}',

    suCo: {
      tieuDe: 'Thiếu nguồn',
      /*
       * Hiện ra chứ không nuốt. Một sàn không trả lời thì phần còn lại vẫn dùng
       * được, nhưng "chỉ một sàn trả lời" phải trông khác "hai sàn khớp nhau" —
       * nếu không, người đọc tin vào một con số không có đối chứng.
       */
      mo_ta: '{{nguon}}: {{loi}}',
    },

    /*
     * Câu bắt buộc, không phải câu lịch sự. Cùng kỷ luật với phần thuế: tính ra
     * một con số không có nghĩa là con số đó thay được người quyết định.
     */
    luuY:
      'Đây là bối cảnh thị trường và pháp lý, không phải khuyến nghị mua bán. ' +
      'Tài sản số biến động mạnh và có thể mất phần lớn giá trị. ' +
      'MIMI không giữ tài sản, không đặt lệnh, và không nhận uỷ thác đầu tư.',
  },
};
