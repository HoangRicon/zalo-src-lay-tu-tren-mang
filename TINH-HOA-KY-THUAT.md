# ZaloCRM — Tinh Hoa Kỹ Thuật

> Phân tích chi tiết các điểm tinh hoa, kiến trúc và kỹ thuật nổi bật của hệ thống ZaloCRM.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc Backend](#2-kiến-trúc-backend)
3. [Quản lý Kết nối Zalo (ZaloPool)](#3-quản-lý-kết-nối-zalo-zalopool)
4. [Real-time với Socket.IO](#4-real-time-với-socketio)
5. [Bảo vệ tài khoản Zalo](#5-bảo-vệ-tài-khoản-zalo)
6. [Webhook System](#6-webhook-system)
7. [API Public cho bên thứ ba](#7-api-public-cho-bên-thứ-ba)
8. [Dashboard & Báo cáo](#8-dashboard--báo-cáo)
9. [Tìm kiếm toàn hệ thống](#9-tìm-kiếm-toàn-hệ-thống)
10. [CRM Pipeline](#10-crm-pipeline)
11. [Nhắc nhở lịch hẹn tự động](#11-nhắc-nhở-lịch-hẹn-tự-động)
12. [Health Check & Auto-reconnect](#12-health-check--auto-reconnect)
13. [Phân quyền & Bảo mật](#13-phân-quyền--bảo-mật)
14. [Frontend Architecture](#14-frontend-architecture)
15. [Database Schema](#15-database-schema)
16. [Deployment & DevOps](#16-deployment--devops)
17. [Điểm có thể cải thiện](#17-điểm-có-thể-cải-thiện)

---

## 1. Tổng quan hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Vue 3)                          │
│    Dashboard │ Chat │ Contacts │ Appointments │ Reports          │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP REST + Socket.IO
┌──────────────────────▼──────────────────────────────────────────┐
│                    SERVER (Node.js + Fastify)                   │
│  Auth │ Zalo │ Chat │ Contacts │ Dashboard │ Search │ PublicAPI │
│         ▲                    ▲                    ▲               │
│         │                    │                    │               │
│    ZaloPool              Socket.IO           Webhook             │
│  (Zalo SDK)            (Real-time)        (Outbound)            │
└────────┬───────────────────────────────────────────────────────┘
         │ Prisma ORM
┌────────▼───────────────────────────────────────────────────────┐
│                   PostgreSQL 16                                  │
│  Organizations │ Users │ Teams │ ZaloAccounts │ Contacts        │
│  Conversations │ Messages │ Appointments │ DailyStats          │
└─────────────────────────────────────────────────────────────────┘
```

### Stack công nghệ

| Lớp | Công nghệ |
|-----|-----------|
| Backend | Node.js 20 / Fastify 5 / TypeScript |
| Frontend | Vue 3 / Vuetify 4 / Chart.js / Pinia |
| Database | PostgreSQL 16 + Prisma 7 |
| Real-time | Socket.IO |
| Zalo SDK | zca-js 2.x |
| Auth | JWT (Fastify JWT plugin) |
| Rate Limit | @fastify/rate-limit |
| Cron Jobs | node-cron |
| Deployment | Docker Compose |

---

## 2. Kiến trúc Backend

### 2.1 Entry point — `app.ts`

Điểm khởi đầu tập trung vào khởi tạo toàn bộ hệ thống:

```typescript
// Fastify với logging disabled (dùng custom logger riêng)
const app = Fastify({ logger: false });

// Đăng ký plugins theo thứ tự: cors → jwt → rate-limit
await app.register(cors, { origin: config.isProduction ? config.appUrl : true });
await app.register(fastifyJwt, { secret: config.jwtSecret });
await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });

// Socket.IO gắn trực tiếp vào Fastify server
const io = new Server(app.server, { cors: { ... } });
app.decorate('io', io);
zaloPool.setIO(io); // Pool có thể emit real-time events

// Đăng ký tất cả route modules
await app.register(authRoutes);
await app.register(zaloRoutes);
await app.register(chatRoutes);
await app.register(contactRoutes);
// ... 12 modules total

// Health check endpoint
app.get('/health', async () => {
  await prisma.$queryRaw`SELECT 1`; // Kiểm tra DB
  return { status: 'ok', db: 'connected' };
});

// Auto-reconnect tất cả tài khoản Zalo đã lưu session (staggered 10s)
const accounts = await prisma.zaloAccount.findMany({
  where: { sessionData: { not: Prisma.JsonNull } }
});
for (const account of accounts) {
  await new Promise(r => setTimeout(r, 10_000)); // Tránh rate limit
  zaloPool.reconnect(account.id, session);
}
```

### 2.2 Module hóa

```
backend/src/
├── app.ts                          # Bootstrap entry
├── config/index.ts                 # Environment config
├── shared/
│   ├── database/prisma-client.ts   # Singleton Prisma client
│   └── utils/logger.ts             # Custom logger
└── modules/
    ├── auth/                       # Login, register, JWT
    ├── zalo/                        # Zalo SDK management
    │   ├── zalo-pool.ts           # Zalo instance pool
    │   ├── zalo-listener-factory.ts # Event listener setup
    │   ├── zalo-rate-limiter.ts   # Anti-block protection
    │   ├── zalo-health-check.ts   # Health monitor cron
    │   └── zalo-socket.ts         # Real-time handlers
    ├── chat/                       # Conversations & messages
    │   ├── chat-routes.ts
    │   └── message-handler.ts     # Incoming message processor
    ├── contacts/                   # CRM contacts
    │   ├── contact-routes.ts
    │   └── appointment-reminder.ts # Cron job
    ├── dashboard/                  # KPIs & charts
    ├── search/                     # Global search
    ├── api/                        # Public API & Webhook
    └── orders/                     # Sales orders
```

### 2.3 Prisma Client Singleton

```typescript
// shared/database/prisma-client.ts
export const prisma = new PrismaClient({
  log: config.isProduction ? ['error'] : ['query', 'error'],
});
```

Prisma được export như một singleton để tránh tạo nhiều connection pool.

---

## 3. Quản lý Kết nối Zalo (ZaloPool)

### 3.1 Singleton Pattern

`ZaloPool` là trái tim của hệ thống — quản lý tất cả Zalo SDK instances:

```typescript
class ZaloAccountPool {
  private instances = new Map<string, ZaloInstance>();
  private io: Server | null = null;
  private userInfoCache = new Map<string, UserInfoCacheEntry>();
  private disconnectHistory = new Map<string, number[]>(); // Circuit breaker

  async loginQR(accountId: string): Promise<void> {
    const zalo = new Zalo({ logging: false });
    this.instances.set(accountId, { zalo, api: null, status: 'qr_pending' });
    
    // QR event callback — emit cho frontend
    const api = await zalo.loginQR({}, (event) => {
      switch (event.type) {
        case 0: // QRCodeGenerated → gửi QR cho client
          this.io?.to(`account:${accountId}`).emit('zalo:qr', { qrImage: event.data.image });
          break;
        case 1: // QRCodeExpired → thử lại
          event.actions?.retry();
          break;
        case 2: // QRCodeScanned → hiển thị tên người dùng
          this.io?.to(`account:${accountId}`).emit('zalo:scanned', { displayName: ... });
          break;
        case 4: // GotLoginInfo → lưu session
          this.saveCredentials(accountId, { cookie, imei, userAgent });
          break;
      }
    });
    
    // Attach listener để nhận tin nhắn
    this.attachListener(accountId, api);
  }
}
```

### 3.2 Session Persistence

```typescript
// Lưu credentials sau khi đăng nhập QR thành công
private saveCredentials(accountId: string, credentials: ZaloCredentials): void {
  prisma.zaloAccount.update({
    where: { id: accountId },
    data: { sessionData: credentials } // JSON field trong DB
  });
}

// Server restart → tự động reconnect tất cả
const accounts = await prisma.zaloAccount.findMany({
  where: { sessionData: { not: Prisma.JsonNull } }
});
```

### 3.3 User Info Cache (5 phút TTL)

```typescript
// zalo-listener-factory.ts
async function resolveZaloName(api, uid, cache): Promise<{ zaloName, avatar }> {
  const cached = cache.get(uid);
  if (cached && Date.now() - cached.cachedAt < 5 * 60 * 1000) {
    return cached; // Cache hit
  }
  // Cache miss → gọi API
  const result = await api.getUserInfo(uid);
  const profile = result?.changed_profiles?.[uid];
  cache.set(uid, { zaloName: profile.zaloName, avatar: profile.avatar, cachedAt: Date.now() });
  return { zaloName, avatar };
}
```

---

## 4. Real-time với Socket.IO

### 4.1 Architecture

```typescript
// app.ts
const io = new Server(app.server, { cors: { origin: config.isProduction ? config.appUrl : '*' } });
app.decorate('io', io); // Decorate để route handlers truy cập được
zaloPool.setIO(io);

// Frontend subscribe theo account
socket.emit('join', { accountId });
socket.on('zalo:qr', ({ qrImage }) => showQR(qrImage));
socket.on('zalo:connected', ({ accountId }) => updateUI());
socket.on('chat:message', ({ message }) => appendMessage(message));
socket.on('appointment:reminder', (data) => showNotification(data));
```

### 4.2 Events chính

| Event | Direction | Mô tả |
|-------|-----------|--------|
| `zalo:qr` | Server → Client | QR code image base64 |
| `zalo:scanned` | Server → Client | User quét QR thành công |
| `zalo:connected` | Server → Client | Tài khoản kết nối |
| `zalo:disconnected` | Server → Client | Mất kết nối |
| `zalo:reconnect-failed` | Server → Client | Reconnect thất bại |
| `chat:message` | Server → Client | Tin nhắn mới |
| `chat:deleted` | Server → Client | Tin nhắn bị thu hồi |
| `appointment:reminder` | Server → Client | Nhắc lịch hẹn |

---

## 5. Bảo vệ tài khoản Zalo

### 5.1 Rate Limiter (`zalo-rate-limiter.ts`)

```typescript
const DAILY_LIMIT = 200;           // Giới hạn 200 tin/ngày
const BURST_LIMIT = 5;              // Tối đa 5 tin trong 30s
const BURST_WINDOW_MS = 30_000;     // Cửa sổ burst 30 giây

class ZaloRateLimiter {
  private dailyCounts = new Map<string, { count: number; date: string }>();
  private recentSends = new Map<string, number[]>();

  checkLimits(accountId): { allowed: boolean; reason?: string } {
    // 1. Kiểm tra giới hạn ngày
    const daily = this.dailyCounts.get(accountId);
    if (daily && daily.date === today && daily.count >= 200) {
      return { allowed: false, reason: 'Đã đạt giới hạn 200 tin/ngày' };
    }
    
    // 2. Kiểm tra burst (spam)
    const recent = this.recentSends.get(accountId)
      .filter(t => now - t < 30_000);
    if (recent.length >= 5) {
      return { allowed: false, reason: 'Gửi quá nhanh (>5 tin/30s)' };
    }
    
    return { allowed: true };
  }

  recordSend(accountId): void {
    // Update burst timestamps
    const recent = this.recentSends.get(accountId).filter(t => now - t < 60_000);
    recent.push(now);
    this.recentSends.set(accountId, recent);
    
    // Update daily count
    const daily = this.dailyCounts.get(accountId);
    if (daily && daily.date === today) daily.count++;
    else this.dailyCounts.set(accountId, { count: 1, date: today });
  }
}
```

### 5.2 Circuit Breaker (Auto-disconnect protection)

```typescript
// Trong zalo-pool.ts attachListener
private attachListener(accountId, api): void {
  listener.on('closed', (code, reason) => {
    // Track disconnect count
    const now = Date.now();
    const history = this.disconnectHistory.get(key)
      .filter(t => now - t < 5 * 60_000); // Lọc cũ hơn 5 phút
    history.push(now);
    this.disconnectHistory.set(key, history);

    // >5 disconnects trong 5 phút → dừng auto-reconnect
    if (history.length >= 5) {
      this.updateAccountDB(id, 'qr_pending', null);
      this.io?.emit('zalo:reconnect-failed', { 
        error: 'Session không ổn định, cần đăng nhập QR lại' 
      });
      this.disconnectHistory.delete(key);
      return; // KHÔNG tự reconnect nữa
    }

    // Bình thường → reconnect sau 30s
    setTimeout(() => this.autoReconnect(id), 30_000);
  });
}
```

---

## 6. Webhook System

### 6.1 HMAC-SHA256 Signed Webhooks

```typescript
// webhook-service.ts
export async function emitWebhook(orgId: string, event: string, data: any): Promise<void> {
  const config = await prisma.appSetting.findFirst({
    where: { orgId, settingKey: 'webhook_url' }
  });
  if (!config?.valuePlain) return; // Không có webhook URL → skip

  const secretSetting = await prisma.appSetting.findFirst({
    where: { orgId, settingKey: 'webhook_secret' }
  });

  const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data });
  
  // Sign với HMAC-SHA256 nếu có secret
  const signature = secretSetting?.valuePlain
    ? crypto.createHmac('sha256', secretSetting.valuePlain)
        .update(payload).digest('hex')
    : '';

  // Fire-and-forget: không blocking caller
  fetch(config.valuePlain, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event,
    },
    body: payload,
    signal: AbortSignal.timeout(10000), // 10s timeout
  }).catch(err => logger.warn(`[webhook] Failed:`, err));
}
```

### 6.2 Webhook Events

| Event | Trigger |
|-------|---------|
| `message.received` | Tin nhắn mới đến từ khách hàng |
| `message.sent` | Tin nhắn gửi đi thành công |
| `contact.created` | Khách hàng mới được tạo |
| `zalo.connected` | Tài khoản Zalo kết nối |
| `zalo.disconnected` | Tài khoản Zalo mất kết nối |

---

## 7. API Public cho bên thứ ba

### 7.1 API Key Authentication

```typescript
// public-api-routes.ts
async function apiKeyAuth(request, reply) {
  const apiKey = request.headers['x-api-key'] as string;
  if (!apiKey) return reply.status(401).send({ error: 'API key required' });

  // Lookup API key trong AppSetting
  const setting = await prisma.appSetting.findFirst({
    where: { settingKey: 'public_api_key', valuePlain: apiKey }
  });
  if (!setting) return reply.status(401).send({ error: 'Invalid API key' });

  // Inject orgId vào request
  (request as any).orgId = setting.orgId;
}
```

### 7.2 Endpoints

```
GET  /api/public/contacts              # Danh sách khách hàng (search, filter, paginate)
GET  /api/public/contacts/:id          # Chi tiết khách hàng
POST /api/public/contacts               # Tạo khách hàng
PUT  /api/public/contacts/:id          # Cập nhật khách hàng
GET  /api/public/conversations          # Danh sách cuộc trò chuyện
GET  /api/public/conversations/:id/messages  # Tin nhắn trong cuộc trò chuyện
GET  /api/public/appointments          # Danh sách lịch hẹn
POST /api/public/appointments          # Tạo lịch hẹn
POST /api/public/messages/send          # Gửi tin nhắn Zalo
```

---

## 8. Dashboard & Báo cáo

### 8.1 KPI Cards

```typescript
// dashboard-routes.ts — GET /api/v1/dashboard/kpi
const [messagesToday, unreplied, unread, aptsToday, newContacts, totalContacts] =
  await Promise.all([
    prisma.message.count({ where: { sentAt: { gte: today, lt: tomorrow } } }),
    prisma.conversation.count({ where: { isReplied: false, unreadCount: { gt: 0 } } }),
    prisma.conversation.count({ where: { unreadCount: { gt: 0 } } }),
    prisma.appointment.count({ where: { appointmentDate: { gte: today }, status: 'scheduled' } }),
    prisma.contact.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.contact.count({}),
  ]);
```

### 8.2 Message Volume Chart (Raw SQL)

```typescript
// Sử dụng Prisma raw query với PostgreSQL FILTER
const rows = await prisma.$queryRaw`
  SELECT
    DATE(m.sent_at) AS date,
    COUNT(*) FILTER (WHERE m.sender_type = 'self') AS sent,
    COUNT(*) FILTER (WHERE m.sender_type = 'contact') AS received
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.org_id = ${orgId}
    AND m.sent_at >= ${from}::date
    AND m.sent_at < (${to}::date + interval '1 day')
  GROUP BY DATE(m.sent_at)
  ORDER BY date ASC
`;
```

### 8.3 Vietnam Timezone Handling

```typescript
// Tính today range theo múi giờ VN (UTC+7)
function todayRange() {
  const now = new Date();
  const vnOffset = 7 * 60 * 60 * 1000; // 7 tiếng
  const vnNow = new Date(now.getTime() + vnOffset);
  const todayVN = new Date(vnNow.getFullYear(), vnNow.getMonth(), vnNow.getDate());
  const today = new Date(todayVN.getTime() - vnOffset); // Convert back sang UTC
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return { today, tomorrow };
}
```

---

## 9. Tìm kiếm toàn hệ thống

```typescript
// search-routes.ts
app.get('/api/v1/search', async (request) => {
  const { q = '' } = request.query;
  if (!q || q.length < 2) return { contacts: [], messages: [], appointments: [] };
  //  Require tối thiểu 2 ký tự để tránh full-table scan

  const [contacts, messages, appointments] = await Promise.all([
    prisma.contact.findMany({
      where: {
        OR: [
          { fullName: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm } },
          { notes: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 10,
    }),
    prisma.message.findMany({
      where: { content: { contains: searchTerm, mode: 'insensitive' } },
      orderBy: { sentAt: 'desc' },
      take: 10,
    }),
    prisma.appointment.findMany({
      where: {
        OR: [
          { notes: { contains: searchTerm, mode: 'insensitive' } },
          { contact: { fullName: { contains: searchTerm } } },
        ],
      },
      take: 10,
    }),
  ]);

  return { contacts, messages, appointments };
});
```

---

## 10. CRM Pipeline

### 10.1 Contact Status Flow

```
New → Contacted → Interested → Converted
                      ↓
                   Lost
```

### 10.2 Contact Model với Rich Fields

```typescript
model Contact {
  id               String    @id @default(uuid())
  zaloUid          String?   @unique @map("zalo_uid")
  phone            String?
  email            String?
  fullName         String?
  source           String?   // FB, TT, GT, CN (source khách hàng)
  sourceDate       DateTime? @map("source_date")
  firstContactDate DateTime? @map("first_contact_date")
  status           String?   @default("new")  // new/contacted/interested/converted/lost
  nextAppointment  DateTime? @map("next_appointment")
  assignedUserId   String?   @map("assigned_user_id")
  notes            String?
  tags             Json      @default("[]")
  metadata         Json      @default("{}")
}
```

---

## 11. Nhắc nhở lịch hẹn tự động

```typescript
// appointment-reminder.ts
export function startAppointmentReminder(io: Server): void {
  // Chạy daily lúc 01:00 UTC = 08:00 VN
  cron.schedule('0 1 * * *', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
    const endOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: startOfDay, lte: endOfDay },
        status: 'scheduled',
        reminderSent: false,
      },
      include: { contact: true, assignedUser: true },
    });

    for (const apt of appointments) {
      io.emit('appointment:reminder', {
        appointmentId: apt.id,
        contactName: apt.contact.fullName,
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        assignedUserName: apt.assignedUser?.fullName,
      });

      await prisma.appointment.update({
        where: { id: apt.id },
        data: { reminderSent: true },
      });
    }
  });
}
```

---

## 12. Health Check & Auto-reconnect

### 12.1 Health Check Cron (Mỗi 5 phút)

```typescript
// zalo-health-check.ts
export function startZaloHealthCheck(): void {
  // Every 5 minutes: kiểm tra tất cả accounts
  cron.schedule('*/5 * * * *', async () => {
    const accounts = await prisma.zaloAccount.findMany({
      where: { sessionData: { not: Prisma.JsonNull } }
    });

    for (const acc of accounts) {
      const status = zaloPool.getStatus(acc.id);
      if (status !== 'connected' && status !== 'connecting' && status !== 'qr_pending') {
        zaloPool.reconnect(acc.id, session).catch(err => {
          logger.warn(`Reconnect failed:`, err);
        });
      }
    }
  });

  // Daily: refresh sessions để giữ cookies tươi
  cron.schedule('0 4 * * *', async () => { // 11:00 AM VN
    // Disconnect → wait 5s → reconnect (force cookie refresh)
    zaloPool.disconnect(acc.id);
    await new Promise(r => setTimeout(r, 5000));
    zaloPool.reconnect(acc.id, session);
    await new Promise(r => setTimeout(r, 10000)); // Stagger per account
  });
}
```

---

## 13. Phân quyền & Bảo mật

### 13.1 RBAC (Role-Based Access Control)

```typescript
// User roles
model User {
  role String @default("member") // owner, admin, member
}

// Zalo Account Access Control
model ZaloAccountAccess {
  id            String @id @default(uuid())
  zaloAccountId String @map("zalo_account_id")
  userId        String @map("user_id")
  permission    String @default("read") // read, chat, admin
}
// Unique: một user chỉ có một permission cho mỗi Zalo account
```

### 13.2 Zalo Access Middleware

```typescript
// zalo-access-middleware.ts
export async function requireZaloAccess(permission: 'read' | 'chat' | 'admin') {
  return async (request, reply) => {
    if (user.role === 'owner' || user.role === 'admin') return; // Skip check
    
    const access = await prisma.zaloAccountAccess.findFirst({
      where: { userId: user.id, zaloAccountId: accountId }
    });
    
    const permissionLevel = { read: 1, chat: 2, admin: 3 };
    if (!access || permissionLevel[access.permission] < permissionLevel[permission]) {
      return reply.status(403).send({ error: 'Access denied' });
    }
  };
}
```

### 13.3 Security Layers

| Layer | Implementation |
|-------|---------------|
| Authentication | JWT với Fastify JWT plugin |
| Authorization | Role-based + Zalo account ACL |
| API Security | Rate limiting (1000 req/min) |
| Zalo Protection | 200 tin/ngày + burst limit 5 tin/30s |
| Webhook | HMAC-SHA256 signature |
| Public API | API Key authentication |
| Input Validation | Fastify built-in + manual checks |

---

## 14. Frontend Architecture

### 14.1 Tech Stack

- **Vue 3** (Composition API) — reactive UI
- **Vuetify 4** — Material Design components
- **Pinia** — State management
- **Vue Router** — SPA routing
- **Socket.IO Client** — Real-time
- **Chart.js + vue-chartjs** — Dashboard charts
- **Vue I18n** — Internationalization

### 14.2 Layout System

```vue
<!-- App.vue — Dynamic layout -->
<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup>
const layout = computed(() => {
  return route.meta.layout === 'auth' ? AuthLayout : DefaultLayout;
});
</script>
```

### 14.3 Chat View — Resizable Panels

```vue
<!-- ChatView.vue -->
<div class="chat-container d-flex" style="height: calc(100vh - 64px);">
  <!-- Left panel — Conversation list (resizable) -->
  <div class="chat-panel-left" :style="{ width: leftWidth + 'px' }">
    <ConversationList />
    <div class="resize-handle" @mousedown="startResize('left', $event)" />
  </div>

  <!-- Center — Message thread (flexible) -->
  <MessageThread style="flex: 1;" />

  <!-- Right panel — Contact info (resizable) -->
  <div v-if="showContactPanel" class="chat-panel-right" :style="{ width: rightWidth + 'px' }">
    <div class="resize-handle resize-handle-left" @mousedown="startResize('right', $event)" />
    <ChatContactPanel />
  </div>
</div>
```

Panel widths được persist vào localStorage.

### 14.4 Dashboard Components

```
DashboardView.vue
├── KpiCards.vue              # 6 KPI metrics
├── MessageVolumeChart.vue    # Line chart (30 days)
├── PipelineChart.vue         # Donut chart (contact stages)
├── SourceChart.vue           # Bar chart (customer sources)
└── AppointmentChart.vue      # Bar chart (appointment status)
```

---

## 15. Database Schema

### 15.1 ERD Overview

```
Organization (1) ─── (n) Team
    │                       │
    │                       └── (n) User
    │                              │
    ├── (n) ZaloAccount ─── (n) ZaloAccountAccess
    │         │
    │         └── (n) Conversation ─── (n) Message
    │                   │
    ├── (n) Contact ─── (n) Appointment
    │         │
    │         └── (n) Order
    │
    ├── (n) ActivityLog
    ├── (n) DailyMessageStat
    └── (n) AppSetting
```

### 15.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Multi-tenancy via `orgId` | Mỗi organization isolated hoàn toàn |
| `Conversation` unique by `(zaloAccountId, externalThreadId)` | Tránh duplicate threads |
| `sessionData` as JSON field | Linh hoạt lưu credentials |
| `tags` và `metadata` as JSON | Schema-less cho custom fields |
| `DailyMessageStat` denormalized | Fast dashboard queries |
| UUID primary keys everywhere | Không expose sequential IDs |

---

## 16. Deployment & DevOps

### 16.1 Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "3080:3080"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/zalocrm
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
```

### 16.2 Startup Sequence

1. PostgreSQL starts
2. App starts, Prisma migrations run
3. Seed default admin user (nếu chưa có)
4. Load saved Zalo sessions từ DB
5. Staggered reconnect (10s delay mỗi account)
6. Health check cron bắt đầu (mỗi 5 phút)
7. Appointment reminder cron bắt đầu (01:00 UTC daily)

---

## 17. Điểm có thể cải thiện

### 17.1 Security Enhancements

| Issue | Suggestion |
|-------|-----------|
| Rate limiter in-memory | Chuyển sang Redis để scale horizontally |
| JWT secret in env | Nên rotate định kỳ |
| API key plaintext in DB | Hash như password |
| No CSRF protection | Thêm CSRF tokens |
| No 2FA for admin | Thêm TOTP-based 2FA |

### 17.2 Performance Enhancements

| Issue | Suggestion |
|-------|-----------|
| Message search là LIKE query | Thêm PostgreSQL full-text search (tsvector) |
| Không có pagination cursor-based | Chuyển offset pagination → cursor cho large datasets |
| User info cache in-memory | Chuyển sang Redis với cluster support |
| Health check query all accounts | Chỉ check accounts có session |

### 17.3 Reliability Enhancements

| Issue | Suggestion |
|-------|-----------|
| Webhook fire-and-forget | Thêm webhook retry queue với exponential backoff |
| Không có dead letter queue | Webhook failures mất nếu endpoint down |
| Không có database backup strategy | Setup pgBackRest hoặc Cloud DB |
| Không có graceful shutdown | Handle SIGTERM để cleanup properly |

### 17.4 Observability

| Issue | Suggestion |
|-------|-----------|
| Chỉ có file logger | Thêm structured logging (Datadog, Sentry) |
| Không có metrics | Thêm Prometheus metrics endpoint |
| Không có distributed tracing | Thêm OpenTelemetry |
| Health check không public | Expose /metrics và /healthz cho k8s |

### 17.5 Missing Features

| Feature | Priority |
|---------|----------|
| Message templates / Quick replies | High |
| Bulk message scheduling | High |
| Contact import from CSV/Excel | Medium |
| Zalo OA (Official Account) support | Medium |
| Conversation tags / labeling | Medium |
| Audit log viewer UI | Medium |
| Multi-language support (i18n) | Low |

---

## Tóm tắt

ZaloCRM là một hệ thống CRM toàn diện với các điểm tinh hoa kỹ thuật sau:

1. **ZaloPool** — Singleton quản lý multiple Zalo SDK instances với auto-reconnect và circuit breaker
2. **Real-time architecture** — Socket.IO tích hợp sâu với Fastify, emit events từ mọi module
3. **Anti-block protection** — Rate limiter (200/ngày + burst limit) + circuit breaker (>5 disconnects/5 phút)
4. **Webhook system** — HMAC-signed, fire-and-forget, extensible event types
5. **Public API** — RESTful với API key auth cho integrations bên thứ ba
6. **Dashboard analytics** — KPI, message volume, pipeline, sources với Chart.js
7. **Health monitoring** — Cron jobs cho health check (5 phút) và session refresh (daily)
8. **Appointment reminders** — Cron job 01:00 UTC gửi notifications qua Socket.IO
9. **Multi-tenancy** — Organization-scoped data với team-based access control
10. **Global search** — Unified search across contacts, messages, appointments

Dự án được xây dựng với tiêu chí **production-ready**, có thể deploy ngay với Docker Compose, và có kiến trúc đủ linh hoạt để mở rộng thêm nhiều tính năng CRM khác.
