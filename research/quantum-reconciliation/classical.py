"""Baseline cổ điển cho cùng bài toán subset-sum.

Tồn tại để trả lời câu hỏi duy nhất đáng hỏi: **lượng tử có nhanh hơn không?**

Một benchmark chỉ chạy phía lượng tử rồi khoe "giải được" là vô nghĩa — bài toán
này máy tính thường cũng giải được. Con số duy nhất có ý nghĩa là thời gian so
sánh trên cùng bộ dữ liệu.

THUẬT TOÁN: quy hoạch động thưa trên tập tổng đạt tới được.

Không dùng mảng DP đặc kích thước P vì P là tiền VND (hàng chục triệu) — mảng đó
sẽ tốn hàng chục MB cho một bài toán 20 hoá đơn. Thay vào đó giữ một dict các
tổng đạt tới được, và **cắt tỉa mọi tổng vượt quá đích**: đã vượt thì thêm hoá
đơn nữa chỉ vượt xa hơn, vì mọi số tiền đều dương.

Phép cắt tỉa đó là thứ làm bài toán chạy được trong thực tế. Với dữ liệu đối soát
thật — vài chục tới vài trăm hoá đơn, số tiền cùng bậc độ lớn — số trạng thái
sinh ra nhỏ hơn nhiều so với giới hạn lý thuyết 2ⁿ.

`gioi_han_trang_thai` chặn trường hợp xấu. Chạm trần thì trả về `capped=True` chứ
không âm thầm trả nghiệm sai — một baseline nói dối còn tệ hơn không có baseline.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from math import gcd
from functools import reduce
from typing import Dict, List, Optional, Sequence, Tuple


@dataclass
class KetQua:
    """Kết quả một lần giải."""

    tim_thay: bool
    chon: List[int]
    """Chỉ số các hoá đơn được chọn."""
    sai_lech: int
    """Sai lệch tiền, VND. 0 là khớp hoàn hảo."""
    giay: float
    so_trang_thai: int
    cham_tran: bool


def giai_chinh_xac(
    amounts: Sequence[int],
    target: int,
    gioi_han_trang_thai: int = 5_000_000,
) -> KetQua:
    """Tìm tổ hợp hoá đơn cộng đúng bằng `target`.

    Trả về tổ hợp đầu tiên tìm được. Bài toán có thể có nhiều nghiệm — chọn cái
    nào là quyết định nghiệp vụ (hoá đơn cũ trước), không phải của thuật toán.
    """
    t0 = time.perf_counter()

    d = reduce(gcd, list(amounts) + [target]) or 1
    a = [x // d for x in amounts]
    P = target // d

    # tổng đạt tới được -> danh sách chỉ số tạo ra nó
    dat_toi: Dict[int, List[int]] = {0: []}
    cham_tran = False

    for i, gia_tri in enumerate(a):
        moi: Dict[int, List[int]] = {}
        for tong, chon in dat_toi.items():
            t = tong + gia_tri
            # Cắt tỉa: vượt đích thì không đường nào quay lại, vì mọi số dương.
            if t > P or t in dat_toi or t in moi:
                continue
            moi[t] = chon + [i]
            if t == P:
                dat_toi.update(moi)
                return KetQua(
                    tim_thay=True,
                    chon=moi[t],
                    sai_lech=0,
                    giay=time.perf_counter() - t0,
                    so_trang_thai=len(dat_toi),
                    cham_tran=False,
                )
        dat_toi.update(moi)
        if len(dat_toi) > gioi_han_trang_thai:
            cham_tran = True
            break

    # Không khớp tuyệt đối — trả tổ hợp gần nhất, vẫn hữu ích cho kế toán.
    gan_nhat = min(dat_toi.keys(), key=lambda t: abs(t - P))
    return KetQua(
        tim_thay=False,
        chon=dat_toi[gan_nhat],
        sai_lech=abs(gan_nhat - P) * d,
        giay=time.perf_counter() - t0,
        so_trang_thai=len(dat_toi),
        cham_tran=cham_tran,
    )


def giai_tham_lam(amounts: Sequence[int], target: int) -> KetQua:
    """Tham lam: xếp giảm dần, nhận hoá đơn nào còn vừa.

    Đây là thứ gần nhất với cách `receivables.ts` đang làm, và là mốc dưới. Nếu
    lượng tử không thắng nổi cả tham lam thì không cần bàn tiếp.
    """
    t0 = time.perf_counter()
    thu_tu = sorted(range(len(amounts)), key=lambda i: -amounts[i])
    con = target
    chon: List[int] = []
    for i in thu_tu:
        if amounts[i] <= con:
            chon.append(i)
            con -= amounts[i]
    return KetQua(
        tim_thay=con == 0,
        chon=sorted(chon),
        sai_lech=con,
        giay=time.perf_counter() - t0,
        so_trang_thai=len(amounts),
        cham_tran=False,
    )
