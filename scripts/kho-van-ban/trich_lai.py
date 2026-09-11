"""
Trích lại toàn văn các văn bản đang lấy chữ từ PDF, bằng PyMuPDF.

VÌ SAO. pypdf chẻ âm tiết tiếng Việt: "Căn c ứ Ngh ị định s ố". Đo trên 40 PDF
mẫu ngày 11/09/2026: pypdf 62,4 chỗ chẻ trên 1000 từ (trung vị), PyMuPDF 0,0 —
bằng mốc của văn bản lấy từ DOCX. Chữ bị chẻ thì tìm "Nghị định" không ra, và
agent trích dẫn sai chữ của chính văn bản luật.

Chạy trên tệp gốc đã tải (tep-goc/), không gọi mạng. An toàn khi bộ cào đang
chạy song song: bỏ qua tệp JSON vừa được ghi trong 10 phút gần nhất. Chạy lại
nhiều lần được — văn bản đã trích lại mang `nguon_toan_van = "pdf-pymupdf"` và
bị bỏ qua.

    python scripts/kho-van-ban/trich_lai.py --thu-muc "<kho>" --chi-do   # chỉ đo
    python scripts/kho-van-ban/trich_lai.py --thu-muc "<kho>"            # ghi
"""
from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

import pymupdf

NGUYEN_AM = "aàáạảãăằắặẳẵâầấậẩẫeèéẹẻẽêềếệểễiìíịỉĩoòóọỏõôồốộổỗơờớợởỡuùúụủũưừứựửữyỳýỵỷỹ"

# Cụm chỉ gồm phụ âm, viết thường, đứng riêng, rồi tới một từ bắt đầu bằng nguyên
# âm: "c ứ", "ngh ị", "s ố". Tiếng Việt đúng không có từ nào chỉ gồm phụ âm, nên
# đây là dấu vết âm tiết bị chẻ.
_CHE = re.compile(r"(?<![\w])[bcdđghklmnpqrstvx]{1,3} (?=[" + NGUYEN_AM + r"])")

BO_QUA_MOI_GHI_GIAY = 600


def ty_le_che(van: str) -> float:
    """Số chỗ chẻ âm tiết trên 1000 từ."""
    return 1000 * len(_CHE.findall(van)) / max(1, len(van.split()))


def trich_pdf(duong_dan: Path) -> str:
    with pymupdf.open(duong_dan) as tai_lieu:
        return "\n".join(trang.get_text() for trang in tai_lieu).strip()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--thu-muc", required=True, help="Thư mục kho (có van-ban/ và tep-goc/)")
    ap.add_argument("--chi-do", action="store_true", help="Chỉ đo và in tổng kết, không ghi file")
    a = ap.parse_args()

    kho = Path(a.thu_muc)
    dem = {"xet": 0, "thay": 0, "giu_ban_cu": 0, "thieu_tep": 0, "moi_ghi": 0, "loi": 0}
    truoc: list[float] = []
    sau: list[float] = []

    for tep_json in sorted((kho / "van-ban").glob("*.json")):
        if time.time() - tep_json.stat().st_mtime < BO_QUA_MOI_GHI_GIAY:
            dem["moi_ghi"] += 1
            continue
        try:
            ban_ghi = json.loads(tep_json.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            dem["loi"] += 1
            continue
        if ban_ghi.get("nguon_toan_van") != "pdf" or not ban_ghi.get("tep_goc"):
            continue

        dem["xet"] += 1
        pdf = kho / "tep-goc" / ban_ghi["tep_goc"]
        if not pdf.exists():
            dem["thieu_tep"] += 1
            continue
        try:
            moi = trich_pdf(pdf)
        except Exception:  # noqa: BLE001 — một PDF hỏng không được dừng cả kho
            dem["loi"] += 1
            continue

        cu = ban_ghi.get("toan_van") or ""
        che_cu, che_moi = ty_le_che(cu), ty_le_che(moi)
        # Chỉ thay khi bản mới có chữ và không tệ hơn bản cũ.
        if not moi or che_moi > che_cu:
            dem["giu_ban_cu"] += 1
            continue

        truoc.append(che_cu)
        sau.append(che_moi)
        dem["thay"] += 1
        if not a.chi_do:
            ban_ghi["toan_van"] = moi
            ban_ghi["co_toan_van"] = True
            ban_ghi["nguon_toan_van"] = "pdf-pymupdf"
            ban_ghi["trich_lai_luc"] = time.strftime("%Y-%m-%dT%H:%M:%S")
            tep_json.write_text(json.dumps(ban_ghi, ensure_ascii=False, indent=1), encoding="utf-8")

    trung_vi = lambda xs: sorted(xs)[len(xs) // 2] if xs else 0.0  # noqa: E731
    print(
        ("CHỈ ĐO · " if a.chi_do else "ĐÃ GHI · ")
        + json.dumps(dem, ensure_ascii=False)
        + f" · chỗ chẻ/1000 từ: trước {trung_vi(truoc):.1f} → sau {trung_vi(sau):.1f}",
        flush=True,
    )


if __name__ == "__main__":
    main()
