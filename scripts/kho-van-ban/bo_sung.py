"""
Bổ sung toàn văn cho những văn bản đã có siêu dữ liệu nhưng chưa có chữ.

VÌ SAO. Đợt cào đầu (10/09/2026) chỉ tìm link tải trên trang danh sách. Văn bản
cũ, khoảng 2010–2017, chỉ có link trên trang chi tiết, nên 1.874 văn bản nằm
trong kho với `co_toan_van = false` dù Công báo có sẵn PDF. `thu_thap.py` đã
sửa cho các lần cào sau; file này quay lại lấp những văn bản đã bỏ sót.

Chạy SAU khi bộ cào xong, không chạy song song — hai tiến trình cùng gọi Công
báo là gấp đôi tải lên một trang của Nhà nước. Chạy lại được: văn bản đã bổ
sung có chữ và bị bỏ qua.

    python scripts/kho-van-ban/bo_sung.py --thu-muc "<kho>" [--gioi-han 50]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from thu_thap import (  # noqa: E402
    doc_trang_chi_tiet,
    ghi_loi,
    goi,
    nhan_nguon,
    van_tu_docx,
    van_tu_pdf,
)


def bo_sung_mot(kho: Path, tep_json: Path, ban_ghi: dict) -> str:
    """Trả về kết quả: 'co_chu' | 'khong_link' | 'khong_trich_duoc'."""
    chi_tiet = doc_trang_chi_tiet(goi(ban_ghi["url"]))  # type: ignore[arg-type]
    for loai in ("docx", "pdf"):
        link = chi_tiet.get(f"link_{loai}")
        if not link:
            continue
        try:
            du_lieu = goi(link, nhi_phan=True)
            assert isinstance(du_lieu, bytes)
            van = van_tu_docx(du_lieu) if loai == "docx" else van_tu_pdf(du_lieu)
        except Exception as e:  # noqa: BLE001
            ghi_loi(kho, link, f"bo sung {loai}: {e}")
            continue
        if not van:
            continue
        tep_goc = kho / "tep-goc" / f"{ban_ghi['ma_cong_bao']}.{loai}"
        tep_goc.write_bytes(du_lieu)
        ban_ghi.update(
            toan_van=van,
            co_toan_van=True,
            nguon_toan_van=nhan_nguon(loai),
            tep_goc=tep_goc.name,
            bo_sung_luc=time.strftime("%Y-%m-%dT%H:%M:%S"),
        )
        tep_json.write_text(json.dumps(ban_ghi, ensure_ascii=False, indent=1), encoding="utf-8")
        return "co_chu"
    return "khong_link" if not (chi_tiet.get("link_docx") or chi_tiet.get("link_pdf")) else "khong_trich_duoc"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--thu-muc", required=True)
    ap.add_argument("--gioi-han", type=int, default=None, help="Chỉ xử lý N văn bản (để thử)")
    a = ap.parse_args()

    kho = Path(a.thu_muc)
    (kho / "tep-goc").mkdir(exist_ok=True)
    dem = {"xet": 0, "co_chu": 0, "khong_link": 0, "khong_trich_duoc": 0, "loi": 0}

    for tep_json in sorted((kho / "van-ban").glob("*.json")):
        if a.gioi_han is not None and dem["xet"] >= a.gioi_han:
            break
        ban_ghi = json.loads(tep_json.read_text(encoding="utf-8"))
        if ban_ghi.get("co_toan_van"):
            continue
        dem["xet"] += 1
        try:
            dem[bo_sung_mot(kho, tep_json, ban_ghi)] += 1
        except Exception as e:  # noqa: BLE001
            dem["loi"] += 1
            ghi_loi(kho, ban_ghi.get("url", str(tep_json)), f"bo sung: {e}")
        if dem["xet"] % 25 == 0:
            print("[bổ sung]", json.dumps(dem, ensure_ascii=False), flush=True)

    print("XONG BỔ SUNG", json.dumps(dem, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
