import { describe, expect, it } from 'vitest';
import {
  docHoSoDaLuu, goiYChuSoHuuHuongLoi, hoSoRong, KHOA_LUU, kiemTraHoSo, luuHoSo, nguoiGopVonRong, soBangChu, soCoDau, tyLe, xoaHoSoDaLuu,
  type HoSoDangKy,
} from './hoSo';
import { cacBuoc, goiYLoaiHinh, hoSoCan, LOAI_HINH, MO_TA } from './loaiHinh';
import { boMau, dieuLe, mau1Hkd, mau10, mau2, mau4, mau6, mau7, vanBanThanhChu, type Khoi } from './mau';

/**
 * Dữ liệu dưới đây là NGƯỜI GIẢ (tên, số định danh bịa) — không chép dữ liệu thật từ bộ hồ sơ
 * mẫu của chủ dự án vào repo.
 */

const nguoi = (ho_ten: string, von: number, so: string) => ({
  ...nguoiGopVonRong(), ho_ten, von, so_dinh_danh: so, gioi_tinh: 'Nữ', ngay_sinh: '1990-05-17', ngay_cap: '2021-04-25', noi_cap: 'Cục Cảnh sát QLHC về TTXH',
  dia_chi: { so_nha: '12 Đường Số 1', xa: 'Phường Thử Nghiệm', tinh: 'Thành phố Hồ Chí Minh', quoc_gia: 'Việt Nam' },
});

function ctcpDu(): HoSoDangKy {
  const h = hoSoRong('ctcp');
  return {
    ...h,
    co_quan: 'Phòng Đăng ký kinh doanh Thành phố Hồ Chí Minh',
    dia_danh: 'TP. Hồ Chí Minh', ngay_ky: '2026-10-12',
    ten_vi: 'Công ty cổ phần Ví Dụ Xanh', ten_nuoc_ngoai: 'VI DU XANH JOINT STOCK COMPANY', ten_viet_tat: 'VDX JSC',
    tru_so: { ...h.tru_so, so_nha: '1 Đường Thử', xa: 'Phường Mẫu', tinh: 'Thành phố Hồ Chí Minh', dien_thoai: '0900000000' },
    nganh: [{ ma: '6201', ten: 'Lập trình máy vi tính' }, { ma: '7020', ten: 'Hoạt động tư vấn quản lý' }],
    nganh_chinh: 1,
    von: 3_000_000_000,
    dai_dien: { ...nguoi('Trần Thị Mẫu', 0, '079190000001'), dien_thoai: '0900000000' },
    chuc_danh: 'Tổng Giám đốc',
    thanh_vien: [nguoi('Trần Thị Mẫu', 2_700_000_000, '079190000001'), nguoi('Lê Văn Thử', 150_000_000, '079190000002'), nguoi('Phạm Thị Giả', 150_000_000, '079190000003')],
  };
}

const chu = (khoi: { khoi: Khoi[] } | ReturnType<typeof mau4>) => vanBanThanhChu(khoi as ReturnType<typeof mau4>);

describe('đọc số thành chữ (ô "Vốn điều lệ bằng chữ")', () => {
  it.each([
    [3_000_000_000, 'Ba tỷ đồng'],
    [1_500_000_000, 'Một tỷ năm trăm triệu đồng'],
    [1_050_000_000, 'Một tỷ không trăm năm mươi triệu đồng'],
    [105_000, 'Một trăm lẻ năm nghìn đồng'],
    [1_005, 'Một nghìn không trăm lẻ năm đồng'],
    [21_000_000, 'Hai mươi mốt triệu đồng'],
    [15_000_000, 'Mười lăm triệu đồng'],
    [24_000, 'Hai mươi tư nghìn đồng'],
    [11, 'Mười một đồng'],
    [2_000_000_000_000, 'Hai nghìn tỷ đồng'],
  ])('%d → %s', (so, chuMongDoi) => expect(soBangChu(so)).toBe(chuMongDoi));

  it('định dạng số và tỷ lệ kiểu Việt Nam', () => {
    expect(soCoDau(3_000_000_000)).toBe('3.000.000.000');
    expect(tyLe(1, 3)).toBe('33,33');
    expect(tyLe(2_700_000_000, 3_000_000_000)).toBe('90');
  });
});

describe('gợi ý loại hình', () => {
  it('nhỏ, gia đình, không cần cổ phần → hộ kinh doanh', () => {
    expect(goiYLoaiHinh({ so_nguoi: 1, nho_le_gia_dinh: true, muon_co_phan: false }).loai).toBe('hkd');
  });
  it('một chủ → TNHH 1TV; 2–50 → TNHH 2TV; muốn cổ phần và ≥3 → CTCP', () => {
    expect(goiYLoaiHinh({ so_nguoi: 1, nho_le_gia_dinh: false, muon_co_phan: false }).loai).toBe('tnhh1');
    expect(goiYLoaiHinh({ so_nguoi: 5, nho_le_gia_dinh: false, muon_co_phan: false }).loai).toBe('tnhh2');
    expect(goiYLoaiHinh({ so_nguoi: 3, nho_le_gia_dinh: false, muon_co_phan: true }).loai).toBe('ctcp');
    expect(goiYLoaiHinh({ so_nguoi: 51, nho_le_gia_dinh: false, muon_co_phan: false }).loai).toBe('ctcp');
  });
  it('muốn cổ phần nhưng chưa đủ 3 người: không gợi ý CTCP, nói rõ vì sao', () => {
    const g = goiYLoaiHinh({ so_nguoi: 2, nho_le_gia_dinh: false, muon_co_phan: true });
    expect(g.loai).toBe('tnhh2');
    expect(g.ly_do.join(' ')).toContain('tối thiểu 03 cổ đông');
  });
  it('trả lời chưa đủ thì chưa gợi ý', () => {
    expect(goiYLoaiHinh({ so_nguoi: null, nho_le_gia_dinh: null, muon_co_phan: null }).loai).toBeNull();
    expect(goiYLoaiHinh({ so_nguoi: 2, nho_le_gia_dinh: null, muon_co_phan: false }).loai).toBeNull();
  });
});

describe('mọi điều trên trang đều có căn cứ và trạng thái đối chiếu', () => {
  it('khác biệt, hồ sơ, các bước — không có mục nào thiếu căn cứ', () => {
    for (const l of LOAI_HINH) {
      const m = MO_TA[l];
      for (const d of [m.trach_nhiem, m.so_thanh_vien, m.thue]) {
        expect(d.can_cu.dieu.length, `${l}: ${d.chu}`).toBeGreaterThan(0);
        expect(['goc', 'thu_cap']).toContain(d.can_cu.trang_thai);
      }
      for (const h of hoSoCan(l)) expect(h.can_cu.van_ban.length, h.ten).toBeGreaterThan(0);
      for (const b of cacBuoc(l)) expect(b.can_cu.length, b.tieu_de).toBeGreaterThan(0);
    }
  });
  it('nơi nộp: doanh nghiệp cấp tỉnh, hộ kinh doanh cấp xã — đã đối chiếu mẫu gốc', () => {
    const nopDn = cacBuoc('ctcp').find((b) => b.tieu_de === 'Nộp hồ sơ')!;
    expect(nopDn.chi_tiet).toContain('dangkykinhdoanh.gov.vn');
    expect(nopDn.can_cu[0].trang_thai).toBe('goc');
    expect(nopDn.can_cu[0].ghi_chu).toContain('cấp tỉnh');
    const nopHkd = cacBuoc('hkd').find((b) => b.tieu_de.includes('cấp xã'))!;
    expect(nopHkd.can_cu[0].ghi_chu).toContain('cấp xã');
  });
  it('thời hạn và lệ phí chưa đối chiếu gốc thì phải mang nhãn thứ cấp', () => {
    const cho = cacBuoc('tnhh1').find((b) => b.tieu_de.startsWith('Chờ kết quả'))!;
    expect(cho.can_cu.every((c) => c.dieu.includes('Mục 13') || c.trang_thai === 'thu_cap')).toBe(true);
  });
});

describe('Mẫu số 4 — Giấy đề nghị đăng ký doanh nghiệp công ty cổ phần (TT 121/2026)', () => {
  const vb = mau4(ctcpDu());
  const s = chu(vb);
  it('đúng tiêu đề, kính gửi, tình trạng "Thành lập mới" được đánh dấu', () => {
    expect(s).toContain('Mẫu số 4');
    expect(s).toContain('GIẤY ĐỀ NGHỊ ĐĂNG KÝ DOANH NGHIỆP\nCÔNG TY CỔ PHẦN');
    expect(s).toContain('Kính gửi: Phòng Đăng ký kinh doanh Thành phố Hồ Chí Minh');
    expect(s).toContain('[X] Thành lập mới');
    expect(s).toContain('[ ] Thành lập trên cơ sở tách doanh nghiệp');
    expect(s).toContain('TP. Hồ Chí Minh, ngày 12 tháng 10 năm 2026');
  });
  it('tên in hoa, vốn bằng số và bằng chữ, cổ phần tính từ mệnh giá', () => {
    expect(s).toContain('Tên công ty viết bằng tiếng Việt (ghi bằng chữ in hoa): CÔNG TY CỔ PHẦN VÍ DỤ XANH');
    expect(s).toContain('Vốn điều lệ (bằng số; VNĐ): 3.000.000.000');
    expect(s).toContain('Vốn điều lệ (bằng chữ; VNĐ): Ba tỷ đồng');
    expect(s).toContain('1 | Cổ phần phổ thông | 300.000 | 3.000.000.000 | 100');
    expect(s).toContain('Mệnh giá cổ phần (VNĐ): 10.000');
  });
  it('ngành chính đánh X đúng dòng, mã cấp 4', () => {
    expect(s).toContain('1 | Lập trình máy vi tính | 6201 | ');
    expect(s).toContain('2 | Hoạt động tư vấn quản lý | 7020 | X');
  });
  it('thứ tự mục theo mẫu mới: 8 cổ đông sáng lập gửi kèm, 10 đại diện, 11 thuế, 12 BHXH, 13 chủ sở hữu hưởng lợi', () => {
    const vt = ['8. Cổ đông sáng lập', '9. Cổ đông là nhà đầu tư nước ngoài', '10. Người đại diện theo pháp luật', '11. Thông tin đăng ký thuế', '12. Thông tin về việc đóng bảo hiểm xã hội', '13. Thông tin về chủ sở hữu hưởng lợi'].map((x) => s.indexOf(x));
    expect(vt.every((v) => v > 0)).toBe(true);
    expect([...vt].sort((a, b) => a - b)).toEqual(vt);
    // Mẫu mới bỏ ô Có/Không chủ sở hữu hưởng lợi, thay bằng kê khai theo Mẫu số 10.
    expect(s).toContain('theo Mẫu số 10 ban hành kèm theo Thông tư này');
    expect(s).not.toContain('Doanh nghiệp có chủ sở hữu hưởng lợi không?');
    // Câu cam kết nhà đầu tư nước ngoài chỉ ghi khi thuộc trường hợp đó.
    expect(s).not.toContain('Xin gửi kèm cam kết của nhà đầu tư nước ngoài');
  });
  it('thuế: khấu trừ được đánh dấu, hạch toán độc lập, BHXH hàng tháng', () => {
    expect(s).toContain('Khấu trừ ☒');
    expect(s).toContain('Trực tiếp trên doanh số ☐');
    expect(s).toContain('[X] Hàng tháng');
    expect(s).toContain('Họ, chữ đệm và tên Giám đốc/Tổng giám đốc: Trần Thị Mẫu');
  });
  it('ký: người đại diện theo pháp luật/Chủ tịch HĐQT; có đủ 11 chú thích', () => {
    expect(s).toContain('NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT/\nCHỦ TỊCH HỘI ĐỒNG QUẢN TRỊ CỦA CÔNG TY');
    const ct = vb.khoi.find((k) => k.k === 'chu_thich');
    expect(ct && ct.k === 'chu_thich' ? ct.dong.length : 0).toBe(11);
  });
});

describe('Mẫu số 7 và Mẫu số 10', () => {
  it('Mẫu số 7: 19 cột, cổ phần, tỷ lệ, thời hạn góp; có số định danh thì bỏ trống quốc tịch, dân tộc', () => {
    const vb = mau7(ctcpDu());
    const bang = vb.khoi.find((k) => k.k === 'bang');
    expect(bang && bang.k === 'bang' ? bang.so_cot?.length : 0).toBe(19);
    const s = chu(vb);
    expect(s).toContain('1 | Trần Thị Mẫu | 17/05/1990 | Nữ | 079190000001\nCấp ngày 25/04/2021\nCục Cảnh sát QLHC về TTXH |  |  | ');
    expect(s).toContain('270.000 | 2.700.000.000 | 90 | 270.000 | 2.700.000.000');
    expect(s).toContain('Trong thời hạn 90 ngày kể từ ngày được cấp Giấy chứng nhận đăng ký doanh nghiệp');
    expect(s).toContain('NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT/CHỦ TỊCH HỘI ĐỒNG QUẢN TRỊ CỦA CÔNG TY');
  });
  it('chủ sở hữu hưởng lợi: chỉ người từ 25% trở lên; CTCP ghi vào cột cổ phần biểu quyết', () => {
    const hs = ctcpDu();
    const ds = goiYChuSoHuuHuongLoi(hs);
    expect(ds.map((d) => d.ho_ten)).toEqual(['Trần Thị Mẫu']);
    expect(ds[0].ty_le_cp_truc_tiep).toBe('90');
    expect(ds[0].ty_le_von_truc_tiep).toBe('');
    const s = chu(mau10({ ...hs, chu_so_huu_huong_loi: ds }));
    expect(s).toContain('DANH SÁCH CHỦ SỞ HỮU HƯỞNG LỢI CỦA DOANH NGHIỆP');
    expect(s).toContain('11=9+10');
    expect(s).toContain('Điều 3 Nghị định số 296/2026/NĐ-CP');
    // Cột 12, 13, 14 = trực tiếp 90, gián tiếp trống, tổng 90.
    expect(s).toContain('|  |  |  | 90 |  | 90 |');
  });
  it('TNHH 2TV: tỷ lệ vào cột vốn điều lệ; TNHH 1TV: chủ sở hữu 100%', () => {
    const h2 = { ...ctcpDu(), loai: 'tnhh2' as const };
    expect(goiYChuSoHuuHuongLoi(h2)[0].ty_le_von_truc_tiep).toBe('90');
    const h1 = { ...ctcpDu(), loai: 'tnhh1' as const };
    expect(goiYChuSoHuuHuongLoi(h1)).toHaveLength(1);
    expect(goiYChuSoHuuHuongLoi(h1)[0].ty_le_von_truc_tiep).toBe('100');
  });
  it('Mẫu số 6: danh sách thành viên TNHH 2TV, 14 cột', () => {
    const vb = mau6({ ...ctcpDu(), loai: 'tnhh2' });
    const s = chu(vb);
    expect(s).toContain('DANH SÁCH THÀNH VIÊN CÔNG TY TRÁCH NHIỆM HỮU HẠN HAI THÀNH VIÊN TRỞ LÊN');
    expect(s).toContain('2.700.000.000 | 90 | Đồng Việt Nam: 2.700.000.000');
  });
});

describe('Mẫu số 2 (TNHH 1TV) và Mẫu số 1 Phụ lục II (hộ kinh doanh)', () => {
  it('Mẫu số 2: chủ sở hữu, mô hình tổ chức, tài sản góp vốn; mục 9 đại diện, 12 chủ sở hữu hưởng lợi', () => {
    const s = chu(mau2({ ...ctcpDu(), loai: 'tnhh1', ten_vi: 'Công ty TNHH Ví Dụ', mo_hinh_1tv: 'chu_tich' }));
    expect(s).toContain('CÔNG TY TRÁCH NHIỆM HỮU HẠN MỘT THÀNH VIÊN');
    expect(s).toContain('Họ, chữ đệm và tên chủ sở hữu (ghi bằng chữ in hoa): TRẦN THỊ MẪU');
    expect(s).toContain('[X] Chủ tịch công ty, Giám đốc hoặc Tổng Giám đốc');
    expect(s).toContain('1 | Đồng Việt Nam | 3.000.000.000 | 100');
    expect(s.indexOf('9. Người đại diện theo pháp luật')).toBeGreaterThan(s.indexOf('8. Tài sản góp vốn'));
    expect(s).toContain('12. Thông tin về chủ sở hữu hưởng lợi');
  });
  it('hộ kinh doanh: kính gửi cấp xã khi để trống, cá nhân được đánh dấu, vốn kinh doanh có chữ', () => {
    const h = { ...hoSoRong('hkd'), ten_vi: 'Hộ kinh doanh Bánh Mì Thử', von: 50_000_000, dai_dien: nguoi('Ngô Văn Chủ', 0, '079190000009'), nganh: [{ ma: '5610', ten: 'Nhà hàng và các dịch vụ ăn uống phục vụ lưu động' }] };
    const s = chu(mau1Hkd(h));
    expect(s).toContain('GIẤY ĐỀ NGHỊ ĐĂNG KÝ HỘ KINH DOANH');
    expect(s).toContain('Kính gửi: (Cơ quan đăng ký kinh doanh cấp xã)');
    expect(s).toContain('Tôi là (ghi họ tên bằng chữ in hoa): NGÔ VĂN CHỦ');
    expect(s).toContain('[X] Cá nhân');
    expect(s).toContain('50.000.000 (Năm mươi triệu đồng)');
    expect(s).toContain('[X] Phương pháp kê khai');
    expect(s).toContain('CHỦ HỘ KINH DOANH');
  });
  it('bộ mẫu theo loại hình', () => {
    expect(boMau(hoSoRong('hkd')).map((v) => v.ma)).toEqual(['mau1_hkd']);
    expect(boMau(hoSoRong('tnhh1')).map((v) => v.ma)).toEqual(['mau2', 'dieu_le', 'mau10']);
    expect(boMau(hoSoRong('tnhh2')).map((v) => v.ma)).toEqual(['mau3', 'dieu_le', 'mau6', 'mau10']);
    expect(boMau(hoSoRong('ctcp')).map((v) => v.ma)).toEqual(['mau4', 'dieu_le', 'mau7', 'mau10']);
  });
});

describe('khung điều lệ', () => {
  it('đủ 13 nội dung bắt buộc (điểm a → n) + điều khoản thi hành, gắn nhãn tham khảo', () => {
    const vb = dieuLe(ctcpDu());
    expect(vb.tham_khao).toBe(true);
    expect(vb.can_cu.trang_thai).toBe('thu_cap');
    const s = chu(vb);
    for (const d of ['a', 'b', 'c', 'd', 'đ', 'e', 'g', 'h', 'i', 'k', 'l', 'm', 'n']) expect(s).toContain(`Điều 24, điểm ${d}`);
    expect(s).toContain('KHUNG THAM KHẢO');
    expect(s).toContain('Tổng số cổ phần (cổ phần phổ thông): 300.000');
    expect(s).toContain('3.000.000.000 đồng (Ba tỷ đồng)');
  });
});

describe('kiểm tra bảng hỏi', () => {
  it('hồ sơ đủ thì không lỗi', () => expect(kiemTraHoSo(ctcpDu())).toEqual([]));
  it('bắt mã ngành sai, thiếu cổ đông, tổng vốn lệch, không chia hết mệnh giá', () => {
    const h = ctcpDu();
    const loi = kiemTraHoSo({
      ...h,
      nganh: [{ ma: '62', ten: 'Lập trình' }],
      nganh_chinh: 0,
      thanh_vien: [h.thanh_vien[0], { ...h.thanh_vien[1], von: 150_005_000 }],
    }).map((l) => l.thong_bao).join('\n');
    expect(loi).toContain('đúng 4 chữ số');
    expect(loi).toContain('tối thiểu 3 cổ đông sáng lập');
    expect(loi).toContain('chưa bằng vốn điều lệ');
    expect(loi).toContain('không chia hết cho mệnh giá');
  });
  it('hộ kinh doanh: ngành phụ không cần mã', () => {
    const h = { ...hoSoRong('hkd'), ten_vi: 'Hộ A', von: 1, dai_dien: nguoi('A', 0, '079190000009'), tru_so: { ...hoSoRong('hkd').tru_so, so_nha: '1', xa: 'X', tinh: 'T' }, nganh: [{ ma: '5610', ten: 'Ăn uống' }, { ma: '', ten: 'Bán lẻ đồ uống' }] };
    expect(kiemTraHoSo(h)).toEqual([]);
  });
});

describe('lưu ở trình duyệt', () => {
  const khoGia = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
  };
  it('lưu, đọc lại, xoá', () => {
    const kho = khoGia();
    expect(luuHoSo(ctcpDu(), kho)).toBe(true);
    expect(docHoSoDaLuu(kho)?.ten_vi).toBe('Công ty cổ phần Ví Dụ Xanh');
    xoaHoSoDaLuu(kho);
    expect(kho.m.has(KHOA_LUU)).toBe(false);
    expect(docHoSoDaLuu(kho)).toBeNull();
  });
  it('bộ nhớ ném lỗi hoặc dữ liệu hỏng: không vỡ trang', () => {
    const hong = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceeded'); }, removeItem: () => { throw new Error('x'); } };
    expect(docHoSoDaLuu(hong)).toBeNull();
    expect(luuHoSo(ctcpDu(), hong)).toBe(false);
    expect(() => xoaHoSoDaLuu(hong)).not.toThrow();
    expect(docHoSoDaLuu({ getItem: () => '{không phải json' })).toBeNull();
  });
});
