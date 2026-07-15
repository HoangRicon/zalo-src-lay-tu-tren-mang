import { computed, type ComputedRef } from 'vue';
import { useDisplay, type DisplayInstance } from 'vuetify';

/**
 * Project-specific responsive booleans.
 *
 * Built on top of Vuetify's useDisplay() so all breakpoints stay
 * consistent with the rest of the app.
 *
 * Breakpoints (Vuetify 4 defaults, locked for this project):
 *   xs  0–599    phones
 *   sm  600–959  large phones / small tablets
 *   md  960–1279 tablets
 *   lg  1280+    desktops
 */
export interface ResponsiveApi {
  isPhone: ComputedRef<boolean>;
  isTabletOrBelow: ComputedRef<boolean>;
  isTablet: ComputedRef<boolean>;
  isDesktop: ComputedRef<boolean>;
  display: DisplayInstance;
}

export function useResponsive(): ResponsiveApi {
  const display = useDisplay();

  const isPhone = computed(() => display.xs.value);
  const isTabletOrBelow = computed(() => display.smAndDown.value);
  const isTablet = computed(() => display.smAndDown.value && !display.xs.value);
  const isDesktop = computed(() => display.mdAndUp.value);

  return {
    isPhone,
    isTabletOrBelow,
    isTablet,
    isDesktop,
    display,
  };
}