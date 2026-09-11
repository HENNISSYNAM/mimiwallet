"""
Làm sạch toàn văn và chia thành đoạn để agent tra cứu.

ĐƠN VỊ LÀ "ĐIỀU". Người Việt trích luật theo Điều — "khoản 2 Điều 5 Nghị định
141/2026/NĐ-CP". Chia theo số ký tự sẽ cắt một Điều làm đôi và ghép nửa sau với
Điều kế tiếp, nên agent sẽ trích sai Điều. Chỉ khi một Điều quá dài mới cắt tiếp,
theo ranh giới đoạn văn, và phần sau mang nhãn "Điều 5 (tiếp)".

PHẦN TRƯỚC ĐIỀU 1 (tên văn bản, căn cứ ban hành) là một đoạn riêng, nhãn
"Căn cứ ban hành". Nó trả lời câu "văn bản này dựa trên luật nào", nhưng không
được trích như một quy định.

BỎ DÒNG ĐẦU TRANG CÔNG BÁO ("20 CÔNG BÁO/Số 507 + 508/Ngày 20-4-2015"). Nó lặp
lại trên mỗi trang PDF, chen vào giữa câu và làm nhiễu tìm kiếm.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

TOI_DA_KY_TU = 2500

# Tăng số này mỗi khi đổi cách làm sạch hoặc chia đoạn: `nap_kho.py` tính nó vào
# dấu băm, nên mọi văn bản sẽ tự được nạp lại theo cách mới.
#   1 — chia theo Điều, bỏ dòng đầu trang Công báo.
#   2 — bỏ khối chữ ký số ("Ký bởi… Thời gian ký…"), dòng chỉ có số trang và ký
#       tự điều khiển. Cả ba lộ ra khi thử agent và nạp kho thật ngày 11/09/2026.
PHIEN_BAN = 2

_DAU_TRANG = re.compile(r"(?m)^[ \t]*(?:\d{1,4}[ \t]+)?CÔNG BÁO/Số[^\n]*$")
_CHU_KY_SO = re.compile(
    r"(?m)^[ \t]*Ký bởi:[^\n]*\n(?:[ \t]*Email:[^\n]*\n)?(?:[ \t]*Cơ quan:[^\n]*\n)?(?:[ \t]*Thời gian ký:[^\n]*(?:\n|$))?"
)
_SO_TRANG = re.compile(r"(?m)^[ \t]*\d{1,4}[ \t]*$")
# Ký tự điều khiển lọt ra từ PDF (mã 0–8, 11, 12, 14–31, 127). Postgres từ chối
# cả lô nạp khi gặp mã 0 — lần nạp đầu ngày 11/09/2026 dừng ở văn bản 16580 vì
# đúng lỗi này. Viết bằng mã thoát, không bao giờ để ký tự thật trong mã nguồn:
# Python không nạp nổi một file .py có byte 0.
_DIEU_KHIEN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_DIEU = re.compile(r"(?m)^[ \t]*(Điều[ \t]+\d+[a-zđ]?)[ \t]*[\.:]")


@dataclass
class Doan:
    thu_tu: int
    nhan: str | None
    noi_dung: str


def lam_sach(van: str) -> str:
    van = van.replace("\r\n", "\n").replace("\r", "\n")
    van = _DIEU_KHIEN.sub("", van)
    van = _DAU_TRANG.sub("", van)
    van = _CHU_KY_SO.sub("", van)
    van = _SO_TRANG.sub("", van)
    van = van.replace(" ", " ")  # khoảng trắng không ngắt dòng của PDF
    van = re.sub(r"[ \t]+", " ", van)
    van = re.sub(r" *\n *", "\n", van)
    van = re.sub(r"\n{3,}", "\n\n", van)
    return van.strip()


def _cat_theo_do_dai(van: str, toi_da: int) -> list[str]:
    """Cắt theo ranh giới dòng, mỗi phần không quá `toi_da` (trừ khi một dòng tự nó dài hơn)."""
    phan: list[str] = []
    hien = ""
    for dong in van.split("\n"):
        if hien and len(hien) + 1 + len(dong) > toi_da:
            phan.append(hien)
            hien = dong
        else:
            hien = f"{hien}\n{dong}" if hien else dong
    if hien:
        phan.append(hien)
    # Một dòng dài hơn cả giới hạn (PDF không xuống dòng): cắt cứng theo khoảng trắng.
    ra: list[str] = []
    for p in phan:
        while len(p) > toi_da:
            cat = p.rfind(" ", 0, toi_da)
            cat = cat if cat > toi_da // 2 else toi_da
            ra.append(p[:cat].strip())
            p = p[cat:].strip()
        if p:
            ra.append(p)
    return ra


def chia_doan(van: str, toi_da: int = TOI_DA_KY_TU) -> list[Doan]:
    van = lam_sach(van)
    if not van:
        return []

    moc = list(_DIEU.finditer(van))
    khoi: list[tuple[str | None, str]] = []
    if not moc:
        khoi.append((None, van))
    else:
        dau = van[: moc[0].start()].strip()
        if dau:
            khoi.append(("Căn cứ ban hành", dau))
        for i, m in enumerate(moc):
            ket = moc[i + 1].start() if i + 1 < len(moc) else len(van)
            khoi.append((re.sub(r"[ \t]+", " ", m.group(1)), van[m.start() : ket].strip()))

    ra: list[Doan] = []
    for nhan, noi_dung in khoi:
        for j, phan in enumerate(_cat_theo_do_dai(noi_dung, toi_da)):
            nhan_phan = nhan if j == 0 or nhan is None else f"{nhan} (tiếp)"
            ra.append(Doan(thu_tu=len(ra), nhan=nhan_phan, noi_dung=phan))
    return ra
