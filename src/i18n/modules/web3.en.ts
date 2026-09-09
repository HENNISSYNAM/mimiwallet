/**
 * English strings for the digital-asset market context screen.
 *
 * Keys mirror `web3.vi.ts` exactly. Event codes come from
 * `_shared/web3/tin-hieu.ts`; this file only decides the wording.
 *
 * This is the file that makes the feature sellable outside Vietnam, so it is
 * not a translation afterthought — it carries the same weight as the Vietnamese
 * one. Where the two differ in tone, English is the plainer of the two on
 * purpose: readers here will span many jurisdictions and second languages.
 */
export default {
  dauTu: {
    tieuDe: 'Portfolio',
    phuDe: 'The digital assets you hold, and what is acting on them',
    tongGiaTri: 'Total value',
    chuaTinhDuocLaiLo: 'No profit or loss yet — needs both a market price and a cost basis.',
    thieuGia: '{{so}} holding(s) have no readable price and are not in the total.',
    thieuGiaVon: '{{so}} holding(s) have no cost basis and are excluded from profit and loss.',
    cacKhoan: 'Holdings',
    chuaCoKhoan: 'Nothing recorded yet. Add a holding below.',
    ma: 'Asset',
    soLuong: 'Quantity',
    gia: 'Price (USD)',
    giaTri: 'Value (USD)',
    laiLo: 'P/L (USD)',
    xoa: 'Remove this holding',
    them: 'Add',
    phMa: 'BTC',
    phSoLuong: 'Quantity',
    phGiaVon: 'Cost basis USD (optional)',
    ghiChuGiaVon: 'Cost basis is in USD because public exchange prices are quoted in USD. Leave it blank and the value still shows — only profit and loss is withheld.',
    loiMa: 'An asset code is 2–15 letters or digits, e.g. BTC.',
    loiSoLuong: 'Quantity must be a positive number.',
    loiGiaVon: 'Cost basis must be a positive number, or left blank.',
  },
  web3: {
    tieuDe: 'Digital asset market context',
    phuDe: 'Prices across exchanges, macro news, and the regulatory calendar',
    dangTai: 'Reading data…',
    lamMoi: 'Refresh',
    capNhatLuc: 'Read at {{gio}}',
    khongCoBangChung: 'No data yet to build a picture from.',

    mucChuY: {
      binh_thuong: 'Normal',
      dang_chu_y: 'Worth noting',
      can_doc_ky: 'Read closely',
    },

    nguon: {
      thi_truong: 'Market',
      vi_mo: 'Macro',
      phap_ly: 'Regulation',
    },

    moDau: {
      'tong.khong_co_gi': 'Nothing notable in this period.',
      'tong.co_vi_mo': '{{soTin}} macro stories worth noting in this period.',
      'tong.lech_gia': 'Exchanges disagree on the price of {{soMa}} asset(s).',
      'tong.co_phap_ly':
        '{{soVanBan}} regulation(s) take effect soon or have just taken effect ({{quocGia}}).',
    },

    suKien: {
      'gia.hien_tai': '{{ma}} at {{gia}} USD, across {{soSan}} exchange(s).',
      'gia.hien_tai_kem_doi': '{{ma}} at {{gia}} USD, {{huong}} {{doi24h}}% over 24h, across {{soSan}} exchange(s).',
      'gia.khong_doc_duoc': 'Could not read the price of {{ma}}.',
      'gia.lech_bat_thuong': 'Exchanges quote {{ma}} {{lech}}% apart.',
      'vi_mo.tin': '{{tieuDe}}',
      'phap_ly.sap_hieu_luc': '{{soHieu}} — {{ten}}. Takes effect in {{ngay}} days.',
      'phap_ly.hieu_luc_hom_nay': '{{soHieu}} — {{ten}}. Takes effect today.',
      'phap_ly.vua_hieu_luc': '{{soHieu}} — {{ten}}. In effect for {{ngay}} days.',
    },

    huong: { tang: 'up', giam: 'down' },
    apDungCho: 'Applies to {{doiTuong}}',

    suCo: {
      tieuDe: 'Missing sources',
      /*
       * Surfaced, never swallowed. One exchange failing still leaves a usable
       * answer, but "one exchange answered" must not look like "two exchanges
       * agreed" — otherwise the reader trusts a number nothing corroborates.
       */
      mo_ta: '{{nguon}}: {{loi}}',
    },

    /*
     * Required text, not politeness. Same discipline as the tax screens:
     * producing a number does not make that number a substitute for the person
     * who has to decide.
     */
    luuY:
      'This is market and regulatory context, not investment advice. ' +
      'Digital assets are volatile and can lose most of their value. ' +
      'MIMI does not custody assets, place orders, or manage money on your behalf.',
  },
};
