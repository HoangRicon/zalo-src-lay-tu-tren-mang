<template>
  <v-app :class="{ 'liquid-bg': isDark }">
    <!-- Skip-link for keyboard users -->
    <a href="#main-content" class="skip-link">{{ t('common.skip_to_content') }}</a>

    <!-- Top app bar -->
    <v-app-bar density="comfortable" flat class="safe-area-top">
      <v-app-bar-nav-icon
        v-if="!isPhone"
        :aria-label="t('a11y.open_menu')"
        class="touch-target"
        @click="drawer = !drawer"
      />

      <!-- AI Core Orb + Title -->
      <div class="d-flex align-center" style="gap: 12px;">
        <div
          class="ai-core-orb d-flex align-center justify-center"
          style="width: 32px; height: 32px; background: linear-gradient(135deg, #00F2FF, #0077B6);"
        >
          <v-icon size="18" color="white">mdi-robot</v-icon>
        </div>
        <v-app-bar-title>
          <span class="font-weight-bold">Zalo</span><span style="color: #00F2FF;">CRM</span>
        </v-app-bar-title>
      </div>

      <!-- Global search — desktop only -->
      <GlobalSearch v-if="!isPhone" class="mx-2" />

      <v-spacer />

      <!-- Status indicator — desktop only -->
      <div
        v-if="!isPhone"
        class="d-flex align-center mr-4 px-3 py-1 rounded-pill desktop-only"
        style="background: rgba(76,175,80,0.1); border: 1px solid rgba(76,175,80,0.2);"
      >
        <span
          class="status-dot"
          style="width: 8px; height: 8px; border-radius: 50%; background: #4CAF50; display: inline-block; margin-right: 8px;"
        ></span>
        <span class="text-caption font-weight-bold" style="color: #4CAF50; letter-spacing: 1px;">ONLINE</span>
      </div>

      <!-- Search icon (phone only) -->
      <v-btn
        v-if="isPhone"
        icon
        variant="text"
        class="touch-target"
        :aria-label="t('common.search')"
        @click="searchOpen = true"
      >
        <v-icon>mdi-magnify</v-icon>
      </v-btn>

      <!-- User name — desktop only -->
      <span v-if="!isPhone && authStore.user" class="text-body-2 mr-3 desktop-only">
        {{ authStore.user.fullName }}
      </span>

      <NotificationBell />

      <v-btn
        icon
        variant="text"
        class="touch-target"
        :aria-label="t('a11y.toggle_theme')"
        @click="toggleTheme"
      >
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>

      <v-btn
        icon
        variant="text"
        class="touch-target"
        :aria-label="t('a11y.logout')"
        @click="logout"
      >
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Sidebar navigation — tablet+ only. On phone, BottomNav replaces this. -->
    <v-navigation-drawer
      v-if="!isPhone"
      v-model="drawer"
      :rail="rail"
      permanent
      class="desktop-only"
      @click="rail = false"
    >
      <v-list density="compact" nav class="mt-2">
        <v-list-item
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          :prepend-icon="item.icon"
          :title="t(item.titleKey)"
          :value="item.path"
          rounded="xl"
          class="mb-1 mx-2"
        />
      </v-list>

      <template #append>
        <v-list density="compact" nav>
          <v-list-item
            prepend-icon="mdi-chevron-left"
            :title="t('common.back')"
            @click.stop="rail = !rail"
            rounded="xl"
            class="mx-2"
          />
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- Main content -->
    <v-main>
      <v-container id="main-content" fluid tabindex="-1">
        <slot />
      </v-container>
    </v-main>

    <!-- Bottom navigation — phone only -->
    <BottomNav v-if="isPhone" class="mobile-only" />

    <!-- Phone-only search dialog -->
    <MobileSearchDialog v-if="isPhone" v-model="searchOpen" />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTheme } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import NotificationBell from '@/components/NotificationBell.vue';
import GlobalSearch from '@/components/GlobalSearch.vue';
import BottomNav from '@/components/layout/BottomNav.vue';
import MobileSearchDialog from '@/components/layout/MobileSearchDialog.vue';
import { useResponsive } from '@/composables/use-responsive';

const theme = useTheme();
const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const { isPhone } = useResponsive();

const drawer = ref(true);
const rail = ref(false);
const isDark = ref(localStorage.getItem('theme') !== 'light');
const searchOpen = ref(false);

onMounted(() => {
  theme.global.name.value = isDark.value ? 'dark' : 'light';
});

interface MenuItem {
  titleKey: string;
  icon: string;
  path: string;
}

const menuItems: MenuItem[] = [
  { titleKey: 'nav.dashboard', icon: 'mdi-view-dashboard-outline', path: '/' },
  { titleKey: 'nav.messages', icon: 'mdi-message-text-outline', path: '/chat' },
  { titleKey: 'nav.contacts', icon: 'mdi-account-group-outline', path: '/contacts' },
  { titleKey: 'nav.zaloAccounts', icon: 'mdi-cellphone-link', path: '/zalo-accounts' },
  { titleKey: 'nav.appointments', icon: 'mdi-calendar-clock-outline', path: '/appointments' },
  { titleKey: 'nav.orders', icon: 'mdi-cart-outline', path: '/orders' },
  { titleKey: 'nav.reports', icon: 'mdi-chart-arc', path: '/reports' },
  { titleKey: 'nav.staff', icon: 'mdi-account-cog-outline', path: '/settings' },
  { titleKey: 'nav.apiWebhook', icon: 'mdi-api', path: '/api-settings' },
];

function toggleTheme() {
  isDark.value = !isDark.value;
  theme.global.name.value = isDark.value ? 'dark' : 'light';
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
}

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.skip-link {
  position: absolute;
  top: -100px;
  left: 8px;
  background: rgb(var(--v-theme-primary));
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  z-index: 9999;
  text-decoration: none;
  font-weight: 600;
  transition: top 150ms ease;
}
.skip-link:focus {
  top: 8px;
}
</style>