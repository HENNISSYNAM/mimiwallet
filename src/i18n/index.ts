import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import vi from './vi';
import en from './en';
import landingVi from './modules/landing.vi';
import landingEn from './modules/landing.en';
import onboardingVi from './modules/onboarding.vi';
import onboardingEn from './modules/onboarding.en';
import financeVi from './modules/finance.vi';
import financeEn from './modules/finance.en';
import miscVi from './modules/misc.vi';
import miscEn from './modules/misc.en';
import ko from './ko';
import zh from './zh';
import manVi from './modules/man.vi';
import manEn from './modules/man.en';
import manKo from './modules/man.ko';
import manZh from './modules/man.zh';
import kgVi from './modules/kg.vi';
import kgEn from './modules/kg.en';
import kgKo from './modules/kg.ko';
import kgZh from './modules/kg.zh';
import appVi from './modules/app.vi';
import appEn from './modules/app.en';
import appKo from './modules/app.ko';
import appZh from './modules/app.zh';

const viAll = { ...vi, ...landingVi, ...onboardingVi, ...financeVi, ...miscVi, ...manVi, ...kgVi, ...appVi };
const enAll = { ...en, ...landingEn, ...onboardingEn, ...financeEn, ...miscEn, ...manEn, ...kgEn, ...appEn };

/**
 * Bốn ngôn ngữ, cùng một bộ khoá. `NGON_NGU` là nguồn duy nhất cho menu chọn ngôn ngữ và cho
 * test `dongBoNgonNgu.test.ts` — thêm ngôn ngữ ở đây là chỗ duy nhất phải sửa.
 *
 * Chữ tiếng Việt trong văn bản pháp luật (câu trích Nghị định, Thông tư ở trang Tờ khai thuế)
 * KHÔNG dịch: đó là nguyên văn để đối chiếu, dịch ra là mất giá trị pháp lý.
 */
export const NGON_NGU = [
  { ma: 'vi', ten: 'Tiếng Việt', ma_ngan: 'VI' },
  { ma: 'en', ten: 'English', ma_ngan: 'EN' },
  { ma: 'ko', ten: '한국어', ma_ngan: 'KO' },
  { ma: 'zh', ten: '中文', ma_ngan: 'ZH' },
] as const;

export type MaNgonNgu = (typeof NGON_NGU)[number]['ma'];

const koAll = { ...ko, ...manKo, ...kgKo, ...appKo };
const zhAll = { ...zh, ...manZh, ...kgZh, ...appZh };

export const BO_DICH: Record<MaNgonNgu, Record<string, unknown>> = {
  vi: viAll, en: enAll, ko: koAll, zh: zhAll,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: NGON_NGU.map((n) => n.ma),
    resources: {
      vi: { translation: viAll },
      en: { translation: enAll },
      ko: { translation: koAll },
      zh: { translation: zhAll },
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
