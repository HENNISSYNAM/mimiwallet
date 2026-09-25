"""Cào danh mục tờ khai + thủ tục hành chính thuế, trang công khai dichvucong.gdt.gov.vn/tthc.

Chỉ trang công khai (không đăng nhập). Cách 1 giây giữa hai lần gọi. Kết quả: tthc.json.
"""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import http.cookiejar

D = os.path.dirname(os.path.abspath(__file__))
GOC = 'https://dichvucong.gdt.gov.vn'
UA = 'Mozilla/5.0 (MIMI Wallet - thu thap danh muc thu tuc cong khai)'

cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))


def lay(url, data=None, headers=None):
    h = {'User-Agent': UA, **(headers or {})}
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    r = op.open(urllib.request.Request(url, data=body, headers=h), timeout=60)
    return r.read().decode('utf-8', 'replace')


def chu(s):
    s = re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>', '', s)
    s = re.sub(r'<br\s*/?>|</p>|</div>|</li>|</tr>|</h\d>', '\n', s, flags=re.I)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    s = re.sub(r'[ \t ]+', ' ', s)
    return re.sub(r'\n\s*\n+', '\n', s).strip()


# 1. Trang chủ: danh mục tờ khai, loại thủ tục, mã CSRF
trang = lay(f'{GOC}/tthc/homelogin/tthc')
csrf = re.search(r'name="_csrf"\s+value="([^"]+)"', trang).group(1)


def tuy_chon(ten):
    m = re.search(rf'<select[^>]*name="{ten}"[\s\S]*?</select>', trang)
    ra = []
    for v, t in re.findall(r'<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)</option>', m.group(0)):
        t = html.unescape(re.sub(r'\s+', ' ', t)).strip()
        if v and not t.startswith('---'):
            ra.append({'gia_tri': v, 'nhan': t})
    return ra


to_khai = tuy_chon('maToKhai')
loai_tthc = tuy_chon('maNghiepVu')
print('to khai:', len(to_khai), '| loai thu tuc:', len(loai_tthc), flush=True)

# 2. Danh sách thủ tục, phân trang
ds = {}
page = 1
while True:
    time.sleep(1)
    kq = lay(f'{GOC}/tthc/homelogin/tthc', {'_csrf': csrf, 'page': page, 'size': 50, 'tenMaTTHC': '', 'maNghiepVu': '', 'maToKhai': '', 'mucDo': ''},
             {'HX-Request': 'true', 'X-CSRF-TOKEN': csrf, 'Referer': f'{GOC}/tthc/homelogin/tthc'})
    them = 0
    for tr in re.findall(r'<tr[\s\S]*?</tr>', kq):
        m = re.search(r'chi-tiet-tthc\?maTTHC=([0-9.]+)', tr)
        if not m or m.group(1) in ds:
            continue
        o = [chu(x) for x in re.findall(r'<td[\s\S]*?</td>', tr)]
        ds[m.group(1)] = {'ma': m.group(1), 'o': o}
        them += 1
    print('trang', page, '+', them, 'tong', len(ds), flush=True)
    if not them or page > 20:
        break
    page += 1

# 3. Chi tiết từng thủ tục
NHAN = ['Mã thủ tục', 'Cấp thực hiện', 'Loại thủ tục', 'Lĩnh vực', 'Trình tự thực hiện', 'Cách thức thực hiện',
        'Thành phần hồ sơ', 'Số lượng hồ sơ', 'Thời hạn giải quyết', 'Đối tượng thực hiện', 'Cơ quan thực hiện',
        'Cơ quan có thẩm quyền', 'Địa chỉ tiếp nhận hồ sơ', 'Cơ quan được ủy quyền', 'Cơ quan phối hợp',
        'Kết quả thực hiện', 'Căn cứ pháp lý', 'Yêu cầu, điều kiện thực hiện', 'Yêu cầu, điều kiện',
        'Lệ phí', 'Phí', 'Mẫu đơn, mẫu tờ khai', 'Tên mẫu đơn, mẫu tờ khai', 'Mô tả', 'Điều kiện thực hiện']
re_nhan = re.compile(r'^\s*(' + '|'.join(re.escape(n) for n in sorted(NHAN, key=len, reverse=True)) + r')\s*:\s*$', re.M)

chi_tiet = []
for i, ma in enumerate(ds):
    time.sleep(1)
    try:
        tho_p = os.path.join(D, 'tho', f'{ma}.html')
        if os.path.exists(tho_p):
            tho = open(tho_p, encoding='utf-8').read()
        else:
            tho = lay(f'{GOC}/tthc/homelogin/chi-tiet-tthc?maTTHC={ma}')
            os.makedirs(os.path.join(D, 'tho'), exist_ok=True)
            open(tho_p, 'w', encoding='utf-8').write(tho)
        t = chu(tho)
    except Exception as e:  # noqa: BLE001
        print('loi', ma, e, flush=True)
        continue
    a = t.find('Mã thủ tục')
    ten = t[:a].strip().split('\n')[-1].strip() if a > 0 else ''
    phan = {}
    moc = [(m.start(), m.end(), m.group(1)) for m in re_nhan.finditer(t)]
    for j, (s, e, n) in enumerate(moc):
        ket = moc[j + 1][0] if j + 1 < len(moc) else len(t)
        phan[n] = t[e:ket].strip()[:20000]
    # Mã tờ khai nhắc trong thành phần hồ sơ / mẫu đơn
    nguon_mau = ' '.join(phan.get(k, '') for k in ('Thành phần hồ sơ', 'Mẫu đơn, mẫu tờ khai', 'Tên mẫu đơn, mẫu tờ khai'))
    mau = sorted(set(m.rstrip('.,;') for m in re.findall(r'mẫu (?:số\s+)?([0-9]{1,2}[A-Za-zĐđÐ]*[\-/][0-9A-Za-zĐđÐ\-/.]+)', nguon_mau)))
    chi_tiet.append({'ma': ma, 'ten': ten, 'o_danh_sach': ds[ma]['o'], 'phan': phan, 'mau_nhac_toi': mau,
                     'nguon': f'{GOC}/tthc/homelogin/chi-tiet-tthc?maTTHC={ma}'})
    if i % 10 == 0:
        print('chi tiet', i + 1, '/', len(ds), ma, flush=True)

json.dump({'lay_luc': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'nguon': f'{GOC}/tthc/homelogin/tthc',
           'to_khai': to_khai, 'loai_thu_tuc': loai_tthc, 'thu_tuc': chi_tiet},
          open(os.path.join(D, 'tthc.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('xong', len(to_khai), 'to khai,', len(chi_tiet), 'thu tuc', flush=True)
