import { createI18n } from 'vue-i18n';
import vi from '@/locales/vi';
import en from '@/locales/en';

export const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('lang') || 'vi',
  fallbackLocale: 'en',
  messages: { vi, en },
});

export function setLocale(locale: 'vi' | 'en') {
  i18n.global.locale.value = locale;
  localStorage.setItem('lang', locale);
}