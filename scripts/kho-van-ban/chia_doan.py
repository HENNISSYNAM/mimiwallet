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

_DAU_TRANG = re.compile(r"(?m)^[ \t]*(?:\d{1,4}[ \t]+)?CÔNG BÁO/Số[^\n]*$")
_DIEU = re.compile(r"(?m)^[ \t]*(Điều[ \t]+\d+[a-zđ]?)[ \t]*[\.:]")


@dataclass
class Doan:
    thu_tu: int
    nhan: str | None
    noi_dung: str


def lam_sach(van: str) -> str:
    van = _DAU_TRANG.sub("", van)
    van = van.replace(" ", " ")
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
