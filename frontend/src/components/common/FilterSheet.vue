<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ResponsiveDialog from './ResponsiveDialog.vue';

interface Props {
  modelValue: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), { title: '' });
const emit = defineEmits<{
  'update:modelValue': [v: boolean];
  apply: [];
  reset: [];
}>();

const { t } = useI18n();
const open = ref(props.modelValue);

watch(() => props.modelValue, (v) => (open.value = v));
watch(open, (v) => emit('update:modelValue', v));

function onApply() {
  emit('apply');
  open.value = false;
}
function onReset() {
  emit('reset');
}
</script>

<template>
  <ResponsiveDialog
    v-model="open"
    :title="title || t('filter.title')"
    width="md"
  >
    <slot />

    <template #actions>
      <v-btn variant="text" class="touch-target" @click="onReset">
        {{ t('common.reset') }}
      </v-btn>
      <v-spacer />
      <v-btn variant="text" class="touch-target" @click="open = false">
        {{ t('common.cancel') }}
      </v-btn>
      <v-btn color="primary" variant="flat" class="touch-target" @click="onApply">
        {{ t('common.apply') }}
      </v-btn>
    </template>
  </ResponsiveDialog>
</template>