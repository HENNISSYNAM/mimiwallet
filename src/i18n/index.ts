import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import vi from './vi';
import en from './en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
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
