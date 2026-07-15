<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useResponsive } from '@/composables/use-responsive';

interface Props {
  modelValue: boolean;
  title?: string;
  /** md+ width: sm | md | lg | xl */
  width?: 'sm' | 'md' | 'lg' | 'xl';
  scrollable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: 'md',
  scrollable: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const { isPhone } = useResponsive();

const internalOpen = ref(props.modelValue);
watch(
  () => props.modelValue,
  (v) => (internalOpen.value = v),
);
watch(internalOpen, (v) => emit('update:modelValue', v));

const fullscreen = computed(() => isPhone.value);
</script>

<template>
  <v-dialog
    v-model="internalOpen"
    :fullscreen="fullscreen"
    :max-width="fullscreen ? undefined : (width === 'sm' ? 400 : width === 'md' ? 600 : width === 'lg' ? 800 : 1100)"
    scrollable
    transition="dialog-bottom-transition"
    :aria-label="title || t('common.close')"
  >
    <v-card :rounded="fullscreen ? 0 : 'lg'">
      <v-toolbar v-if="fullscreen" density="compact" :title="title">
        <template #append>
          <v-btn
            icon="mdi-close"
            class="touch-target"
            :aria-label="t('common.close')"
            @click="internalOpen = false"
          />
        </template>
      </v-toolbar>

      <v-card-title v-else-if="title" class="text-h6">{{ title }}</v-card-title>

      <v-card-text :class="{ 'pa-0': fullscreen }">
        <slot />
      </v-card-text>

      <v-card-actions v-if="$slots.actions" class="safe-area-bottom">
        <slot name="actions" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>