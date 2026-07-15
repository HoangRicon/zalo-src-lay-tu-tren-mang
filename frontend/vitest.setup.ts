import { beforeEach } from 'vitest';

// jsdom does not implement matchMedia; Vuetify's useDisplay() and many
// responsive hooks call it. Provide a minimal stub that defaults to "no match"
// so tests can override per-case with `window.matchMedia = ...`.

beforeEach(() => {
  if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }

  if (typeof window !== 'undefined' && !window.IntersectionObserver) {
    // @ts-expect-error - minimal stub
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
  }
});