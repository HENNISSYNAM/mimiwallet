/** Tax reminder strings — English. Same keys as `tb.vi.ts`. Names of legal documents stay in Vietnamese. */
const m = {
  tb: {
    trang: {
      tieuDe: 'Tax reminders',
      moTa: 'Upcoming tax deadlines, worked out from the filing calendar and your company’s real revenue.',
    },
    hoSo: {
      tieuDe: 'Obligations profile of {{ten}}',
      tieuDeChung: 'Your tax obligations profile',
      nhoMst: 'MIMI knows this from your tax code',
      nguonHinh: 'inferred from the shape of the code',
      nguonTct: 'per the General Department of Taxation record',
      chuaTra: 'MIMI hasn’t found the tax authority’s record for this code yet — status and managing tax office will appear once it does.',
      chuaCoMst: 'No tax code yet, so MIMI doesn’t know whether you are a household business or a company, whether you are active, or which tax office manages you.',
      moCaiDat: 'Add tax code',
      nhom: { phai_lam: 'Applies to you', can_xac_minh: 'Needs checking', khong_ap_dung: 'Does not apply' },
      soKy: '({{n}} periods)',
      viSao: 'Why:',
      canCu: 'Legal basis:',
    },
    lich: {
      dangTinh: 'Working out your tax calendar…',
      loi: 'Couldn’t read your tax calendar. Try again in a few minutes.',
      khongCoHan: 'No tax task has a deadline MIMI is sure of yet. See the items to verify below.',
      han: 'Due {{ngay}}',
      tieuDe: 'Filing calendar',
      chuaXacDinhHan: 'Deadline not set yet',
      moToKhai: 'Open tax returns',
      nopCong: 'File on the Public Service Portal',
      kiemChungTu: 'Check documents',
      ghiChu: 'If a deadline falls on a day off, the law moves it later — the date above is the earliest. MIMI drafts; you confirm before filing.',
    },
    canXem: {
      tieuDe: 'MIMI needs you to check one item before talking about tax obligations',
      moTa: 'This unclear item could change what you must file and from when, so MIMI hasn’t concluded yet. Please answer one question:',
      conLai: 'After this, {{n}} more things are unclear — MIMI asks one at a time.',
      traLoi: 'Answer now',
      hanPhuThuoc: 'Deadlines below don’t yet include anything that depends on this answer.',
    },
    nguong: {
      tieuDe: 'Revenue thresholds {{nam}}',
      tieuDeChung: 'Revenue thresholds',
      dangDoc: 'Reading revenue…',
      loi: 'Couldn’t read this year’s revenue. Try again in a few minutes.',
      doanhThu: 'Revenue to date:',
      uocTinh: '(estimated from money received in the bank)',
      chuaLienKet: 'No bank linked yet — this figure isn’t reliable enough.',
      daVuot: 'Over by {{tien}}',
      con: '{{tien}} to go',
      chuaChac: 'Not sure yet — please check one item',
      nguon: 'Source: {{nguon}}.',
      moc1: {
        ten: 'VND 1 billion/year threshold',
        y: 'Revenue up to VND 1 billion pays no VAT or personal income tax. Above it you pay both, and use e-invoices coded by the tax authority.',
        nguon: 'Nghị định 68/2026/NĐ-CP, sửa đổi bởi Nghị định 141/2026/NĐ-CP',
      },
      moc3: {
        ten: 'VND 3 billion/year threshold',
        y: 'Above it, tax can only be calculated on income (revenue minus costs) at 17% — spending without documents starts to cost money.',
        nguon: 'Luật Thuế thu nhập cá nhân số 109/2025/QH15',
      },
    },
    giayTo: { tieuDe: 'Documents you may need' },
    cuoi: 'MIMI reminds you in the app and pushes notifications to your device when you turn them on. No email or Zalo reminders yet.',
  },
};

export default m;
