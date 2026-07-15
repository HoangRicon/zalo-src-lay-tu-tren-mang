<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useResponsive } from '@/composables/use-responsive';

interface ColumnDef {
  key: string;
  title: string;
  /** 'always' | 'md' | 'lg' — controls visibility on small screens */
  priority?: 'always' | 'md' | 'lg';
  /** Optional formatter for cell content. If absent, cell uses raw row[key]. */
  format?: (row: T) => string;
  /** Field used as the card title when stacked. Defaults to first column. */
  primary?: boolean;
  /** Field used as the card subtitle when stacked. */
  secondary?: boolean;
}


interface Props {
  items: T[];
  columns: ColumnDef[];
  /** Vuetify data-table props passed through on md+ */
  itemsPerPage?: number;
  loading?: boolean;
  /** Emitted when a card action menu is opened (for per-row actions) */
  rowKey?: keyof T | ((row: T) => string | number);
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerPage: 10,
  loading: false,
});

const emit = defineEmits<{
  rowClick: [row: T];
}>();

const { t } = useI18n();
const { isTabletOrBelow } = useResponsive();

const headers = computed(() =>
  props.columns.map((c) => ({
    title: c.title,
    key: c.key,
    sortable: true,
  })),
);

function getKey(row: T, index: number): string | number {
  if (typeof props.rowKey === 'function') return props.rowKey(row);
  if (props.rowKey) return row[props.rowKey] as string | number;
  return index;
}

function cellText(row: T, col: ColumnDef): string {
  if (col.format) return col.format(row);
  const v = row[col.key];
  if (v == null) return '';
  return String(v);
}

function primaryText(row: T): string {
  const primary = props.columns.find((c) => c.primary) ?? props.columns[0];
  return cellText(row, primary);
}

function secondaryText(row: T): string {
  const secondary = props.columns.find((c) => c.secondary);
  if (!secondary) return '';
  return cellText(row, secondary);
}

const expanded = ref<Record<string | number, boolean>>({});
</script>

<template>
  <!-- Mobile / tablet: stacked card list -->
  <div v-if="isTabletOrBelow" class="responsive-card-list" :aria-busy="loading">
    <div v-if="loading" class="pa-4 text-center text-caption">{{ t('common.search') }}…</div>
    <div
      v-for="(row, i) in items"
      :key="getKey(row, i)"
      class="responsive-card touch-target"
      role="button"
      tabindex="0"
      :aria-label="primaryText(row)"
      @click="emit('rowClick', row)"
      @keydown.enter="emit('rowClick', row)"
    >
      <div class="d-flex justify-space-between align-center">
        <div class="flex-grow-1" style="min-width: 0;">
          <div class="font-weight-medium text-truncate">{{ primaryText(row) }}</div>
          <div v-if="secondaryText(row)" class="text-caption text-medium-emphasis text-truncate">
            {{ secondaryText(row) }}
          </div>
        </div>
        <v-btn
          v-if="$slots.actions"
          icon="mdi-dots-vertical"
          variant="text"
          size="small"
          class="touch-target"
          :aria-label="t('common.more')"
          @click.stop="expanded[getKey(row, i)] = !expanded[getKey(row, i)]"
        />
      </div>
      <div v-if="expanded[getKey(row, i)]" class="mt-2">
        <slot name="actions" :row="row" />
      </div>
    </div>
    <div v-if="!loading && items.length === 0" class="pa-6 text-center text-medium-emphasis">
      {{ t('mobile.empty_state.title') }}
    </div>
  </div>

  <!-- Desktop: standard data-table -->
  <v-data-table
    v-else
    :headers="headers"
    :items="items"
    :items-per-page="itemsPerPage"
    :loading="loading"
    density="comfortable"
    @click:row="(_event: unknown, ctx: { item: T }) => emit('rowClick', ctx.item)"
  >
    <template v-for="col in columns" :key="col.key" #[`item.${col.key}`]="slotProps">
      {{ col.format ? col.format(slotProps.item as T) : slotProps.item[col.key] }}
    </template>
    <template v-if="$slots.actions" #item.actions="{ item }">
      <slot name="actions" :row="item as T" />
    </template>
  </v-data-table>
</template>