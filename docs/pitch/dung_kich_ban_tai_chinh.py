"""Dựng bảng kịch bản tài chính MIMI 36 tháng (11/2026 – 10/2029), 3 kịch bản, công thức sống."""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.comments import Comment
from openpyxl.chart import LineChart, Reference

OUT = sys.argv[1]
F = 'Arial'
XANH = Font(name=F, color='0000FF')          # input cứng
DEN = Font(name=F)
DAM = Font(name=F, bold=True)
TIEU = Font(name=F, bold=True, size=14)
VANG = PatternFill('solid', fgColor='FFFF00')
XAM = PatternFill('solid', fgColor='EFE9DC')
VND = '#,##0;(#,##0);-'
PCT = '0.0%;(0.0%);-'
SO = '#,##0.0;(#,##0.0);-'
mong = Side(style='thin', color='C9C2B0')

wb = Workbook()
gd = wb.active
gd.title = 'Gia dinh'
KB = ['Than trong', 'Co so', 'Lac quan']
COT = {'Than trong': 'C', 'Co so': 'D', 'Lac quan': 'E'}

gd['A1'] = 'MIMI — Giả định kịch bản tài chính (đơn vị: đồng, chưa gồm VAT)'; gd['A1'].font = TIEU
gd['A2'] = ('Ô chữ XANH = số đầu vào. Ô nền VÀNG = giả định ĐỀ XUẤT, chưa có số thật — sửa ở đây, mọi sheet tự tính lại. '
            'Cột F ghi nguồn. Không có ô nào là số thật của khách hàng.')
gd['A2'].font = Font(name=F, italic=True)
for j, h in enumerate(['Giả định', 'Đơn vị', 'Thận trọng', 'Cơ sở', 'Lạc quan', 'Nguồn / ghi chú'], 1):
    c = gd.cell(row=4, column=j, value=h); c.font = DAM; c.fill = XAM

# (khoá, tên, đơn vị, [than trong, co so, lac quan], định dạng, nguồn, là đề xuất?)
DONG = [
    ('h_tieu', 'GIÁ VÀ CHI PHÍ ĐÃ CÓ TRONG MÃ', None, None, None, None, None),
    ('gia_starter', 'Giá gói Starter', 'đ/tháng', [149000]*3, VND, 'bang-gia.ts GOI_THANG.starter (giá đang bán)', False),
    ('gia_growth', 'Giá gói Growth', 'đ/tháng', [249000]*3, VND, 'bang-gia.ts GOI_THANG.growth (giá đang bán)', False),
    ('xu_thang', 'Xu mỗi gói tháng', 'xu/tháng', [3000]*3, '#,##0', 'bang-gia.ts HAN_MUC_XU.goi_thang', False),
    ('usd_xu', 'Chi phí token của 1 xu', 'USD', [0.001]*3, '0.000', 'bang-gia.ts USD_MOT_XU_DE_XUAT', False),
    ('ty_gia', 'Tỷ giá USD/VND', 'đ', [26500]*3, VND, 'bang-gia.ts TY_GIA_USD_VND_DE_XUAT', False),
    ('h_dt', 'DOANH THU (ĐỀ XUẤT)', None, None, None, None, None),
    ('ty_le_growth', 'Tỷ lệ khách trực tiếp chọn Growth', '%', [0.2, 0.3, 0.4], PCT, 'Đề xuất — đo lại sau 3 tháng bán', True),
    ('gia_kt', 'Giá cho văn phòng kế toán, mỗi hộ khách', 'đ/hộ/tháng', [79000, 99000, 119000], VND,
     'Đề xuất; phải thấp hơn hẳn 300k–1tr/hộ họ đang thu (docs/NGHIEN_CUU_CONG_NGHE_WTP_2026-10.md)', True),
    ('kt_thang1', 'Văn phòng kế toán chạy thử ở tháng 1', 'văn phòng', [1, 3, 5], '#,##0', 'Mục tiêu chạy thử: ≥3 văn phòng (docs/CHON_TRONG_TAM_2026-10-28.md)', True),
    ('kt_moi', 'Văn phòng kế toán mới mỗi tháng (từ tháng 2)', 'văn phòng/tháng', [1, 3, 6], '#,##0', 'Đề xuất', True),
    ('kt_bat_dau', 'Số hộ mỗi văn phòng mang vào lúc bắt đầu', 'hộ', [5, 5, 5], '#,##0', 'Mục tiêu chạy thử: 5 hộ/văn phòng', True),
    ('kt_them', 'Hộ thêm mỗi văn phòng mỗi tháng', 'hộ/tháng', [1, 2, 3], '#,##0', 'Đề xuất', True),
    ('kt_tran', 'Trần số hộ mỗi văn phòng', 'hộ', [40, 60, 100], '#,##0', 'Đề xuất', True),
    ('kt_roi', 'Tỷ lệ văn phòng bỏ mỗi tháng', '%/tháng', [0.03, 0.02, 0.01], PCT, 'Đề xuất', True),
    ('tt_moi', 'Hộ trả tiền trực tiếp mới — tháng 1', 'hộ/tháng', [10, 30, 80], '#,##0', 'Đề xuất', True),
    ('tt_tang', 'Tăng số hộ mới mỗi tháng', '%/tháng', [0.03, 0.05, 0.08], PCT, 'Đề xuất', True),
    ('tt_roi', 'Hộ trực tiếp bỏ mỗi tháng', '%/tháng', [0.06, 0.04, 0.03], PCT, 'Đề xuất', True),
    ('h_cp', 'CHI PHÍ (ĐỀ XUẤT)', None, None, None, None, None),
    ('dung_xu', 'Phần hạn mức xu khách dùng thật', '%', [0.6, 0.5, 0.4], PCT, 'Đề xuất — đo từ lan_goi_mo_hinh khi có khách', True),
    ('ha_tang_co_dinh', 'Hạ tầng cố định (Supabase, Vercel, tên miền…)', 'đ/tháng', [6000000, 5000000, 5000000], VND, 'Đề xuất — thay bằng hoá đơn thật', True),
    ('ha_tang_moi_kh', 'Hạ tầng thêm theo mỗi hộ trả tiền', 'đ/hộ/tháng', [2000]*3, VND, 'Đề xuất', True),
    ('phi_bien', 'Phí thanh toán và chi biến đổi khác', '% doanh thu', [0.03]*3, PCT, 'Đề xuất', True),
    ('nguoi_1', 'Nhân sự toàn thời gian, tháng 1–6', 'người', [2, 2, 2], '#,##0', 'Đề xuất', True),
    ('nguoi_2', 'Nhân sự toàn thời gian, tháng 7–18', 'người', [3, 4, 5], '#,##0', 'Đề xuất', True),
    ('nguoi_3', 'Nhân sự toàn thời gian, tháng 19–36', 'người', [4, 6, 9], '#,##0', 'Đề xuất', True),
    ('luong', 'Chi phí bình quân một người (gồm bảo hiểm)', 'đ/người/tháng', [25000000]*3, VND, 'Đề xuất', True),
    ('cac_tt', 'Chi phí có một hộ trực tiếp (CAC)', 'đ/hộ', [400000, 300000, 250000], VND, 'Đề xuất', True),
    ('cac_kt', 'Chi phí có một văn phòng kế toán', 'đ/văn phòng', [5000000]*3, VND, 'Đề xuất', True),
    ('quan_ly', 'Chi phí quản lý cố định (văn phòng, pháp lý, kế toán)', 'đ/tháng', [10000000]*3, VND, 'Đề xuất', True),
    ('kiem_toan', 'Kiểm thử bảo mật độc lập (một lần)', 'đ', [150000000]*3, VND, 'Đề xuất — xin báo giá (docs/an-ninh/PHAM_VI_KIEM_THU_DOC_LAP.md)', True),
    ('kiem_toan_thang', 'Tháng làm kiểm thử bảo mật', 'tháng thứ', [6, 4, 4], '#,##0', 'Đề xuất', True),
    ('h_von', 'VỐN', None, None, None, None, None),
    ('tien_dau', 'Tiền mặt đầu kỳ (10/2026)', 'đ', [0]*3, VND, 'ĐIỀN số thật', True),
    ('goi_von', 'Vốn gọi được', 'đ', [0]*3, VND, 'ĐIỀN — để 0 để thấy cần gọi bao nhiêu', True),
    ('goi_von_thang', 'Tháng nhận vốn', 'tháng thứ', [3]*3, '#,##0', 'Đề xuất', True),
    ('giai_usd', 'Giải thưởng (giả thiết thắng)', 'USD', [20000]*3, '#,##0', 'Người dùng nêu: giả thiết thắng 20.000 USD', False),
    ('giai_thang', 'Tháng nhận tiền giải', 'tháng thứ', [1]*3, '#,##0', 'Đề xuất', True),
    ('som', 'Thị trường mục tiêu (SOM)', 'hộ', [250000]*3, '#,##0', '~10% của ~2,5 triệu hộ do thuế quản lý (Bộ Tài chính: ~2,3 triệu, 90%, dưới ngưỡng)', False),
]
REF = {}
r = 5
for k, ten, dv, v, fmt, nguon, de_xuat in DONG:
    if v is None:
        c = gd.cell(row=r, column=1, value=ten); c.font = DAM
        r += 1
        continue
    gd.cell(row=r, column=1, value=ten).font = DEN
    gd.cell(row=r, column=2, value=dv).font = DEN
    for j, x in enumerate(v):
        c = gd.cell(row=r, column=3 + j, value=x)
        c.font = XANH; c.number_format = fmt
        if de_xuat:
            c.fill = VANG
    gd.cell(row=r, column=6, value=nguon).font = DEN
    REF[k] = r
    r += 1
gd.column_dimensions['A'].width = 52
gd.column_dimensions['B'].width = 16
for c in 'CDE':
    gd.column_dimensions[c].width = 15
gd.column_dimensions['F'].width = 90
gd.freeze_panes = 'C5'

N = 36
THANG = []
for i in range(N):
    m = 11 + i
    y = 2026 + (m - 1) // 12
    THANG.append(f'{(m - 1) % 12 + 1:02d}/{y}')


def g(k, kb):
    return f"'Gia dinh'!${COT[kb]}${REF[k]}"


HANG = [  # (khoá, nhãn, định dạng)
    ('t', 'Tháng thứ', '#,##0'),
    ('kt_moi', 'Văn phòng kế toán mới', '#,##0'),
    ('kt', 'Văn phòng kế toán đang dùng', SO),
    ('ho_kt', 'Hộ qua văn phòng kế toán', '#,##0'),
    ('tt_moi', 'Hộ trực tiếp mới', SO),
    ('ho_tt', 'Hộ trả tiền trực tiếp', '#,##0'),
    ('ho', 'TỔNG HỘ TRẢ TIỀN', '#,##0'),
    ('thi_phan', 'Phần SOM đã chiếm', '0.00%'),
    (None, 'DOANH THU', None),
    ('dt_kt', 'Doanh thu kênh kế toán', VND),
    ('dt_tt', 'Doanh thu trực tiếp', VND),
    ('dt', 'TỔNG DOANH THU THÁNG (MRR)', VND),
    (None, 'CHI PHÍ', None),
    ('cp_ai', 'Token AI', VND),
    ('cp_ht', 'Hạ tầng', VND),
    ('cp_bien', 'Phí thanh toán và biến đổi', VND),
    ('cp_ns', 'Nhân sự', VND),
    ('cp_mk', 'Có khách (marketing, bán hàng)', VND),
    ('cp_ql', 'Quản lý', VND),
    ('cp_kt', 'Kiểm thử bảo mật', VND),
    ('cp', 'TỔNG CHI PHÍ', VND),
    ('ebitda', 'LÃI/LỖ HOẠT ĐỘNG (EBITDA)', VND),
    ('bien_gop', 'Biên lợi nhuận gộp (sau token, hạ tầng, phí)', PCT),
    ('hoa_von', 'Đã hoà vốn? (1 = có)', '0'),
    (None, 'TIỀN MẶT', None),
    ('von', 'Vốn nhận', VND),
    ('tien', 'Tiền mặt cuối tháng', VND),
    ('tien_khong_von', 'Tiền mặt nếu không gọi vốn', VND),
    ('tien_giai', 'Tiền mặt nếu chỉ có tiền giải 20k USD', VND),
    ('het_giai', 'Hết tiền (chỉ có giải)? (1 = có)', '0'),
]


def dung_kb(kb):
    ws = wb.create_sheet(kb)
    ws['A1'] = f'MIMI — Kịch bản {kb.replace("Than trong", "thận trọng").replace("Co so", "cơ sở").replace("Lac quan", "lạc quan")} (đồng, chưa VAT)'
    ws['A1'].font = TIEU
    ws.cell(row=3, column=1, value='Tháng').font = DAM
    for i, th in enumerate(THANG):
        c = ws.cell(row=3, column=2 + i, value=th); c.font = DAM; c.fill = XAM; c.alignment = Alignment(horizontal='center')
    R = {}
    r = 4
    for k, nhan, fmt in HANG:
        c = ws.cell(row=r, column=1, value=nhan)
        c.font = DAM if (k is None or nhan.isupper() or k in ('ho', 'dt', 'cp', 'ebitda', 'tien')) else DEN
        if k is None:
            c.fill = XAM
        else:
            R[k] = r
        r += 1
    for i in range(N):
        col = L(2 + i)
        prv = L(1 + i)
        dau = i == 0

        def S(k, v, fmt=None):
            cell = ws[f'{col}{R[k]}']
            cell.value = v
            cell.font = DEN
            cell.number_format = dict((a, f) for a, _, f in HANG if a)[k]

        S('t', i + 1)
        ws[f'{col}{R["t"]}'].font = XANH
        t = f'{col}{R["t"]}'
        S('kt_moi', f'=IF({t}=1,{g("kt_thang1", kb)},{g("kt_moi", kb)})')
        S('kt', f'={col}{R["kt_moi"]}' if dau else f'={prv}{R["kt"]}*(1-{g("kt_roi", kb)})+{col}{R["kt_moi"]}')
        if dau:
            S('ho_kt', f'=MIN({col}{R["kt"]}*{g("kt_tran", kb)},{col}{R["kt_moi"]}*{g("kt_bat_dau", kb)})')
        else:
            S('ho_kt', f'=MIN({col}{R["kt"]}*{g("kt_tran", kb)},{prv}{R["ho_kt"]}*(1-{g("kt_roi", kb)})'
                       f'+{col}{R["kt_moi"]}*{g("kt_bat_dau", kb)}+{prv}{R["kt"]}*(1-{g("kt_roi", kb)})*{g("kt_them", kb)})')
        S('tt_moi', f'={g("tt_moi", kb)}*(1+{g("tt_tang", kb)})^({t}-1)')
        S('ho_tt', f'={col}{R["tt_moi"]}' if dau else f'={prv}{R["ho_tt"]}*(1-{g("tt_roi", kb)})+{col}{R["tt_moi"]}')
        S('ho', f'={col}{R["ho_kt"]}+{col}{R["ho_tt"]}')
        S('thi_phan', f'=IF({g("som", kb)}>0,{col}{R["ho"]}/{g("som", kb)},0)')
        S('dt_kt', f'={col}{R["ho_kt"]}*{g("gia_kt", kb)}')
        S('dt_tt', f'={col}{R["ho_tt"]}*({g("gia_starter", kb)}*(1-{g("ty_le_growth", kb)})+{g("gia_growth", kb)}*{g("ty_le_growth", kb)})')
        S('dt', f'={col}{R["dt_kt"]}+{col}{R["dt_tt"]}')
        S('cp_ai', f'={col}{R["ho"]}*{g("xu_thang", kb)}*{g("usd_xu", kb)}*{g("ty_gia", kb)}*{g("dung_xu", kb)}')
        S('cp_ht', f'={g("ha_tang_co_dinh", kb)}+{col}{R["ho"]}*{g("ha_tang_moi_kh", kb)}')
        S('cp_bien', f'={col}{R["dt"]}*{g("phi_bien", kb)}')
        S('cp_ns', f'=IF({t}<=6,{g("nguoi_1", kb)},IF({t}<=18,{g("nguoi_2", kb)},{g("nguoi_3", kb)}))*{g("luong", kb)}')
        S('cp_mk', f'={col}{R["tt_moi"]}*{g("cac_tt", kb)}+{col}{R["kt_moi"]}*{g("cac_kt", kb)}')
        S('cp_ql', f'={g("quan_ly", kb)}')
        S('cp_kt', f'=IF({t}={g("kiem_toan_thang", kb)},{g("kiem_toan", kb)},0)')
        S('cp', f'=SUM({col}{R["cp_ai"]}:{col}{R["cp_kt"]})')
        S('ebitda', f'={col}{R["dt"]}-{col}{R["cp"]}')
        S('bien_gop', f'=IF({col}{R["dt"]}>0,({col}{R["dt"]}-{col}{R["cp_ai"]}-{col}{R["cp_ht"]}-{col}{R["cp_bien"]})/{col}{R["dt"]},0)')
        S('hoa_von', f'=IF({col}{R["ebitda"]}>=0,1,0)')
        S('von', f'=IF({t}={g("goi_von_thang", kb)},{g("goi_von", kb)},0)')
        S('tien', f'={g("tien_dau", kb)}+{col}{R["von"]}+{col}{R["ebitda"]}' if dau else f'={prv}{R["tien"]}+{col}{R["von"]}+{col}{R["ebitda"]}')
        S('tien_khong_von', f'={g("tien_dau", kb)}+{col}{R["ebitda"]}' if dau else f'={prv}{R["tien_khong_von"]}+{col}{R["ebitda"]}')
        S('tien_giai', f'={col}{R["tien_khong_von"]}+IF({t}>={g("giai_thang", kb)},{g("giai_usd", kb)}*{g("ty_gia", kb)},0)')
        S('het_giai', f'=IF({col}{R["tien_giai"]}<0,1,0)')
        ws.column_dimensions[col].width = 14
    ws.column_dimensions['A'].width = 46
    ws.freeze_panes = 'B4'
    return R


RS = {kb: dung_kb(kb) for kb in KB}

# Tổng hợp
th = wb.create_sheet('Tong hop', 0)
th['A1'] = 'MIMI — Tổng hợp 3 kịch bản tài chính, 36 tháng (11/2026 – 10/2029)'; th['A1'].font = TIEU
th['A2'] = ('Mọi số dưới đây tính từ sheet "Gia dinh". Giá gói lấy từ mã đang chạy; các giả định khác là ĐỀ XUẤT '
            '(nền vàng) — chưa có khách trả tiền nào tới 28/10/2026, nên đây là mô hình, không phải dự báo.')
th['A2'].font = Font(name=F, italic=True)
for j, h in enumerate(['Chỉ số', 'Thận trọng', 'Cơ sở', 'Lạc quan'], 1):
    c = th.cell(row=4, column=j, value=h); c.font = DAM; c.fill = XAM
last = L(1 + N)


def q(kb, k, col):
    return f"'{kb}'!{col}{RS[kb][k]}"


CHI = [
    ('Hộ trả tiền — tháng 12 (10/2027)', lambda kb: f'={q(kb, "ho", L(13))}', '#,##0'),
    ('Hộ trả tiền — tháng 24 (10/2028)', lambda kb: f'={q(kb, "ho", L(25))}', '#,##0'),
    ('Hộ trả tiền — tháng 36 (10/2029)', lambda kb: f'={q(kb, "ho", last)}', '#,##0'),
    ('  trong đó qua văn phòng kế toán (tháng 36)', lambda kb: f'={q(kb, "ho_kt", last)}', '#,##0'),
    ('Phần SOM đã chiếm (tháng 36)', lambda kb: f'={q(kb, "thi_phan", last)}', '0.00%'),
    ('MRR tháng 12 (đ)', lambda kb: f'={q(kb, "dt", L(13))}', VND),
    ('MRR tháng 24 (đ)', lambda kb: f'={q(kb, "dt", L(25))}', VND),
    ('MRR tháng 36 (đ)', lambda kb: f'={q(kb, "dt", last)}', VND),
    ('ARR cuối kỳ = MRR tháng 36 × 12 (đ)', lambda kb: f'={q(kb, "dt", last)}*12', VND),
    ('Doanh thu năm 1: 11/2026–10/2027 (đ)', lambda kb: f"=SUM('{kb}'!B{RS[kb]['dt']}:M{RS[kb]['dt']})", VND),
    ('Doanh thu năm 2: 11/2027–10/2028 (đ)', lambda kb: f"=SUM('{kb}'!N{RS[kb]['dt']}:Y{RS[kb]['dt']})", VND),
    ('Doanh thu năm 3: 11/2028–10/2029 (đ)', lambda kb: f"=SUM('{kb}'!Z{RS[kb]['dt']}:AK{RS[kb]['dt']})", VND),
    ('Lãi/lỗ 36 tháng cộng dồn (đ)', lambda kb: f"=SUM('{kb}'!B{RS[kb]['ebitda']}:{last}{RS[kb]['ebitda']})", VND),
    ('Biên gộp tháng 36', lambda kb: f'={q(kb, "bien_gop", last)}', PCT),
    ('Tháng đầu tiên hoà vốn (tháng thứ)', lambda kb: f"=IFERROR(MATCH(1,'{kb}'!B{RS[kb]['hoa_von']}:{last}{RS[kb]['hoa_von']},0),\"Chưa trong 36 tháng\")", '#,##0'),
    ('VỐN CẦN = đáy tiền mặt nếu không gọi vốn (đ)', lambda kb: f"=MAX(0,-MIN('{kb}'!B{RS[kb]['tien_khong_von']}:{last}{RS[kb]['tien_khong_von']}))", VND),
    ('Nếu thắng 20k USD: tháng hết tiền (tháng thứ)', lambda kb: f"=IFERROR(MATCH(1,'{kb}'!B{RS[kb]['het_giai']}:{last}{RS[kb]['het_giai']},0),\"Đủ 36 tháng\")", '#,##0'),
    ('Nếu thắng 20k USD: còn cần gọi thêm (đ)', lambda kb: f"=MAX(0,-MIN('{kb}'!B{RS[kb]['tien_giai']}:{last}{RS[kb]['tien_giai']}))", VND),
    ('Tiền mặt cuối kỳ, có vốn đã điền (đ)', lambda kb: f'={q(kb, "tien", last)}', VND),
]
for i, (nhan, f, fmt) in enumerate(CHI):
    rr = 5 + i
    th.cell(row=rr, column=1, value=nhan).font = DAM if nhan.startswith(('VỐN', 'MRR tháng 36', 'Tháng đầu')) else DEN
    for j, kb in enumerate(KB):
        c = th.cell(row=rr, column=2 + j, value=f(kb))
        c.font = Font(name=F, color='008000'); c.number_format = fmt
        c.alignment = Alignment(horizontal='right')
th.column_dimensions['A'].width = 52
for c in 'BCD':
    th.column_dimensions[c].width = 22

# Bảng MRR theo tháng cho biểu đồ
r0 = 5 + len(CHI) + 3
th.cell(row=r0 - 1, column=1, value='MRR theo tháng (đ) — dữ liệu biểu đồ').font = DAM
th.cell(row=r0, column=1, value='Tháng').font = DAM
for j, kb in enumerate(KB):
    th.cell(row=r0, column=2 + j, value=['Thận trọng', 'Cơ sở', 'Lạc quan'][j]).font = DAM
for i in range(N):
    th.cell(row=r0 + 1 + i, column=1, value=THANG[i]).font = DEN
    for j, kb in enumerate(KB):
        c = th.cell(row=r0 + 1 + i, column=2 + j, value=f'={q(kb, "dt", L(2 + i))}')
        c.font = Font(name=F, color='008000'); c.number_format = VND
ch = LineChart()
ch.title = 'MRR theo tháng, 3 kịch bản (đồng)'
ch.y_axis.title = 'đồng / tháng'
ch.height = 9; ch.width = 22
ch.add_data(Reference(th, min_col=2, max_col=4, min_row=r0, max_row=r0 + N), titles_from_data=True)
ch.set_categories(Reference(th, min_col=1, min_row=r0 + 1, max_row=r0 + N))
th.add_chart(ch, 'F4')

gz = wb.create_sheet('Giai 20k', 1)
gz['A1'] = 'Nếu thắng 20.000 USD — dùng vào đâu, được gì'; gz['A1'].font = TIEU
gz['A2'] = 'Tỷ lệ phân bổ là ĐỀ XUẤT (nền vàng) — sửa tỷ lệ, số tiền tự tính. Mốc "được gì" lấy từ kịch bản cơ sở.'
gz['A2'].font = Font(name=F, italic=True)
gz['A4'] = 'Tổng tiền giải (đ)'; gz['A4'].font = DAM
gz['B4'] = f"={g('giai_usd','Co so')}*{g('ty_gia','Co so')}"; gz['B4'].number_format = VND; gz['B4'].font = Font(name=F, color='008000')
for j, h in enumerate(['Hạng mục', 'Tỷ lệ', 'Số tiền (đ)', 'Để làm gì'], 1):
    c = gz.cell(row=6, column=j, value=h); c.font = DAM; c.fill = XAM
PB = [
    ('Chạy thử có trả phí với văn phòng kế toán', 0.30, 'Đi gặp, cài đặt, hỗ trợ 3–5 văn phòng × 5 hộ; đo giờ tiết kiệm và trễ hạn'),
    ('Kiểm thử bảo mật độc lập (gói nhỏ)', 0.25, 'Phạm vi trong docs/an-ninh/PHAM_VI_KIEM_THU_DOC_LAP.md — điều kiện để văn phòng kế toán và ngân hàng tin'),
    ('Token AI + hạ tầng 12 tháng', 0.15, 'Đủ cho giai đoạn chạy thử và kiểm trên sao kê thật đã ẩn danh'),
    ('Pháp lý: bảo vệ dữ liệu cá nhân (NĐ 13/2023), hợp đồng, TVAN', 0.10, 'Hồ sơ đánh giá tác động xử lý dữ liệu, mẫu hợp đồng với văn phòng kế toán'),
    ('Một kỹ sư bán thời gian 6 tháng', 0.20, 'Module Hàn Quốc tại Việt Nam, sửa lỗi câu hỏi tiếng Anh ở chế độ mẫu'),
]
for i, (ten, pt, lam) in enumerate(PB):
    rr = 7 + i
    gz.cell(row=rr, column=1, value=ten).font = DEN
    c = gz.cell(row=rr, column=2, value=pt); c.font = XANH; c.fill = VANG; c.number_format = PCT
    c = gz.cell(row=rr, column=3, value=f'=B{rr}*$B$4'); c.number_format = VND; c.font = DEN
    gz.cell(row=rr, column=4, value=lam).font = DEN
rt = 7 + len(PB)
gz.cell(row=rt, column=1, value='Tổng').font = DAM
c = gz.cell(row=rt, column=2, value=f'=SUM(B7:B{rt-1})'); c.number_format = PCT; c.font = DAM
c = gz.cell(row=rt, column=3, value=f'=SUM(C7:C{rt-1})'); c.number_format = VND; c.font = DAM
gz.cell(row=rt + 2, column=1, value='ĐƯỢC GÌ (kịch bản cơ sở)').font = DAM
DUOC = [
    ('Hộ trả tiền sau 12 tháng', f"='Co so'!M{RS['Co so']['ho']}", '#,##0'),
    ('  trong đó qua văn phòng kế toán', f"='Co so'!M{RS['Co so']['ho_kt']}", '#,##0'),
    ('MRR tháng 12 (đ)', f"='Co so'!M{RS['Co so']['dt']}", VND),
    ('Doanh thu 12 tháng đầu (đ)', f"=SUM('Co so'!B{RS['Co so']['dt']}:M{RS['Co so']['dt']})", VND),
    ('Tiền giải đủ chi tới tháng thứ (cơ sở)', f"=IFERROR(MATCH(1,'Co so'!B{RS['Co so']['het_giai']}:{last}{RS['Co so']['het_giai']},0)-1,36)", '#,##0'),
    ('Còn cần gọi thêm để tới hoà vốn hoặc 36 tháng (đ)', f"=MAX(0,-MIN('Co so'!B{RS['Co so']['tien_giai']}:{last}{RS['Co so']['tien_giai']}))", VND),
]
for i, (ten, ct, fmt) in enumerate(DUOC):
    rr = rt + 3 + i
    gz.cell(row=rr, column=1, value=ten).font = DEN
    c = gz.cell(row=rr, column=2, value=ct); c.number_format = fmt; c.font = Font(name=F, color='008000')
gz.column_dimensions['A'].width = 58; gz.column_dimensions['B'].width = 20; gz.column_dimensions['C'].width = 20; gz.column_dimensions['D'].width = 95
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print('ok', OUT)
