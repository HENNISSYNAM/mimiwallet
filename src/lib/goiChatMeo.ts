import { goi } from '@/lib/goiSpace';

export interface NangLuc { loai: 'du_lieu' | 'tu_van'; that: string; thieu: string | null; mau: string[] }
export interface LienHe { meo: string; ten: string; viec: string; nang_luc: NangLuc; tin_cuoi: { vai: string; noi_dung: string; luc: string } | null }
export interface TinMeo { id: number; vai: 'nguoi' | 'meo'; noi_dung: string; luc: string }

export const meoDs = async (company_id: string) => ((await goi('meo_ds', { company_id })).ds ?? []) as LienHe[];
export const meoTin = async (company_id: string, meo: string) => ((await goi('meo_tin', { company_id, meo })).tin ?? []) as TinMeo[];
export const meoGui = async (company_id: string, meo: string, noi_dung: string) =>
  (await goi('meo_gui', { company_id, meo, noi_dung })) as unknown as { nguoi: TinMeo; tra_loi: TinMeo };
