<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

interface NavItem {
  to: string;
  icon: string;
  labelKey: string;
}

const items: NavItem[] = [
  { to: '/', icon: 'mdi-view-dashboard-outline', labelKey: 'nav.dashboard' },
  { to: '/chat', icon: 'mdi-message-text-outline', labelKey: 'nav.messages' },
  { to: '/contacts', icon: 'mdi-account-group-outline', labelKey: 'nav.contacts' },
  { to: '/appointments', icon: 'mdi-calendar-clock-outline', labelKey: 'nav.appointments' },
  { to: '/orders', icon: 'mdi-cart-outline', labelKey: 'nav.orders' },
];

function isActive(to: string) {
  if (to === '/') return route.path === '/';
  return route.path === to || route.path.startsWith(to + '/');
}

function go(to: string) {
  if (route.path !== to) router.push(to);
}
</script>

<template>
  <v-bottom-navigation
    :model-value="items.findIndex((i) => isActive(i.to))"
    grow
    elevation="3"
    role="navigation"
    :aria-label="t('a11y.primary_nav')"
    class="bottom-nav safe-area-bottom"
  >
    <v-btn
      v-for="item in items"
      :key="item.to"
      :value="items.indexOf(item)"
      class="touch-target"
      :aria-label="t(item.labelKey)"
      @click="go(item.to)"
    >
      <v-icon>{{ item.icon }}</v-icon>
      <span class="text-caption">{{ t(item.labelKey) }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<style scoped>
.bottom-nav {
  /* Vuetify v-bottom-navigation renders fixed; keep just above content */
  z-index: 1000;
}
</style>