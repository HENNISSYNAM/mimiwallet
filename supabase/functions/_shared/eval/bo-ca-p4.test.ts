import { describe, expect, it } from 'vitest';
import { chayBo, LINH_VUC_EVAL } from './harness';
import { BO_CA_P4 } from './bo-ca-p4';

/** Prompt 4 mục 33 — cổng chặn hồi quy theo lĩnh vực. Hỏng một ca là đỏ. */
const bc = chayBo(BO_CA_P4);

describe('eval Prompt 4 theo lĩnh vực', () => {
  it('in báo cáo', () => {
    console.table(bc.theo_linh_vuc);
    if (bc.ca_hong.length) console.log(bc.ca_hong.join('\n'));
  });

  it('phủ đủ 12 lĩnh vực của đặc tả', () => {
    for (const lv of LINH_VUC_EVAL) expect(bc.theo_linh_vuc[lv]?.so_ca ?? 0, lv).toBeGreaterThan(0);
  });

  it('không ca nào hỏng: ý định, kết luận mong đợi, bằng chứng, kết luận cấm, hành động', () => {
    expect(bc.ca_hong).toEqual([]);
    expect(bc.intent_accuracy.ty_le).toBe(1);
    expect(bc.expected_conclusion.ty_le).toBe(1);
    expect(bc.evidence_presence.ty_le).toBe(1);
    expect(bc.unsafe_action_rate.ty_le).toBe(0);
    expect(bc.false_legal_certainty.ty_le).toBe(0);
  });
});
