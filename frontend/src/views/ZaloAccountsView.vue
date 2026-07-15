<template>
  <div>
    <div class="d-flex align-center mb-4 flex-wrap">
      <h1 class="text-h5 text-md-h4">Tài khoản Zalo</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" class="touch-target" @click="showAddDialog = true">Thêm Zalo</v-btn>
    </div>

    <v-card>
      <v-data-table
        class="desktop-only"
        :headers="headers"
        :items="accounts"
        :loading="loading"
        no-data-text="Chưa có tài khoản Zalo nào"
      >
        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.liveStatus || item.status)" size="small" variant="flat">
            {{ statusText(item.liveStatus || item.status) }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn v-if="authStore.isAdmin" icon size="small" color="cyan" class="touch-target" title="Phân quyền truy cập" @click="openAccess(item)">
            <v-icon>mdi-shield-account</v-icon>
          </v-btn>
          <v-btn icon size="small" color="success" class="touch-target" @click="syncContacts(item.id)" title="Đồng bộ danh bạ Zalo" :loading="syncing === item.id">
            <v-icon>mdi-account-sync</v-icon>
          </v-btn>
          <v-btn v-if="item.liveStatus !== 'connected'" icon size="small" color="primary" class="touch-target" @click="loginAccount(item.id)" title="Đăng nhập QR">
            <v-icon>mdi-qrcode</v-icon>
          </v-btn>
          <v-btn v-if="item.liveStatus === 'disconnected' && item.sessionData" icon size="small" color="info" class="touch-target" @click="reconnectAccount(item.id)" title="Kết nối lại">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
          <v-btn icon size="small" color="error" class="touch-target" @click="confirmDelete(item)" title="Xóa">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>

      <!-- Stacked card list — mobile -->
      <div v-if="!loading && accounts.length === 0" class="mobile-only pa-6 text-center text-medium-emphasis">
        Chưa có tài khoản Zalo nào
      </div>
      <div v-else class="mobile-only responsive-card-list">
        <div
          v-for="a in accounts"
          :key="a.id"
          class="responsive-card"
        >
          <div class="d-flex justify-space-between align-center">
            <div class="flex-grow-1" style="min-width: 0;">
              <div class="font-weight-medium text-truncate">{{ a.displayName || a.id }}</div>
              <div class="text-caption text-medium-emphasis">{{ a.zaloUid || a.phone || '—' }}</div>
            </div>
            <v-chip :color="statusColor(a.liveStatus || a.status)" size="x-small" variant="flat">
              {{ statusText(a.liveStatus || a.status) }}
            </v-chip>
          </div>
          <div class="d-flex flex-wrap mt-2" style="gap: 4px;">
            <v-btn v-if="authStore.isAdmin" icon size="x-small" variant="text" color="cyan" class="touch-target" :aria-label="'Phân quyền'" @click="openAccess(a)">
              <v-icon size="18">mdi-shield-account</v-icon>
            </v-btn>
            <v-btn icon size="x-small" variant="text" color="success" class="touch-target" :aria-label="'Đồng bộ'" @click="syncContacts(a.id)" :loading="syncing === a.id">
              <v-icon size="18">mdi-account-sync</v-icon>
            </v-btn>
            <v-btn v-if="a.liveStatus !== 'connected'" icon size="x-small" variant="text" color="primary" class="touch-target" :aria-label="'Đăng nhập QR'" @click="loginAccount(a.id)">
              <v-icon size="18">mdi-qrcode</v-icon>
            </v-btn>
            <v-btn v-if="a.liveStatus === 'disconnected' && a.sessionData" icon size="x-small" variant="text" color="info" class="touch-target" :aria-label="'Kết nối lại'" @click="reconnectAccount(a.id)">
              <v-icon size="18">mdi-refresh</v-icon>
            </v-btn>
            <v-btn icon size="x-small" variant="text" color="error" class="touch-target" :aria-label="'Xóa'" @click="confirmDelete(a)">
              <v-icon size="18">mdi-delete</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Add account dialog -->
    <v-dialog v-model="showAddDialog" max-width="400" class="responsive-dialog">
      <v-card>
        <v-card-title>Thêm tài khoản Zalo</v-card-title>
        <v-card-text>
          <v-text-field v-model="newAccountName" label="Tên hiển thị (VD: Zalo Sale Hương)" class="touch-target" />
        </v-card-text>
        <v-card-actions class="safe-area-bottom">
          <v-spacer />
          <v-btn class="touch-target" @click="showAddDialog = false">Hủy</v-btn>
          <v-btn color="primary" :loading="adding" class="touch-target" @click="handleAddAccount">Thêm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- QR Code dialog -->
    <v-dialog v-model="showQRDialog" max-width="400" persistent>
      <v-card class="text-center pa-4">
        <v-card-title>Quét QR để đăng nhập Zalo</v-card-title>
        <v-card-text>
          <div v-if="qrImage" class="mb-4">
            <img :src="'data:image/png;base64,' + qrImage" alt="QR Code" style="max-width: 280px;" />
          </div>
          <div v-else-if="qrScanned" class="mb-4">
            <v-icon icon="mdi-check-circle" size="64" color="success" />
            <p class="text-h6 mt-2">Đã quét! Xác nhận trên điện thoại...</p>
            <p v-if="scannedName" class="text-body-2">{{ scannedName }}</p>
          </div>
          <div v-else class="mb-4">
            <v-progress-circular indeterminate color="primary" size="64" />
            <p class="mt-2">Đang tạo QR code...</p>
          </div>
          <v-alert v-if="qrError" type="error" density="compact" class="mt-2">{{ qrError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelQR">Đóng</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400" class="responsive-dialog">
      <v-card>
        <v-card-title>Xác nhận xóa</v-card-title>
        <v-card-text>Bạn có chắc muốn xóa tài khoản "{{ deleteTarget?.displayName || deleteTarget?.id }}"?</v-card-text>
        <v-card-actions class="safe-area-bottom">
          <v-spacer />
          <v-btn class="touch-target" @click="showDeleteDialog = false">Hủy</v-btn>
          <v-btn color="error" :loading="deleting" class="touch-target" @click="handleDeleteAccount">Xóa</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Access control dialog -->
    <ZaloAccessDialog
      v-model="showAccessDialog"
      :account-id="accessTarget?.id ?? ''"
      :account-name="accessTarget?.displayName ?? accessTarget?.id ?? ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useZaloAccounts, type ZaloAccount } from '@/composables/use-zalo-accounts';
import { useAuthStore } from '@/stores/auth';
import ZaloAccessDialog from '@/components/settings/ZaloAccessDialog.vue';
import { api } from '@/api/index';

const {
  accounts, loading, adding, deleting,
  showQRDialog, qrImage, qrScanned, scannedName, qrError,
  statusColor, statusText,
  fetchAccounts, addAccount, loginAccount, reconnectAccount, deleteAccount,
  cancelQR, setupSocket,
} = useZaloAccounts();

const authStore = useAuthStore();

const showAddDialog = ref(false);
const syncing = ref<string | null>(null);
const showDeleteDialog = ref(false);
const showAccessDialog = ref(false);
const newAccountName = ref('');
const deleteTarget = ref<ZaloAccount | null>(null);
const accessTarget = ref<ZaloAccount | null>(null);

const headers = [
  { title: 'Tên', key: 'displayName', sortable: true },
  { title: 'Zalo UID', key: 'zaloUid' },
  { title: 'SĐT', key: 'phone' },
  { title: 'Trạng thái', key: 'status', sortable: true },
  { title: 'Hành động', key: 'actions', sortable: false, align: 'end' as const },
];

async function syncContacts(accountId: string) {
  syncing.value = accountId;
  try {
    const res = await api.post(`/zalo-accounts/${accountId}/sync-contacts`);
    alert(`Đồng bộ thành công: ${res.data.created} mới, ${res.data.updated} cập nhật`);
  } catch (err: any) {
    alert('Đồng bộ thất bại: ' + (err.response?.data?.error || err.message));
  } finally {
    syncing.value = null;
  }
}

async function handleAddAccount() {
  const ok = await addAccount(newAccountName.value);
  if (ok) {
    showAddDialog.value = false;
    newAccountName.value = '';
  }
}

function confirmDelete(account: ZaloAccount) {
  deleteTarget.value = account;
  showDeleteDialog.value = true;
}

function openAccess(account: ZaloAccount) {
  accessTarget.value = account;
  showAccessDialog.value = true;
}

async function handleDeleteAccount() {
  if (!deleteTarget.value) return;
  const ok = await deleteAccount(deleteTarget.value);
  if (ok) {
    showDeleteDialog.value = false;
    deleteTarget.value = null;
  }
}

onMounted(() => {
  fetchAccounts();
  setupSocket();
});
</script>
