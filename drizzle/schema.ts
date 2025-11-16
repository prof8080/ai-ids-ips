import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  datetime,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

/**
 * جدول المستخدمين - يدعم المصادقة عبر Manus OAuth
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * جدول الحزم المقبوضة (Captured Packets)
 * يخزن معلومات الحزم المقبوضة من حركة المرور
 */
export const packets = mysqlTable("packets", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  timestamp: datetime("timestamp").notNull(),
  sourceIp: varchar("sourceIp", { length: 45 }).notNull(), // IPv4 و IPv6
  destinationIp: varchar("destinationIp", { length: 45 }).notNull(),
  sourcePort: int("sourcePort").notNull(),
  destinationPort: int("destinationPort").notNull(),
  protocol: varchar("protocol", { length: 10 }).notNull(), // TCP, UDP, ICMP
  payloadSize: int("payloadSize").notNull(),
  flags: varchar("flags", { length: 50 }), // TCP flags
  ttl: int("ttl"),
  payload: text("payload"), // البيانات المرسلة (محدودة)
  rawData: text("rawData"), // البيانات الخام بصيغة hex
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Packet = typeof packets.$inferSelect;
export type InsertPacket = typeof packets.$inferInsert;

/**
 * جدول الميزات المستخرجة (Extracted Features)
 * يخزن الميزات المستخرجة من الحزم للتحليل بالذكاء الاصطناعي
 */
export const features = mysqlTable("features", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  packetId: bigint("packetId", { mode: "number" }).notNull(),
  
  // ميزات أساسية
  protocolType: varchar("protocolType", { length: 20 }).notNull(),
  duration: int("duration"),
  sourceBytes: int("sourceBytes"),
  destinationBytes: int("destinationBytes"),
  
  // ميزات الحركة
  sourcePackets: int("sourcePackets"),
  destinationPackets: int("destinationPackets"),
  
  // ميزات الاتصال
  sourcePortCount: int("sourcePortCount"),
  destinationPortCount: int("destinationPortCount"),
  
  // ميزات الحمل
  payloadLength: int("payloadLength"),
  averagePayloadSize: decimal("averagePayloadSize", { precision: 10, scale: 2 }),
  
  // ميزات الوقت
  interPacketTime: decimal("interPacketTime", { precision: 10, scale: 2 }),
  
  // ميزات إحصائية
  flagCounts: varchar("flagCounts", { length: 255 }), // JSON string
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Feature = typeof features.$inferSelect;
export type InsertFeature = typeof features.$inferInsert;

/**
 * جدول التهديدات المكتشفة (Detected Threats)
 * يخزن جميع التهديدات والهجمات المكتشفة
 */
export const threats = mysqlTable("threats", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  packetId: bigint("packetId", { mode: "number" }).notNull(),
  
  // معلومات التهديد
  threatType: mysqlEnum("threatType", [
    "sql_injection",
    "xss",
    "brute_force",
    "dos",
    "ddos",
    "port_scan",
    "anomaly",
    "malware",
    "unauthorized_access",
    "data_exfiltration",
  ]).notNull(),
  
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(), // 0-100
  
  // معلومات الهجوم
  sourceIp: varchar("sourceIp", { length: 45 }).notNull(),
  destinationIp: varchar("destinationIp", { length: 45 }).notNull(),
  sourcePort: int("sourcePort"),
  destinationPort: int("destinationPort"),
  
  // التفاصيل
  description: text("description"),
  payload: text("payload"), // الحمل المشبوه
  detectionMethod: varchar("detectionMethod", { length: 50 }).notNull(), // signature, anomaly, hybrid
  
  // الحالة
  status: mysqlEnum("status", ["new", "investigating", "confirmed", "false_positive", "resolved"]).default("new").notNull(),
  
  // الميتاداتا
  metadata: text("metadata"), // JSON string
  
  timestamp: datetime("timestamp").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Threat = typeof threats.$inferSelect;
export type InsertThreat = typeof threats.$inferInsert;

/**
 * جدول التنبيهات (Alerts)
 * يخزن التنبيهات المرسلة للمسؤولين
 */
export const alerts = mysqlTable("alerts", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  threatId: bigint("threatId", { mode: "number" }).notNull(),
  
  // معلومات التنبيه
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // الأولوية
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull(),
  
  // الحالة
  status: mysqlEnum("alertStatus", ["new", "acknowledged", "resolved"]).default("new").notNull(),
  
  // المستقبل
  recipientUserId: int("recipientUserId"),
  
  // الإجراءات المتخذة
  actionTaken: text("actionTaken"),
  actionTimestamp: datetime("actionTimestamp"),
  
  timestamp: datetime("timestamp").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * جدول قواعد الكشف (Detection Rules)
 * يخزن قواعد التوقيع للكشف عن الهجمات المعروفة
 */
export const detectionRules = mysqlTable("detectionRules", {
  id: int("id").autoincrement().primaryKey(),
  
  // معلومات القاعدة
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // نوع الهجوم
  threatType: varchar("threatType", { length: 50 }).notNull(),
  
  // القاعدة
  pattern: text("pattern").notNull(), // regex or pattern
  patternType: mysqlEnum("patternType", ["regex", "signature", "yara", "custom"]).notNull(),
  
  // الأولوية والثقة
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  
  // الحالة
  enabled: boolean("enabled").default(true).notNull(),
  
  // الميتاداتا
  source: varchar("source", { length: 100 }), // OWASP, NIST, Custom
  reference: text("reference"), // URL للمرجع
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DetectionRule = typeof detectionRules.$inferSelect;
export type InsertDetectionRule = typeof detectionRules.$inferInsert;

/**
 * جدول نماذج الذكاء الاصطناعي (ML Models)
 * يخزن معلومات النماذج المدربة والمستخدمة
 */
export const mlModels = mysqlTable("mlModels", {
  id: int("id").autoincrement().primaryKey(),
  
  // معلومات النموذج
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // نوع النموذج
  modelType: mysqlEnum("modelType", [
    "random_forest",
    "neural_network",
    "svm",
    "isolation_forest",
    "hybrid",
  ]).notNull(),
  
  // الأداء
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  precision: decimal("precision", { precision: 5, scale: 2 }),
  recall: decimal("recall", { precision: 5, scale: 2 }),
  f1Score: decimal("f1Score", { precision: 5, scale: 2 }),
  
  // الحالة
  status: mysqlEnum("modelStatus", ["training", "active", "inactive", "deprecated"]).default("inactive").notNull(),
  
  // المسار
  modelPath: varchar("modelPath", { length: 500 }),
  
  // البيانات المستخدمة في التدريب
  trainingDataset: varchar("trainingDataset", { length: 100 }),
  trainingDate: datetime("trainingDate"),
  
  // الإصدار
  version: varchar("version", { length: 20 }).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MLModel = typeof mlModels.$inferSelect;
export type InsertMLModel = typeof mlModels.$inferInsert;

/**
 * جدول الإحصائيات (Statistics)
 * يخزن الإحصائيات الدورية للنظام
 */
export const statistics = mysqlTable("statistics", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  
  // الفترة الزمنية
  period: datetime("period").notNull(),
  
  // الإحصائيات
  totalPackets: int("totalPackets").notNull(),
  totalThreats: int("totalThreats").notNull(),
  totalAlerts: int("totalAlerts").notNull(),
  
  // توزيع التهديدات
  sqlInjectionCount: int("sqlInjectionCount").default(0).notNull(),
  xssCount: int("xssCount").default(0).notNull(),
  bruteForceCount: int("bruteForceCount").default(0).notNull(),
  dosCount: int("dosCount").default(0).notNull(),
  ddosCount: int("ddosCount").default(0).notNull(),
  portScanCount: int("portScanCount").default(0).notNull(),
  anomalyCount: int("anomalyCount").default(0).notNull(),
  
  // توزيع الخطورة
  lowSeverity: int("lowSeverity").default(0).notNull(),
  mediumSeverity: int("mediumSeverity").default(0).notNull(),
  highSeverity: int("highSeverity").default(0).notNull(),
  criticalSeverity: int("criticalSeverity").default(0).notNull(),
  
  // معدلات الأداء
  detectionRate: decimal("detectionRate", { precision: 5, scale: 2 }),
  falsePositiveRate: decimal("falsePositiveRate", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Statistic = typeof statistics.$inferSelect;
export type InsertStatistic = typeof statistics.$inferInsert;

/**
 * جدول السجلات (Logs)
 * يخزن سجلات جميع الأنشطة والأحداث
 */
export const logs = mysqlTable("logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  
  // معلومات السجل
  level: mysqlEnum("logLevel", ["debug", "info", "warning", "error", "critical"]).notNull(),
  message: text("message").notNull(),
  
  // السياق
  component: varchar("component", { length: 100 }),
  action: varchar("action", { length: 100 }),
  
  // المستخدم
  userId: int("userId"),
  
  // البيانات الإضافية
  metadata: text("metadata"), // JSON string
  
  timestamp: datetime("timestamp").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Log = typeof logs.$inferSelect;
export type InsertLog = typeof logs.$inferInsert;

/**
 * جدول الإعدادات (Settings)
 * يخزن إعدادات النظام والتكوينات
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  
  // المفتاح والقيمة
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  
  // النوع
  type: mysqlEnum("settingType", ["string", "number", "boolean", "json"]).notNull(),
  
  // الوصف
  description: text("description"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

/**
 * جدول الأجهزة المراقبة (Monitored Devices)
 * يخزن معلومات الأجهزة والشبكات المراقبة
 */
export const monitoredDevices = mysqlTable("monitoredDevices", {
  id: int("id").autoincrement().primaryKey(),
  
  // معلومات الجهاز
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // الشبكة
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
  macAddress: varchar("macAddress", { length: 17 }),
  networkInterface: varchar("networkInterface", { length: 50 }),
  
  // الحالة
  status: mysqlEnum("deviceStatus", ["active", "inactive", "offline"]).default("active").notNull(),
  
  // الإحصائيات
  lastSeen: datetime("lastSeen"),
  packetsMonitored: bigint("packetsMonitored", { mode: "number" }).default(0).notNull(),
  threatsDetected: int("threatsDetected").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonitoredDevice = typeof monitoredDevices.$inferSelect;
export type InsertMonitoredDevice = typeof monitoredDevices.$inferInsert;

/**
 * جدول السياسات (Policies)
 * يخزن سياسات الكشف والاستجابة
 */
export const policies = mysqlTable("policies", {
  id: int("id").autoincrement().primaryKey(),
  
  // معلومات السياسة
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // القواعد
  rules: text("rules"), // JSON string
  
  // الإجراءات
  actions: text("actions"), // JSON string - الإجراءات المتخذة عند الكشف
  
  // الحالة
  enabled: boolean("enabled").default(true).notNull(),
  
  // الأولوية
  priority: int("priority").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = typeof policies.$inferInsert;
