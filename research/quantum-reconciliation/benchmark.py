"""Đo thật, trên dữ liệu giống dữ liệu đối soát của MIMI.

Chạy:  python research/quantum-reconciliation/benchmark.py

Không cần cài gì. Phần D-Wave nằm riêng trong `dwave_runner.py` và chỉ chạy khi
có token Leap.

CÁCH SINH DỮ LIỆU, và vì sao không dùng số ngẫu nhiên đều
---------------------------------------------------------

Subset-sum ngẫu nhiên đều là bài toán DỄ: các tổng phân tán rộng nên tìm được
nghiệm gần như ngay. Bài toán khó nằm ở vùng "mật độ cao" — nhiều số cùng bậc độ
lớn, tổng chồng lên nhau.

Dữ liệu công nợ thật rơi đúng vào vùng khó đó: một nhà cung cấp bán cùng mặt hàng
cho cùng nhóm khách, nên hoá đơn có giá trị gần nhau. Nhìn danh sách khách của
Thịnh Phát — cùng tỏi lột vỏ, cùng củ năng gọt vỏ — thì đó chính là hình dạng này.

Nên số tiền được sinh quanh một giá trị trung tâm với độ lệch hẹp, làm tròn tới
10.000đ như hoá đơn thật.
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from classical import giai_chinh_xac, giai_tham_lam  # noqa: E402
from qubo import xay_qubo, kiem_nghiem  # noqa: E402


def sinh_bai_toan(n: int, so_hoa_don_tra: int, seed: int) -> tuple[list[int], int]:
    """Sinh n hoá đơn, rồi cộng `so_hoa_don_tra` cái trong đó thành khoản tiền vào.

    Bài toán luôn CÓ nghiệm — cố ý. Muốn đo thời gian tìm ra nghiệm, không phải
    thời gian chứng minh vô nghiệm.
    """
    rng = random.Random(seed)
    trung_tam = 8_000_000
    amounts = [
        max(1, int(rng.gauss(trung_tam, trung_tam * 0.25)) // 10_000) * 10_000
        for _ in range(n)
    ]
    chon = rng.sample(range(n), so_hoa_don_tra)
    return amounts, sum(amounts[i] for i in chon)


def vnd(x: int) -> str:
    return f"{x:,}".replace(",", ".") + "đ"


def main() -> None:
    print("Đối soát gộp hoá đơn — subset-sum trên dữ liệu giống công nợ thật")
    print("=" * 78)
    print(f"{'hoá đơn':>8} {'gộp':>5} {'chính xác':>12} {'trạng thái':>12} "
          f"{'tham lam':>11} {'lệch tham lam':>16}")
    print("-" * 78)

    tong_qubo_bien = 0
    for n in (10, 20, 50, 100, 200, 500):
        so_gop = max(2, n // 10)
        amounts, target = sinh_bai_toan(n, so_gop, seed=n)

        cx = giai_chinh_xac(amounts, target)
        tl = giai_tham_lam(amounts, target)

        # Kiểm chứng độc lập: cộng tay lại, không tin kết quả tự báo.
        assert kiem_nghiem(amounts, target, cx.chon) == cx.sai_lech, "nghiệm tự mâu thuẫn"

        tran = " (chạm trần)" if cx.cham_tran else ""
        print(f"{n:>8} {so_gop:>5} {cx.giay*1000:>10.2f}ms "
              f"{cx.so_trang_thai:>12,} {tl.giay*1000:>9.3f}ms "
              f"{vnd(tl.sai_lech):>16}{tran}")

        if n <= 100:
            q, d = xay_qubo(amounts, target)
            tong_qubo_bien = n
            if n == 100:
                print(f"\nQUBO cho n=100: {len(q):,} hệ số, {n} biến nhị phân, "
                      f"chia tỷ lệ {d:,}")

    print("\n" + "=" * 78)
    print("ĐỌC KẾT QUẢ")
    print("=" * 78)
    print("""
Cột 'chính xác' là thời gian tìm ra tổ hợp đúng bằng máy tính thường.
Cột 'lệch tham lam' là sai lệch của heuristic — gần với cách receivables.ts
đang làm khi không có số hoá đơn trong nội dung chuyển khoản.

Hai điều đáng chú ý:

1. Tham lam SAI ở gần như mọi kích thước. Đây là bằng chứng bài toán tổ hợp có
   thật, không phải bịa ra để có cớ dùng lượng tử.

2. Nhưng giải chính xác vẫn nhanh. Chừng nào cột 'chính xác' còn tính bằng
   mili-giây, D-Wave KHÔNG có cửa: chỉ riêng độ trễ mạng tới Leap đã hàng trăm
   mili-giây, chưa kể hàng đợi.

Ngưỡng đáng để thử lượng tử là khi cột 'chính xác' vượt vài giây, hoặc khi cột
'trạng thái' chạm trần. Số liệu ở trên cho biết ngưỡng đó nằm ở đâu — và đó là
kết quả trung thực, kể cả khi nó nói rằng chưa cần lượng tử.
""")


if __name__ == "__main__":
    main()
