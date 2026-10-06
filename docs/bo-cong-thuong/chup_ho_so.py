"""Chụp 8 trang công bố và dựng 8 PDF hồ sơ thông báo TMĐT (docs/bo-cong-thuong/).

Cách chạy (Windows, cần Microsoft Edge và `pip install pymupdf`):
    python docs/bo-cong-thuong/chup_ho_so.py                                # bản chạy cục bộ :8091
    python docs/bo-cong-thuong/chup_ho_so.py https://www.mimiwallet.online  # chụp lại từ tên miền thật
"""
import datetime
import os
import subprocess
import sys

import pymupdf

import tempfile
OUT = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.join(tempfile.gettempdir(), "mimi-chup-ho-so")
os.makedirs(TMP, exist_ok=True)
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8091").rstrip("/")
PROD = "https://www.mimiwallet.online"

MUC = [
    (1, "1-chinh-sach-bao-mat", "/chinh-sach/bao-mat", "Chính sách bảo mật"),
    (2, "2-phuong-thuc-tiep-nhan-giai-quyet-khieu-nai", "/chinh-sach/khieu-nai",
     "Phương thức tiếp nhận và giải quyết phản ánh, yêu cầu, khiếu nại"),
    (3, "3-chinh-sach-gia", "/chinh-sach/gia", "Chính sách giá"),
    (4, "4-chinh-sach-thanh-toan", "/chinh-sach/thanh-toan", "Chính sách về thanh toán"),
    (5, "5-dieu-kien-han-che-cung-cap-dich-vu", "/chinh-sach/dieu-kien-dich-vu",
     "Các điều kiện hoặc hạn chế trong việc cung cấp hàng hóa hoặc dịch vụ trên nền tảng"),
    (6, "6-cung-cap-cham-dut-dich-vu-hoan-tien", "/chinh-sach/cung-cap-cham-dut-hoan-tien",
     "Phương thức cung cấp dịch vụ, chính sách chấm dứt dịch vụ và hoàn tiền (áp dụng cho dịch vụ)"),
    (7, "7-hinh-thuc-ho-tro-truc-tuyen", "/chinh-sach/ho-tro-truc-tuyen", "Hình thức hỗ trợ trực tuyến"),
    (8, "8-tai-lieu-khac", "/chinh-sach", "Tài liệu khác — Thông tin doanh nghiệp, mô tả dịch vụ, danh sách liên kết"),
]

W, H = 1280, 9000
A4 = pymupdf.paper_rect("a4")
FONT = r"C:\Windows\Fonts\arial.ttf"
FONTB = r"C:\Windows\Fonts\arialbd.ttf"


def edge(*args):
    prof = os.path.join(TMP, "edge-profile")
    cmd = [EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
           "--disable-extensions", f"--user-data-dir={prof}", "--virtual-time-budget=20000", *args]
    subprocess.run(cmd, check=True, timeout=180, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def chieu_cao_noi_dung(png):
    """Hàng cuối cùng khác màu nền (quét từ dưới lên) — cắt phần trống của ảnh chụp cao."""
    pix = pymupdf.Pixmap(png)
    n, w, h, s = pix.n, pix.width, pix.height, pix.samples
    stride = pix.stride
    nen = s[(h - 1) * stride:(h - 1) * stride + n]
    for y in range(h - 1, 0, -4):
        row = s[y * stride:(y + 1) * stride]
        for x in range(0, w * n, n * 8):
            if abs(row[x] - nen[0]) > 6 or abs(row[x + 1] - nen[1]) > 6 or abs(row[x + 2] - nen[2]) > 6:
                return min(h, y + 40), w
    return h, w


def cac_doan(pix, nguong=160, giu=60):
    """Các đoạn [a, b) có nội dung; khoảng trống dài hơn `nguong` rút còn `giu`."""
    n, w, h, s, stride = pix.n, pix.width, pix.height, pix.samples, pix.stride
    nen = s[(h - 1) * stride - stride // 2: (h - 1) * stride - stride // 2 + n]  # giữa hàng áp chót? dùng góc
    nen = s[0:n]
    def trong(y):
        row = s[y * stride:(y + 1) * stride]
        for x in range(0, w * n, n * 4):
            if abs(row[x] - nen[0]) > 6 or abs(row[x + 1] - nen[1]) > 6 or abs(row[x + 2] - nen[2]) > 6:
                return False
        return True
    doan, a, rong_run = [], 0, 0
    for y in range(h):
        if trong(y):
            rong_run += 1
        else:
            if rong_run > nguong:
                cut = y - rong_run + giu // 2
                if cut > a:
                    doan.append((a, cut))
                a = y - giu // 2
            rong_run = 0
    end = h - max(0, rong_run - giu // 2) if rong_run > nguong else h
    if end > a:
        doan.append((a, end))
    return doan


def main():
    thoi_diem = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    os.makedirs(OUT, exist_ok=True)
    for so, ten, duong, tieu_de in MUC:
        url = BASE + duong
        png = os.path.join(TMP, f"{ten}.png")
        in_pdf = os.path.join(TMP, f"{ten}-in.pdf")
        edge(f"--window-size={W},{H}", f"--screenshot={png}", url)
        # Bản in toàn văn: CSS in của ứng dụng (`index.css` @media print) ẩn mọi thứ trừ tờ khai, nên
        # in thẳng trang sẽ ra giấy trắng. Lấy DOM đã render (--dump-dom), tách <main> và <footer>,
        # bọc vào một trang HTML tối giản rồi mới in.
        dom = subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--no-first-run",
                              f"--user-data-dir={os.path.join(TMP, 'edge-profile')}",
                              "--virtual-time-budget=20000", "--dump-dom", url],
                             capture_output=True, timeout=180).stdout.decode("utf-8", "replace")
        m0, m1 = dom.find("<main"), dom.find("</main>") + 7
        f0, f1 = dom.find("<footer"), dom.find("</footer>") + 9
        if m0 < 0 or f0 < 0:
            raise SystemExit(f"Không thấy <main>/<footer> ở {url}")
        than = dom[m0:m1] + "<hr>" + dom[f0:f1]
        html = f"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>{tieu_de}</title>
<style>
body{{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.5;color:#111;margin:0}}
@page{{size:A4;margin:18mm 16mm}}
h1{{font-size:18pt;margin:0 0 4pt}} h2{{font-size:13pt;margin:16pt 0 4pt}}
a{{color:#1d4ed8;text-decoration:none}} svg,img{{display:none}}
table{{border-collapse:collapse;width:100%}} td,th{{border:1px solid #bbb;padding:4pt 6pt;vertical-align:top;text-align:left}}
dl div{{display:flex;gap:8pt}} dt{{min-width:120pt;color:#555}} dd{{margin:0}}
nav ul, footer ul{{columns:2}} .sr-only{{display:none}}
.dau{{font-size:9pt;color:#555;border-bottom:1px solid #ccc;padding-bottom:4pt;margin-bottom:10pt}}
</style></head><body><div class="dau">Phần B — Toàn văn trang {PROD}{duong} ({"bản chạy cục bộ " + url + ", " if "localhost" in url else "chụp "}{thoi_diem})</div>{than}</body></html>"""
        html_path = os.path.join(TMP, f"{ten}-in.html")
        with open(html_path, "w", encoding="utf-8") as fh:
            fh.write(html)
        edge("--no-pdf-header-footer", f"--print-to-pdf={in_pdf}", "file:///" + html_path.replace("\\", "/"))

        cao, rong = chieu_cao_noi_dung(png)
        doc = pymupdf.open()

        # Trang bìa
        p = doc.new_page(width=A4.width, height=A4.height)
        p.insert_font(fontname="ar", fontfile=FONT)
        p.insert_font(fontname="arb", fontfile=FONTB)
        y = 60
        def dong(txt, size=11, bold=False, gap=6):
            nonlocal y
            r = pymupdf.Rect(50, y, A4.width - 50, A4.height - 40)
            used = p.insert_textbox(r, txt, fontsize=size, fontname="arb" if bold else "ar")
            # insert_textbox trả về khoảng trống còn lại; tính số dòng xấp xỉ
            lines = max(1, int(pymupdf.get_text_length(txt, fontsize=size) / (A4.width - 100)) + 1)
            y += lines * size * 1.35 + gap
        dong("HỒ SƠ THÔNG BÁO WEBSITE/ỨNG DỤNG THƯƠNG MẠI ĐIỆN TỬ BÁN HÀNG", 13, True)
        dong("MIMI WALLET — CÔNG TY CỔ PHẦN CLI NUTRIX — MST 0319436143", 11, True, 14)
        dong(f"Mục {so}: {tieu_de}", 14, True, 14)
        dong(f"Đường dẫn công bố: {PROD}{duong}")
        dong((f"Ảnh chụp lấy từ bản chạy thử cục bộ: {url}" if "localhost" in url else f"Ảnh chụp lấy từ: {url}"))
        dong(f"Thời điểm chụp: {thoi_diem}", gap=14)
        dong("Nội dung tệp:", 11, True)
        dong("• Phần A — Bản chụp giao diện trang công bố (ảnh chụp màn hình, chia theo trang giấy).")
        dong("• Phần B — Toàn văn trang công bố in từ trình duyệt (chữ chọn và tìm kiếm được).", gap=14)

        # Phần A: ảnh chụp chia trang. Cửa sổ chụp cao 9000px nên `min-h-screen` kéo chân trang
        # xuống đáy, để lại một khoảng trống dài giữa nội dung và chân trang: bỏ mọi khoảng trống
        # dài hơn 160px, giữ 60px, rồi xếp các đoạn nội dung liên tiếp lên trang giấy.
        goc = pymupdf.Pixmap(png)
        if goc.alpha:
            goc = pymupdf.Pixmap(goc, 0)
        doan = cac_doan(goc)
        le = 30
        rong_trang = A4.width - 2 * le
        ti_le = rong_trang / rong
        cao_lat = int((A4.height - 2 * le - 20) / ti_le)
        # Cắt các đoạn dài thành lát vừa trang
        lat = []
        for a, b in doan:
            while b - a > cao_lat:
                lat.append((a, a + cao_lat)); a += cao_lat
            lat.append((a, b))
        phan = 0
        p = None
        con = 0
        for a, b in lat:
            h = b - a
            if p is None or h > con:
                phan += 1
                p = doc.new_page(width=A4.width, height=A4.height)
                p.insert_font(fontname="ar", fontfile=FONT)
                p.insert_text((le, le - 8), f"Phần A — Bản chụp giao diện {PROD}{duong} (trang {phan})", fontsize=8, fontname="ar")
                yp = le
                con = cao_lat
            khung = pymupdf.IRect(0, a, rong, b)
            cat = pymupdf.Pixmap(goc.colorspace, khung, False)
            cat.copy(goc, khung)
            cat.set_origin(0, 0)
            dich = pymupdf.Rect(le, yp, le + rong_trang, yp + h * ti_le)
            p.insert_image(dich, pixmap=cat)
            yp += h * ti_le
            con -= h
        cao = sum(b - a for a, b in doan)

        # Phần B: bản in toàn văn
        doc.insert_pdf(pymupdf.open(in_pdf))
        dich_pdf = os.path.join(OUT, f"{ten}.pdf")
        doc.save(dich_pdf, garbage=4, deflate=True)
        kb = os.path.getsize(dich_pdf) // 1024
        print(f"{ten}.pdf  {doc.page_count} trang  {kb} KB  (ảnh {rong}x{cao})")


if __name__ == "__main__":
    sys.exit(main())
