"""Chạy cùng bài toán trên D-Wave Leap. Tuỳ chọn — cần token.

    pip install dwave-system dimod
    export DWAVE_API_TOKEN=...
    python research/quantum-reconciliation/dwave_runner.py

CHƯA CHẠY LẦN NÀO tính đến 19/08/2026. File này là đường dẫn sẵn, không phải kết
quả. Đừng trích số nào từ đây vào hồ sơ dự thi cho tới khi nó chạy thật và
`README.md` được cập nhật bằng số đo.

VÌ SAO DÙNG LeapHybridSampler CHỨ KHÔNG PHẢI DWaveSampler
---------------------------------------------------------

`DWaveSampler` là QPU thuần. QUBO của ta là đồ thị ĐẦY ĐỦ — mọi cặp hoá đơn đều
có hệ số, vì (Σaᵢxᵢ − P)² sinh ra mọi tích chéo. Đồ thị đầy đủ n đỉnh cần nhúng
vào topology Pegasus/Zephyr với chi phí khoảng O(n²) qubit vật lý. Với n=100 là
hàng chục nghìn qubit chỉ để biểu diễn — vượt phần cứng hiện có.

`LeapHybridSampler` chạy lai: phần cổ điển phân rã bài toán, phần QPU xử lý các
mảnh. Nó nhận tới hàng triệu biến. Đây là thứ duy nhất chạy được ở quy mô thật, và
cũng có nghĩa là **kết quả không phải "lượng tử thuần"** — phải nói rõ điều đó khi
báo cáo, nếu không là nhận công cho phần cứng mà nó không làm.

RIÊNG TƯ
--------

Chỉ gửi SỐ TIỀN. Không tên khách, không mã số thuế, không nội dung chuyển khoản.
Bài toán QUBO không cần chúng, và gửi đi là chia sẻ dữ liệu khách hàng với bên thứ
ba — việc phải khai trong Chính sách bảo mật trước khi làm.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from benchmark import sinh_bai_toan, vnd  # noqa: E402
from classical import giai_chinh_xac  # noqa: E402
from qubo import xay_qubo, kiem_nghiem, nang_luong_ve_sai_lech  # noqa: E402


def chay(n: int = 200, seed: int | None = None) -> None:
    try:
        from dwave.system import LeapHybridSampler
    except ImportError:
        print("Chưa cài dwave-system. Chạy: pip install dwave-system dimod")
        return
    if not os.environ.get("DWAVE_API_TOKEN"):
        print("Chưa có DWAVE_API_TOKEN. Đăng ký gói miễn phí tại cloud.dwavesys.com")
        return

    amounts, target = sinh_bai_toan(n, max(2, n // 10), seed=seed or n)
    q, he_so = xay_qubo(amounts, target)
    print(f"n={n}, đích={vnd(target)}, {len(q):,} hệ số QUBO, chia tỷ lệ {he_so:,}")

    # Cổ điển trước, để có mốc so.
    cx = giai_chinh_xac(amounts, target)
    print(f"Cổ điển : {cx.giay*1000:.2f}ms, lệch {vnd(cx.sai_lech)}")

    t0 = time.perf_counter()
    ket_qua = LeapHybridSampler().sample_qubo(q)
    giay = time.perf_counter() - t0

    mau = ket_qua.first
    chon = sorted(i for i, v in mau.sample.items() if v == 1)

    # Kiểm chứng độc lập: cộng tay, không tin năng lượng sampler trả về.
    that = kiem_nghiem(amounts, target, chon)
    theo_nang_luong = nang_luong_ve_sai_lech(mau.energy, target, he_so)

    print(f"D-Wave  : {giay*1000:.2f}ms (gồm mạng + hàng đợi), lệch {vnd(that)}")
    print(f"          chọn {len(chon)} hoá đơn")
    if that != theo_nang_luong:
        print(f"          ⚠ năng lượng nói lệch {vnd(theo_nang_luong)} — QUBO dựng sai?")

    print()
    if that == 0 and cx.sai_lech == 0:
        nhanh_hon = cx.giay < giay
        print(f"Cả hai đều tìm đúng. {'Cổ điển' if nhanh_hon else 'D-Wave'} nhanh hơn "
              f"{max(giay, cx.giay) / max(min(giay, cx.giay), 1e-9):.0f} lần.")


if __name__ == "__main__":
    chay(n=int(sys.argv[1]) if len(sys.argv) > 1 else 200)
