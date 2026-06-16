import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from './locales/ko.json';
import en from './locales/en.json';

// 언어 설정은 AIPub(aipub-web)과 공유한다.
// imagekit-web 은 AIPub Ingress 의 /imagekit 서브패스로 서빙되어 aipub-web 과 동일 origin 이므로
// aipub-web 이 저장하는 localStorage['i18nextLng'] 를 그대로 읽어 같은 언어로 동기화된다.
// (aipub-web: detection order ['localStorage','navigator'], lookupLocalStorage 'i18nextLng', default 'en')
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
    },
    supportedLngs: ['en', 'ko'],
    fallbackLng: 'en',
    load: 'languageOnly', // ko-KR -> ko
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
