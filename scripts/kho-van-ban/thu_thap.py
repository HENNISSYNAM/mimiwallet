"""
Thu thập văn bản quy phạm pháp luật mảng thuế – tài chính từ Công báo điện tử.

NGUỒN, VÀ VÌ SAO LÀ NGUỒN NÀY
  congbao.chinhphu.vn — Công báo điện tử của Chính phủ, nơi đăng văn bản quy phạm
  pháp luật chính thức. robots.txt cho phép thu thập toàn bộ.

  Không dùng:
  - vbpl.vn: robots.txt cho phép, nhưng trang chi tiết đặt captcha. Không vượt
    lớp chống bot.
  - Thư viện Pháp luật, LuatVietnam: văn bản gốc thì không được bảo hộ quyền tác
    giả (Luật Sở hữu trí tuệ, Điều 15), nhưng phần tóm tắt, chú giải và cách
    trình bày của họ là tài sản của họ.

CÁCH LÀM
  1. Quét trang danh sách theo cơ quan ban hành. Mỗi mục đã có tên kèm trích
     yếu và link tải DOCX/PDF.
  2. Lọc mảng thuế – tài chính theo tên văn bản. Bộ Tài chính lấy hết.
  3. Với văn bản lọt bộ lọc: mở trang chi tiết để lấy ngày hiệu lực và các
     trường khác, rồi tải file gốc và trích toàn văn.

LỊCH SỰ VỚI MÁY CHỦ NHÀ NƯỚC
  Một luồng, nghỉ giữa các lần gọi, tự xưng danh qua User-Agent. Chạy lại được
  từ chỗ dừng: văn bản đã có tệp JSON thì bỏ qua.

CHẠY
  python thu_thap.py --thu-muc "D:/kho-van-ban"                 # tất cả cơ quan
  python thu_thap.py --co-quan bo-tai-chinh-c10 --den-trang 2   # chạy thử
"""

from __future__ import annotations

import argparse
import html
import io
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

GOC = "https://congbao.chinhphu.vn"
USER_AGENT = "MIMI-Wallet-LegalCorpus/1.0 (thu thap van ban quy pham phap luat cong khai tu Cong bao)"
NGHI_GIAY = 1.5
HAN_GIO = 60
THU_LAI = 3


@dataclass
class CoQuan:
    slug: str
    ten: str
    # Bộ Tài chính: mọi văn bản đều thuộc mảng tài chính, lấy hết.
    # Cơ quan khác: chỉ lấy văn bản khớp từ khoá thuế – tài chính.
    lay_het: bool = False


CO_QUAN = [
    CoQuan("bo-tai-chinh-c10", "Bộ Tài chính", lay_het=True),
    CoQuan("quoc-hoi-c31", "Quốc hội"),
    CoQuan("uy-ban-thuong-vu-quoc-hoi-c28", "Ủy ban Thường vụ Quốc hội"),
    CoQuan("chinh-phu-c1", "Chính phủ"),
    CoQuan("thu-tuong-chinh-phu-c2", "Thủ tướng Chính phủ"),
    CoQuan("ngan-hang-nha-nuoc-viet-nam-c7", "Ngân hàng Nhà nước Việt Nam"),
]

# So khớp CÓ DẤU và theo ranh giới từ. Bỏ dấu thì "phí" khớp nhầm "phía",
# "thuế" khớp nhầm "thuê" — hai nghĩa khác hẳn nhau.
TU_KHOA = [
    "thuế", "lệ phí", "phí", "hóa đơn", "hoá đơn", "chứng từ",
    "kế toán", "kiểm toán", "ngân sách", "tài chính", "hải quan",
    "hộ kinh doanh", "doanh nghiệp nhỏ và vừa", "đăng ký doanh nghiệp",
    "mã số thuế", "thu nhập cá nhân", "thu nhập doanh nghiệp",
    "giá trị gia tăng", "tiêu thụ đặc biệt", "xuất khẩu", "nhập khẩu",
    "quản lý thuế", "hoàn thuế", "miễn thuế", "giảm thuế", "xử phạt vi phạm hành chính",
    "chuyển giá", "giao dịch liên kết", "thương mại điện tử", "tài sản mã hóa", "tài sản số",
    # Nhóm doanh nghiệp nhỏ, một chủ sở hữu, mới thành lập — đang tăng nhanh và
    # là tệp khách kế tiếp sau hộ kinh doanh.
    "một thành viên", "doanh nghiệp tư nhân", "doanh nghiệp siêu nhỏ",
    "khởi nghiệp", "khởi nghiệp sáng tạo", "kinh tế tư nhân", "hỗ trợ doanh nghiệp",
    # Trọn vòng đời doanh nghiệp: đăng ký → vận hành → đóng cửa, hoặc lên sàn.
    # Đăng ký doanh nghiệp đã nằm trong phần Bộ Tài chính lấy hết (Bộ Kế hoạch
    # và Đầu tư sáp nhập vào Bộ Tài chính), nên ở đây bổ sung hai đầu còn lại.
    "đăng ký kinh doanh", "tạm ngừng kinh doanh", "chấm dứt hoạt động",
    "giải thể", "phá sản", "chứng khoán", "chào bán", "niêm yết", "công ty đại chúng",
]


def chuan(s: str) -> str:
    return unicodedata.normalize("NFC", s).lower()


_RE_TU_KHOA = re.compile(
    r"(?<![\wÀ-ỹ])(" + "|".join(re.escape(chuan(k)) for k in sorted(TU_KHOA, key=len, reverse=True)) + r")(?![\wÀ-ỹ])"
)


def khop_tu_khoa(ten: str) -> list[str]:
    return sorted(set(_RE_TU_KHOA.findall(chuan(ten))))


# ── Mạng ─────────────────────────────────────────────────────────────────────

def goi(url: str, nhi_phan: bool = False) -> bytes | str:
    """GET có thử lại. Lỗi 4xx không thử lại — gọi lại cũng vẫn thiếu."""
    loi_cuoi: Exception | None = None
    for lan in range(THU_LAI):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=HAN_GIO) as r:
                du_lieu = r.read()
            time.sleep(NGHI_GIAY)
            return du_lieu if nhi_phan else du_lieu.decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            loi_cuoi = e
            if 400 <= e.code < 500:
                break
        except Exception as e:  # noqa: BLE001 — mạng chập chờn, thử lại
            loi_cuoi = e
        time.sleep(NGHI_GIAY * (lan + 2))
    raise RuntimeError(f"{url}: {loi_cuoi}")


# ── Đọc trang ────────────────────────────────────────────────────────────────

def chu(s: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()


@dataclass
class MucDanhSach:
    duong_dan: str
    ten: str
    docx: str | None = None
    pdf: str | None = None


def doc_trang_danh_sach(s: str) -> tuple[list[MucDanhSach], int | None]:
    tong = re.search(r"totalPageSodo\s*=\s*(\d+)", s)
    sach = re.sub(r"<svg[\s\S]*?</svg>", "", re.sub(r"<(script|style)[\s\S]*?</\1>", "", s))

    muc: dict[str, MucDanhSach] = {}
    for m in re.finditer(r'<a[^>]*href="(/van-ban/[^"#]*\.htm)"[^>]*>([\s\S]*?)</a>', sach):
        ten = chu(m.group(2))
        if ten and m.group(1) not in muc:
            muc[m.group(1)] = MucDanhSach(duong_dan=m.group(1), ten=ten)

    # Link tải nằm ngay sau mục; gán theo thứ tự xuất hiện.
    for dd, mm in muc.items():
        i = sach.find(dd)
        khoi = sach[i : i + 6000]
        docx = re.search(r'href="(https://g7\.cdnchinhphu\.vn/api/download/stream\?[^"]*?\.docx)"', khoi)
        pdf = re.search(r'href="(https://g7\.cdnchinhphu\.vn/api/download/stream\?[^"]*?\.pdf)"', khoi)
        mm.docx = html.unescape(docx.group(1)) if docx else None
        mm.pdf = html.unescape(pdf.group(1)) if pdf else None

    return list(muc.values()), int(tong.group(1)) if tong else None


def doc_trang_chi_tiet(s: str) -> dict[str, str]:
    ten_truong = {
        "Loại văn bản": "loai",
        "Số, ký hiệu": "so_hieu",
        "Cơ quan ban hành": "co_quan",
        "Ngày ban hành": "ngay_ban_hanh",
        "Trích yếu": "trich_yeu",
        "Người ký": "nguoi_ky",
        "Ngày hiệu lực": "ngay_hieu_luc",
        "Công báo": "cong_bao_so",
    }
    ra: dict[str, str] = {}
    for m in re.finditer(r'<span class="name">\s*([^<]+?)\s*</span>\s*<div class="value">([\s\S]*?)</div>', s):
        khoa = ten_truong.get(html.unescape(m.group(1)).strip())
        if khoa and khoa not in ra:
            ra[khoa] = chu(m.group(2))
    pdf_ky = re.search(r'href="(https://congbaocdn\.chinhphu\.vn/[^"]*\.pdf)"', s)
    if pdf_ky:
        ra["pdf_ky_so"] = pdf_ky.group(1)
    return ra


def iso(ngay: str | None) -> str | None:
    """dd/mm/yyyy → yyyy-mm-dd. Không đoán khi định dạng lạ."""
    if not ngay:
        return None
    m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", ngay.strip())
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


# ── Trích toàn văn ───────────────────────────────────────────────────────────

def van_tu_docx(du_lieu: bytes) -> str:
    z = zipfile.ZipFile(io.BytesIO(du_lieu))
    x = z.read("word/document.xml").decode("utf-8", errors="replace")
    x = re.sub(r"<w:tab/>", "\t", x)
    x = re.sub(r"<w:br[^>]*/>", "\n", x)
    x = x.replace("</w:p>", "\n")
    dong = [html.unescape(re.sub(r"<[^>]+>", "", d)).strip() for d in x.split("\n")]
    return "\n".join(d for d in dong if d)


def van_tu_pdf(du_lieu: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    doc = PdfReader(io.BytesIO(du_lieu))
    return "\n".join((trang.extract_text() or "") for trang in doc.pages).strip()


# ── Chạy ─────────────────────────────────────────────────────────────────────

@dataclass
class ThongKe:
    trang: int = 0
    thay: int = 0
    lot_loc: int = 0
    da_co: int = 0
    luu: int = 0
    loi: int = 0
    khong_van: int = 0
    theo_co_quan: dict[str, int] = field(default_factory=dict)


def ghi_loi(thu_muc: Path, url: str, loi: str) -> None:
    with (thu_muc / "loi.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps({"url": url, "loi": loi, "luc": time.strftime("%Y-%m-%dT%H:%M:%S")}, ensure_ascii=False) + "\n")


def xu_ly_van_ban(cq: CoQuan, mm: MucDanhSach, tu_khoa: list[str], thu_muc: Path, tk: ThongKe) -> None:
    ma = re.search(r"-(\d+)\.htm$", mm.duong_dan)
    ma_so = ma.group(1) if ma else re.sub(r"\W+", "-", mm.duong_dan)
    tep_json = thu_muc / "van-ban" / f"{ma_so}.json"
    if tep_json.exists():
        tk.da_co += 1
        return

    url = GOC + mm.duong_dan
    try:
        chi_tiet = doc_trang_chi_tiet(goi(url))  # type: ignore[arg-type]

        toan_van, nguon_van, tep_goc = "", None, None
        for loai, link in (("docx", mm.docx), ("pdf", mm.pdf)):
            if not link:
                continue
            try:
                du_lieu = goi(link, nhi_phan=True)
                assert isinstance(du_lieu, bytes)
                toan_van = van_tu_docx(du_lieu) if loai == "docx" else van_tu_pdf(du_lieu)
                if toan_van:
                    nguon_van = loai
                    tep_goc = thu_muc / "tep-goc" / f"{ma_so}.{loai}"
                    tep_goc.write_bytes(du_lieu)
                    break
            except Exception as e:  # noqa: BLE001
                ghi_loi(thu_muc, link, f"tai/trich {loai}: {e}")

        if not toan_van:
            # Vẫn lưu siêu dữ liệu: biết văn bản tồn tại và còn hiệu lực là đã có
            # ích. Đánh dấu rõ để bước nạp kho không dùng nó làm căn cứ trích dẫn.
            tk.khong_van += 1

        ban_ghi = {
            "ma_cong_bao": ma_so,
            "url": url,
            "co_quan_danh_sach": cq.ten,
            "ten": mm.ten,
            "loai": chi_tiet.get("loai"),
            "so_hieu": chi_tiet.get("so_hieu"),
            "co_quan": chi_tiet.get("co_quan"),
            "ngay_ban_hanh": iso(chi_tiet.get("ngay_ban_hanh")),
            "ngay_hieu_luc": iso(chi_tiet.get("ngay_hieu_luc")),
            "ngay_hieu_luc_goc": chi_tiet.get("ngay_hieu_luc"),
            "trich_yeu": chi_tiet.get("trich_yeu"),
            "nguoi_ky": chi_tiet.get("nguoi_ky"),
            "cong_bao_so": chi_tiet.get("cong_bao_so"),
            "pdf_ky_so": chi_tiet.get("pdf_ky_so"),
            "tu_khoa_khop": tu_khoa,
            "nguon_toan_van": nguon_van,
            "tep_goc": tep_goc.name if tep_goc else None,
            "co_toan_van": bool(toan_van),
            "toan_van": toan_van,
            "thu_thap_luc": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        tep_json.write_text(json.dumps(ban_ghi, ensure_ascii=False, indent=1), encoding="utf-8")
        tk.luu += 1
        tk.theo_co_quan[cq.ten] = tk.theo_co_quan.get(cq.ten, 0) + 1
    except Exception as e:  # noqa: BLE001
        tk.loi += 1
        ghi_loi(thu_muc, url, str(e))


def chay(co_quan: list[CoQuan], thu_muc: Path, tu_trang: int, den_trang: int | None) -> ThongKe:
    (thu_muc / "van-ban").mkdir(parents=True, exist_ok=True)
    (thu_muc / "tep-goc").mkdir(parents=True, exist_ok=True)
    tk = ThongKe()

    for cq in co_quan:
        trang, tong = tu_trang, None
        while True:
            if den_trang is not None and trang > den_trang:
                break
            if tong is not None and trang > tong:
                break
            url = f"{GOC}/van-ban-dang-cong-bao/{cq.slug}.htm" if trang == 1 else f"{GOC}/van-ban-dang-cong-bao/{cq.slug}/trang-{trang}.htm"
            try:
                muc, tong_moi = doc_trang_danh_sach(goi(url))  # type: ignore[arg-type]
            except Exception as e:  # noqa: BLE001
                ghi_loi(thu_muc, url, f"danh sach: {e}")
                tk.loi += 1
                trang += 1
                continue
            tong = tong or tong_moi
            tk.trang += 1
            if not muc:
                break

            for mm in muc:
                tk.thay += 1
                tu_khoa = khop_tu_khoa(mm.ten)
                if not cq.lay_het and not tu_khoa:
                    continue
                tk.lot_loc += 1
                xu_ly_van_ban(cq, mm, tu_khoa, thu_muc, tk)

            print(
                f"[{cq.ten}] trang {trang}/{tong or '?'} · thấy {tk.thay} · lọt lọc {tk.lot_loc} · "
                f"lưu {tk.luu} · đã có {tk.da_co} · không trích được chữ {tk.khong_van} · lỗi {tk.loi}",
                flush=True,
            )
            trang += 1

    (thu_muc / "tong-ket.json").write_text(json.dumps(tk.__dict__, ensure_ascii=False, indent=1), encoding="utf-8")
    return tk


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--thu-muc", required=True, help="Nơi lưu kho (ngoài git)")
    ap.add_argument("--co-quan", action="append", help="slug cơ quan, lặp lại được; mặc định tất cả")
    ap.add_argument("--tu-trang", type=int, default=1)
    ap.add_argument("--den-trang", type=int, default=None)
    a = ap.parse_args()

    chon = [c for c in CO_QUAN if not a.co_quan or c.slug in a.co_quan]
    if not chon:
        sys.exit(f"Không có cơ quan nào khớp {a.co_quan}. Có: {[c.slug for c in CO_QUAN]}")

    tk = chay(chon, Path(a.thu_muc), a.tu_trang, a.den_trang)
    print("XONG", json.dumps(tk.__dict__, ensure_ascii=False))


if __name__ == "__main__":
    main()
