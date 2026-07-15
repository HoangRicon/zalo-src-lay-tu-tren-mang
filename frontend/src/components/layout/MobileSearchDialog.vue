<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [v: boolean];
}>();

const { t } = useI18n();
const open = ref(props.modelValue);
const query = ref('');

watch(() => props.modelValue, (v) => (open.value = v));
watch(open, (v) => emit('update:modelValue', v));

function close() {
  open.value = false;
  query.value = '';
}
</script>

<template>
  <ResponsiveDialog v-model="open" :title="t('common.search')" width="lg">
    <v-text-field
      v-model="query"
      :placeholder="t('mobile.search.placeholder')"
      prepend-inner-icon="mdi-magnify"
      autofocus
      variant="outlined"
      density="comfortable"
      class="touch-target"
    />
    <slot :query="query" />
    <template #actions>
      <v-spacer />
      <v-btn variant="flat" color="primary" class="touch-target" @click="close">
        {{ t('common.close') }}
      </v-btn>
    </template>
  </ResponsiveDialog>
</template>