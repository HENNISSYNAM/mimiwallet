import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import vi from './vi';
import en from './en';
import landingVi from './modules/landing.vi';
import landingEn from './modules/landing.en';
import financeVi from './modules/finance.vi';
import financeEn from './modules/finance.en';
import miscVi from './modules/misc.vi';
import miscEn from './modules/misc.en';
import manVi from './modules/man.vi';
import manEn from './modules/man.en';
import kgVi from './modules/kg.vi';
import kgEn from './modules/kg.en';
import appVi from './modules/app.vi';
import appEn from './modules/app.en';
import tbVi from './modules/tb.vi';
import tbEn from './modules/tb.en';
import ui1Vi from './modules/ui1.vi';
import ui1En from './modules/ui1.en';
import ui2Vi from './modules/ui2.vi';
import ui2En from './modules/ui2.en';
import vayVi from './modules/vay.vi';
import vayEn from './modules/vay.en';
import coHoiVi from './modules/coHoi.vi';
import coHoiEn from './modules/coHoi.en';


const viAll = { ...vi, ...landingVi, ...financeVi, ...miscVi, ...manVi, ...kgVi, ...appVi, ...tbVi, ...ui1Vi, ...ui2Vi, ...vayVi, ...coHoiVi };
const enAll = { ...en, ...landingEn, ...financeEn, ...miscEn, ...manEn, ...kgEn, ...appEn, ...tbEn, ...ui1En, ...ui2En, ...vayEn, ...coHoiEn };

/**
 * Hai ngôn ngữ, cùng một bộ khoá (20/11/2026: bỏ tiếng Hàn và tiếng Trung — khách là hộ kinh doanh Việt Nam; tiếng
 * Anh giữ cho đối tác và hồ sơ quốc tế). `NGON_NGU` là nguồn duy nhất cho menu chọn ngôn ngữ và cho
 * test `dongBoNgonNgu.test.ts` — thêm ngôn ngữ ở đây là chỗ duy nhất phải sửa.
 *
 * Chữ tiếng Việt trong văn bản pháp luật (câu trích Nghị định, Thông tư ở trang Tờ khai thuế)
 * KHÔNG dịch: đó là nguyên văn để đối chiếu, dịch ra là mất giá trị pháp lý.
 */
export const NGON_NGU = [
  { ma: 'vi', ten: 'Tiếng Việt', ma_ngan: 'VI' },
  { ma: 'en', ten: 'English', ma_ngan: 'EN' },
] as const;

export type MaNgonNgu = (typeof NGON_NGU)[number]['ma'];

export const BO_DICH: Record<MaNgonNgu, Record<string, unknown>> = {
  vi: viAll, en: enAll,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: NGON_NGU.map((n) => n.ma),
    resources: {
      vi: { translation: viAll },
      en: { translation: enAll },
    },
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
    detection: {
      // localStorage only, on purpose. With 'navigator' in the chain any browser
      // reporting en-US rendered the dashboard in English inside otherwise
      // Vietnamese chrome — fallbackLng does not help there, because English is
      // a supported language rather than a missing one. Vietnamese SMEs are the
      // audience, so vi is the default until someone picks otherwise.
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  });

export default i18n;
