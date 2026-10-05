/** 税务提醒文案 — 中文。与 `tb.vi.ts` 键相同。法律文件名称保留越南语原文。 */
const m = {
  tb: {
    trang: {
      tieuDe: '税务提醒',
      moTa: '根据申报日历和公司真实收入计算的即将到来的税务期限。',
    },
    lich: {
      dangTinh: '正在计算你的税务日历…',
      loi: '暂时无法读取税务日历，请几分钟后再试。',
      khongCoHan: 'MIMI 还没有确定期限的税务事项。请查看下方需要核实的项目。',
      han: '期限 {{ngay}}',
      tieuDe: '申报日历',
      chuaXacDinhHan: '期限未定',
      moToKhai: '打开纳税申报表',
      nopCong: '在公共服务门户提交',
      kiemChungTu: '检查凭证',
      ghiChu: '如果期限遇到休息日，法律允许顺延 — 上面的日期是最早的期限。MIMI 起草，你在提交前确认。',
    },
    canXem: {
      tieuDe: '在谈纳税义务之前，MIMI 需要你确认一笔款项',
      moTa: '这笔不明款项可能改变你要申报的内容和开始时间，所以 MIMI 还没有下结论。请回答一个问题：',
      conLai: '这个问题之后还有 {{n}} 项不明 — MIMI 一次只问一个。',
      traLoi: '现在回答',
      hanPhuThuoc: '下方期限尚未包含取决于这个回答的部分。',
    },
    nguong: {
      tieuDe: '{{nam}} 年收入门槛',
      tieuDeChung: '年收入门槛',
      dangDoc: '正在读取收入…',
      loi: '暂时无法读取今年收入，请几分钟后再试。',
      doanhThu: '截至今天收入：',
      uocTinh: '（按银行到账估算）',
      chuaLienKet: '尚未关联银行 — 这个数字还不够可靠。',
      daVuot: '已超出 {{tien}}',
      con: '还差 {{tien}}',
      chuaChac: '尚不确定 — 请确认一笔款项',
      nguon: '来源：{{nguon}}。',
      moc1: {
        ten: '每年 10 亿越南盾门槛',
        y: '收入不超过 10 亿越南盾无需缴纳增值税和个人所得税。超过则需缴纳，并使用带税务机关代码的电子发票。',
        nguon: 'Nghị định 68/2026/NĐ-CP, sửa đổi bởi Nghị định 141/2026/NĐ-CP',
      },
      moc3: {
        ten: '每年 30 亿越南盾门槛',
        y: '超过后只能按所得（收入减成本）以 17% 计税 — 缺凭证的支出开始产生成本。',
        nguon: 'Luật Thuế thu nhập cá nhân số 109/2025/QH15',
      },
    },
    giayTo: { tieuDe: '可能需要的文件' },
    cuoi: 'MIMI 在应用内提醒，开启后也会推送到你的设备。暂不通过邮件或 Zalo 提醒。',
  },
};

export default m;
