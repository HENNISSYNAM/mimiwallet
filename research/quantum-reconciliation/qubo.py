"""Quy bài toán đối soát của MIMI về QUBO.

BÀI TOÁN THẬT, không phải ví dụ dựng lên. Nó nằm trong
`supabase/functions/_shared/ledger/receivables.ts`, ở nhánh "khách gộp nhiều hoá
đơn vào một lần chuyển":

    Có một khoản tiền vào 47.300.000đ.
    Trong N hoá đơn đang mở, tổ hợp nào cộng lại đúng bằng số đó?

Đây là SUBSET-SUM — NP-hard. Mã TypeScript hiện KHÔNG giải nó: nó dùng heuristic
(ưu tiên số hoá đơn trong nội dung, rồi tên khách, phân bổ hoá đơn cũ trước), tức
là né bài toán tổ hợp. Heuristic đó đúng trong phần lớn trường hợp thật vì kế toán
bên mua thường ghi số hoá đơn. Thư mục này hỏi câu khác: *nếu* phải giải đúng bài
toán tổ hợp thì lượng tử có giúp được không.

CÔNG THỨC
---------

Cực tiểu hoá bình phương sai lệch giữa tổng đã chọn và số tiền nhận được:

    minimize  ( Σ aᵢxᵢ − P )²        với xᵢ ∈ {0,1}

Khai triển, dùng xᵢ² = xᵢ vì biến nhị phân:

    Σᵢ (aᵢ² − 2P·aᵢ)·xᵢ  +  Σᵢ<ⱼ 2aᵢaⱼ·xᵢxⱼ  +  P²

Hằng số P² không ảnh hưởng tới nghiệm, bỏ. Còn lại đúng dạng QUBO mà D-Wave nhận.

Giá trị hàm mục tiêu tại nghiệm bằng −P² khi khớp hoàn hảo (sau khi bỏ hằng số),
nên `nang_luong_ve_sai_lech` đổi ngược lại thành sai lệch tiền — con số kế toán
đọc được, thay vì một số năng lượng vô nghĩa với họ.

TỶ LỆ HOÁ
---------

Số tiền VND rất lớn (hàng chục triệu) và hệ số QUBO tỷ lệ với **bình phương** của
chúng. 47.300.000² ≈ 2,2·10¹⁵ — vượt xa dải động mà phần cứng annealing biểu diễn
được, nên bài toán sẽ bị nhiễu nuốt trước khi kịp giải.

Chia hết cho ước chung lớn nhất là phép co tỷ lệ **không mất mát**: mọi số tiền
VND thực tế đều chia hết cho 1000, thường là 10.000. Đây không phải mẹo — nó là
bước bắt buộc để bài toán vào được phần cứng, và nó cũng làm baseline cổ điển
nhanh lên đúng chừng ấy lần.
"""

from __future__ import annotations

from math import gcd
from functools import reduce
from typing import Dict, List, Sequence, Tuple

# Khoá QUBO: (i, j) với i <= j. i == j là hệ số tuyến tính.
QuboKey = Tuple[int, int]
Qubo = Dict[QuboKey, float]


def uoc_chung(amounts: Sequence[int], target: int) -> int:
    """ƯCLN của mọi số tiền, kể cả số tiền đích.

    Phải gồm cả `target`: nếu tổng các hoá đơn chia hết cho 10.000 mà khoản tiền
    nhận được thì không, bài toán vô nghiệm và chia theo ƯCLN của riêng các hoá
    đơn sẽ che mất điều đó.
    """
    return reduce(gcd, list(amounts) + [target])


def xay_qubo(amounts: Sequence[int], target: int) -> Tuple[Qubo, int]:
    """Dựng QUBO cho subset-sum. Trả về (qubo, hệ số đã chia).

    Hệ số chia được trả về để người gọi đổi nghiệm ngược lại ra tiền VND thật.
    """
    if target <= 0:
        raise ValueError("Số tiền nhận phải dương")
    if any(a <= 0 for a in amounts):
        raise ValueError("Số tiền hoá đơn phải dương")

    d = uoc_chung(amounts, target) or 1
    a = [x // d for x in amounts]
    P = target // d

    q: Qubo = {}
    n = len(a)
    for i in range(n):
        # aᵢ² − 2P·aᵢ
        q[(i, i)] = float(a[i] * a[i] - 2 * P * a[i])
    for i in range(n):
        for j in range(i + 1, n):
            # 2aᵢaⱼ
            q[(i, j)] = float(2 * a[i] * a[j])
    return q, d


def nang_luong_ve_sai_lech(nang_luong: float, target: int, he_so: int) -> int:
    """Đổi năng lượng QUBO ngược lại thành sai lệch tiền, đơn vị VND.

    Năng lượng đã bỏ hằng số P², nên cộng lại rồi lấy căn: |Σaᵢxᵢ − P|.
    Nhân lại hệ số chia để ra tiền thật.
    """
    P = target // he_so
    binh_phuong = max(0.0, nang_luong + P * P)
    return int(round(binh_phuong ** 0.5)) * he_so


def kiem_nghiem(amounts: Sequence[int], target: int, chon: Sequence[int]) -> int:
    """Sai lệch thật của một nghiệm, tính thẳng trên tiền VND.

    Dùng để kiểm chứng độc lập: không tin năng lượng do sampler trả về, mà cộng
    lại số tiền và so. Sampler nào cũng có thể trả về nghiệm kèm năng lượng sai
    nếu bài toán được dựng nhầm — và cách duy nhất phát hiện là cộng tay.
    """
    tong = sum(amounts[i] for i in chon)
    return abs(tong - target)
