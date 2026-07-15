<template>
  <!-- Phone: URL-driven stack -->
  <div v-if="isPhone" class="chat-phone">
    <ConversationList
      v-if="!selectedConvId"
      :conversations="conversations"
      :selected-id="selectedConvId"
      :loading="loadingConvs"
      v-model:search="searchQuery"
      @select="onSelectConversation"
      @filter-account="onFilterAccount"
    />
    <template v-else>
      <MessageThread
        v-if="!showContactPanel"
        :conversation="selectedConv"
        :messages="messages"
        :loading="loadingMsgs"
        :sending="sendingMsg"
        @send="sendMessage"
        @back="goBackToList"
        @toggle-contact-panel="openContactPanel"
        :show-contact-panel="false"
      />
      <ChatContactPanel
        v-else-if="selectedConv?.contact"
        :contact-id="selectedConv.contact.id"
        :contact="selectedConv.contact"
        @close="closeContactPanel"
        @saved="fetchConversations()"
      />
    </template>
  </div>

  <!-- Tablet+: resizable 3-pane layout -->
  <div v-else class="chat-container d-flex" style="height: calc(100vh - 64px);">
    <div class="chat-panel-left" :style="{ width: leftWidth + 'px' }">
      <ConversationList
        :conversations="conversations"
        :selected-id="selectedConvId"
        :loading="loadingConvs"
        v-model:search="searchQuery"
        @select="onSelectConversation"
        @filter-account="onFilterAccount"
      />
      <div class="resize-handle" @mousedown="startResize('left', $event)" />
    </div>

    <MessageThread
      :conversation="selectedConv"
      :messages="messages"
      :loading="loadingMsgs"
      :sending="sendingMsg"
      @send="sendMessage"
      @toggle-contact-panel="showContactPanel = !showContactPanel"
      :show-contact-panel="showContactPanel"
      style="flex: 1; min-width: 300px;"
    />

    <div v-if="showContactPanel && selectedConv?.contact" class="chat-panel-right" :style="{ width: rightWidth + 'px' }">
      <div class="resize-handle resize-handle-left" @mousedown="startResize('right', $event)" />
      <ChatContactPanel
        :contact-id="selectedConv.contact.id"
        :contact="selectedConv.contact"
        @close="showContactPanel = false"
        @saved="fetchConversations()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConversationList from '@/components/chat/ConversationList.vue';
import MessageThread from '@/components/chat/MessageThread.vue';
import ChatContactPanel from '@/components/chat/ChatContactPanel.vue';
import { useChat } from '@/composables/use-chat';
import { useResponsive } from '@/composables/use-responsive';

const {
  conversations, selectedConvId, selectedConv, messages,
  loadingConvs, loadingMsgs, sendingMsg, searchQuery, accountFilter,
  fetchConversations, selectConversation, sendMessage,
  initSocket, destroySocket,
} = useChat();

const { isPhone } = useResponsive();
const route = useRoute();
const router = useRouter();

function onFilterAccount(id: string | null) {
  accountFilter.value = id;
  fetchConversations();
}

const showContactPanel = ref(false);

function onSelectConversation(id: string) {
  if (isPhone.value) {
    router.push({ name: 'ChatConversation', params: { id } });
  } else {
    selectConversation(id);
  }
}

function goBackToList() {
  router.push({ name: 'Chat' });
}

function openContactPanel() {
  if (!selectedConv.value) return;
  router.push({ name: 'ChatContact', params: { id: selectedConv.value.id } });
}

function closeContactPanel() {
  if (selectedConvId.value) {
    router.push({ name: 'ChatConversation', params: { id: selectedConvId.value } });
  }
}

// Sync route -> state on phone
watch(
  () => route.params.id,
  (id) => {
    if (isPhone.value) {
      const stringId = Array.isArray(id) ? id[0] : id;
      if (stringId) {
        selectConversation(stringId);
        showContactPanel.value = route.name === 'ChatContact';
      } else {
        selectedConvId.value = null;
        showContactPanel.value = false;
      }
    }
  },
  { immediate: true },
);

// Resizable panel widths (restored from localStorage)
const leftWidth = ref(parseInt(localStorage.getItem('chat-left-width') || '320'));
const rightWidth = ref(parseInt(localStorage.getItem('chat-right-width') || '320'));

let resizing: 'left' | 'right' | null = null;
let startX = 0;
let startWidth = 0;

function startResize(panel: 'left' | 'right', e: MouseEvent) {
  resizing = panel;
  startX = e.clientX;
  startWidth = panel === 'left' ? leftWidth.value : rightWidth.value;
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function onResize(e: MouseEvent) {
  if (!resizing) return;
  const diff = e.clientX - startX;
  if (resizing === 'left') {
    leftWidth.value = Math.max(200, Math.min(500, startWidth + diff));
  } else {
    rightWidth.value = Math.max(250, Math.min(500, startWidth - diff));
  }
}

function stopResize() {
  if (resizing) {
    localStorage.setItem('chat-left-width', String(leftWidth.value));
    localStorage.setItem('chat-right-width', String(rightWidth.value));
  }
  resizing = null;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

onMounted(() => { fetchConversations(); initSocket(); });
onUnmounted(() => { destroySocket(); });

let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchConversations(), 300);
});
</script>

<style scoped>
.chat-container {
  margin: -12px;
}

.chat-panel-left {
  position: relative;
  flex-shrink: 0;
  min-width: 200px;
  max-width: 500px;
}

.chat-panel-right {
  position: relative;
  flex-shrink: 0;
  min-width: 250px;
  max-width: 500px;
}

/* Resize handle — thin vertical line on the edge */
.resize-handle {
  position: absolute;
  top: 0;
  right: -2px;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.2s;
}

.resize-handle:hover,
.resize-handle:active {
  background: rgba(0, 242, 255, 0.3);
}

.resize-handle-left {
  right: auto;
  left: -2px;
}

.chat-phone {
  margin: -12px;
  height: calc(100dvh - 64px - 64px);
}
</style>
