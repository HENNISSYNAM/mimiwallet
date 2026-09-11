"""
Nạp kho văn bản pháp luật lên Supabase qua function tạm `nap-kho-luat`.

MÃ NẠP KHÔNG ĐI QUA DÒNG LỆNH HAY ĐOẠN CHAT. Nó nằm trong một tệp .env
(`NAP_KHO_TOKEN=...`) sinh ngay tại máy; cùng tệp đó được đưa lên Supabase bằng
`supabase secrets set --env-file`. Script chỉ đọc tệp, không in mã ra.

CHẠY LẠI ĐƯỢC. `nap-trang-thai.json` trong thư mục kho nhớ dấu băm toàn văn của
từng văn bản đã nạp; văn bản không đổi thì bỏ qua, văn bản vừa trích lại hay bổ
sung chữ thì nạp lại.

    python scripts/kho-van-ban/nap_kho.py --thu-muc "<kho>" --tep-token "<tệp .env>" [--gioi-han 20]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from chia_doan import PHIEN_BAN, chia_doan  # noqa: E402

DIA_CHI = "https://xzymxgdavepvygdcmfup.supabase.co/functions/v1/nap-kho-luat"
TRAN_BYTE_MOI_LO = 900_000
TRAN_VAN_BAN_MOI_LO = 40


def doc_token(tep: Path) -> str:
    for dong in tep.read_text(encoding="utf-8").splitlines():
        if dong.startswith("NAP_KHO_TOKEN="):
            return dong.split("=", 1)[1].strip()
    raise SystemExit(f"Không thấy NAP_KHO_TOKEN trong {tep}")


def gui(lo: list[dict] | dict, token: str) -> dict:
    """`lo` là danh sách văn bản, hoặc một lệnh (dict) như `{"lam_moi_tu_pho_bien": True}`."""
    than = lo if isinstance(lo, dict) else {"van_ban": lo}
    du_lieu = json.dumps(than, ensure_ascii=False).encode("utf-8")
    loi_cuoi = None
    for lan in range(4):
        req = urllib.request.Request(
            DIA_CHI, data=du_lieu, method="POST",
            headers={"Content-Type": "application/json; charset=utf-8", "x-nap-token": token},
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            loi_cuoi = f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}"
            if e.code in (400, 401, 503):
                break
        except Exception as e:  # noqa: BLE001
            loi_cuoi = str(e)
        time.sleep(5 * (lan + 1))
    raise RuntimeError(loi_cuoi)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--thu-muc", required=True)
    ap.add_argument("--tep-token", required=True)
    ap.add_argument("--gioi-han", type=int, default=None, help="Chỉ nạp N văn bản (để thử)")
    a = ap.parse_args()

    kho = Path(a.thu_muc)
    token = doc_token(Path(a.tep_token))
    tep_trang_thai = kho / "nap-trang-thai.json"
    da_nap: dict[str, str] = json.loads(tep_trang_thai.read_text(encoding="utf-8")) if tep_trang_thai.exists() else {}

    lo: list[dict] = []
    bam_lo: dict[str, str] = {}
    byte_lo = 0
    dem = {"nap": 0, "doan": 0, "khong_doi": 0, "khong_chu": 0, "bo_qua_may_chu": 0}

    def xa_lo() -> None:
        nonlocal lo, bam_lo, byte_lo
        if not lo:
            return
        kq = gui(lo, token)
        dem["nap"] += kq.get("van_ban", 0)
        dem["doan"] += kq.get("doan", 0)
        dem["bo_qua_may_chu"] += len(kq.get("bo_qua", []))
        bo_qua = set(kq.get("bo_qua", []))
        for ma, bam in bam_lo.items():
            if ma not in bo_qua:
                da_nap[ma] = bam
        tep_trang_thai.write_text(json.dumps(da_nap), encoding="utf-8")
        print("[nạp]", json.dumps(dem, ensure_ascii=False), flush=True)
        lo, bam_lo, byte_lo = [], {}, 0

    for tep in sorted((kho / "van-ban").glob("*.json")):
        if a.gioi_han is not None and dem["nap"] + len(lo) >= a.gioi_han:
            break
        # Bộ cào có thể đang ghi đúng file này: bỏ qua file vừa sửa trong 60 giây
        # và file JSON chưa ghi xong, lần nạp sau sẽ lấy.
        if time.time() - tep.stat().st_mtime < 60:
            dem["dang_ghi"] = dem.get("dang_ghi", 0) + 1
            continue
        try:
            d = json.loads(tep.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            dem["dang_ghi"] = dem.get("dang_ghi", 0) + 1
            continue
        van = d.get("toan_van") or ""
        if not d.get("co_toan_van") or not van:
            dem["khong_chu"] += 1
            continue
        # Phiên bản chia đoạn nằm trong dấu băm: đổi cách chia là nạp lại hết.
        bam = hashlib.sha1(f"chia-v{PHIEN_BAN}\n{van}".encode("utf-8")).hexdigest()
        if da_nap.get(d["ma_cong_bao"]) == bam:
            dem["khong_doi"] += 1
            continue

        doan = [{"thu_tu": x.thu_tu, "nhan": x.nhan, "noi_dung": x.noi_dung} for x in chia_doan(van)]
        if not doan:
            dem["khong_chu"] += 1
            continue
        muc = {k: d.get(k) for k in (
            "ma_cong_bao", "so_hieu", "loai", "co_quan", "ngay_ban_hanh", "ngay_hieu_luc",
            "ten", "trich_yeu", "nguoi_ky", "url", "nguon_toan_van",
        )}
        muc["doan"] = doan
        kich_thuoc = len(json.dumps(muc, ensure_ascii=False).encode("utf-8"))

        if lo and (byte_lo + kich_thuoc > TRAN_BYTE_MOI_LO or len(lo) >= TRAN_VAN_BAN_MOI_LO):
            xa_lo()
        lo.append(muc)
        bam_lo[d["ma_cong_bao"]] = bam
        byte_lo += kich_thuoc

    xa_lo()
    print("XONG NẠP", json.dumps(dem, ensure_ascii=False), flush=True)

    # Tìm kiếm lọc bằng từ hiếm nhất; kho đổi thì tần suất phải tính lại, không
    # thì văn bản mới nạp có những từ "không tồn tại" và không bao giờ được lọc ra.
    if dem["nap"] > 0:
        kq = gui({"lam_moi_tu_pho_bien": True}, token)
        print("LÀM MỚI TẦN SUẤT TỪ", json.dumps(kq, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
