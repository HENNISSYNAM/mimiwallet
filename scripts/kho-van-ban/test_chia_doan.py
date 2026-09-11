"""Chạy: python -m unittest scripts/kho-van-ban/test_chia_doan.py"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from chia_doan import chia_doan, lam_sach  # noqa: E402

MAU = """20 CÔNG BÁO/Số 507 + 508/Ngày 20-4-2015
BỘ TÀI CHÍNH
Số: 33/2015/TT-BTC
THÔNG TƯ
Căn cứ Nghị định số 215/2013/NĐ-CP;
Điều 1. Phạm vi điều chỉnh
Thông tư này quy định mức thu phí.
CÔNG BÁO/Số 507 + 508/Ngày 20-4-2015 21
Điều 2. Mức thu
1. Xe dưới 12 chỗ: 35.000 đồng/vé.
Điều 10a. Hiệu lực
Thông tư có hiệu lực từ ngày 03/5/2015.
"""


class LamSach(unittest.TestCase):
    def test_bo_dong_dau_trang_cong_bao(self):
        s = lam_sach(MAU)
        self.assertNotIn("CÔNG BÁO/Số", s)
        self.assertIn("35.000 đồng/vé", s)

    def test_bo_khoi_chu_ky_so_va_so_trang(self):
        # Đúng khối đã lẫn vào đoạn trích của Thông tư 45/2015/TT-BTC khi thử agent thật.
        van = (
            "Nhân viên thu phí phát Thẻ vào đường;\n"
            "Ký bởi: Cổng Thông tin điện tử Chính phủ\n"
            "Email: thongtinchinhphu@chinhphu.vn\n"
            "Cơ quan: Văn phòng Chính phủ\n"
            "Thời gian ký: 12.05.2015 10:32:58 +07:00\n"
            "\n4\n\n"
            "b) Tại Trạm ra: người điều khiển dừng lại."
        )
        s = lam_sach(van)
        for rac in ("Ký bởi", "thongtinchinhphu", "Thời gian ký", "\n4\n"):
            self.assertNotIn(rac, s)
        self.assertIn("Thẻ vào đường;", s)
        self.assertIn("b) Tại Trạm ra", s)

    def test_giu_dong_co_quan_trong_noi_dung(self):
        # "Cơ quan:" không đi sau "Ký bởi:" thì là nội dung văn bản, không phải chữ ký.
        self.assertIn("Cơ quan: Bộ Tài chính", lam_sach("Điều 3.\nCơ quan: Bộ Tài chính"))

    def test_bo_ky_tu_dieu_khien(self):
        # Postgres từ chối mã 0 trong text; một ký tự này làm hỏng cả lô nạp.
        s = lam_sach("Điều 1.\x00 Phạm vi\x0b điều chỉnh\x1f")
        self.assertEqual(s, "Điều 1. Phạm vi điều chỉnh")
        self.assertNotIn("\x00", s)

    def test_dua_xuong_dong_windows_ve_mot_kieu(self):
        self.assertEqual(lam_sach("a\r\n\r\n\r\nb\rc"), "a\n\nb\nc")

    def test_gom_khoang_trang(self):
        self.assertEqual(lam_sach("a  \t b\n\n\n\nc"), "a b\n\nc")


class ChiaDoan(unittest.TestCase):
    def test_chia_theo_dieu_va_tach_can_cu(self):
        d = chia_doan(MAU)
        self.assertEqual([x.nhan for x in d], ["Căn cứ ban hành", "Điều 1", "Điều 2", "Điều 10a"])
        self.assertIn("215/2013/NĐ-CP", d[0].noi_dung)
        self.assertTrue(d[2].noi_dung.startswith("Điều 2. Mức thu"))
        self.assertEqual([x.thu_tu for x in d], [0, 1, 2, 3])

    def test_dieu_dai_cat_tiep_va_giu_nhan(self):
        dai = "Điều 5. Nội dung\n" + "\n".join(f"{i}. " + "chữ " * 40 for i in range(30))
        d = chia_doan(dai, toi_da=600)
        self.assertGreater(len(d), 1)
        self.assertEqual(d[0].nhan, "Điều 5")
        self.assertTrue(all(x.nhan == "Điều 5 (tiếp)" for x in d[1:]))
        self.assertTrue(all(len(x.noi_dung) <= 600 for x in d))

    def test_khong_co_dieu_van_chia_theo_do_dai(self):
        d = chia_doan("Quyết định về việc giao dự toán.\n" + "dòng " * 400, toi_da=500)
        self.assertTrue(all(x.nhan is None for x in d))
        self.assertTrue(all(len(x.noi_dung) <= 500 for x in d))

    def test_chu_dieu_giua_cau_khong_phai_moc(self):
        # "theo Điều 3" giữa dòng là tham chiếu, không phải đầu một Điều.
        d = chia_doan("Điều 1. A\nthực hiện theo Điều 3. của Luật\nĐiều 2. B")
        self.assertEqual([x.nhan for x in d], ["Điều 1", "Điều 2"])

    def test_van_trong(self):
        self.assertEqual(chia_doan("   "), [])


if __name__ == "__main__":
    unittest.main()
