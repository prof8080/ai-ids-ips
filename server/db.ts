import { eq, desc, and, gte, lte, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  packets,
  threats,
  alerts,
  detectionRules,
  mlModels,
  statistics,
  logs,
  settings,
  monitoredDevices,
  policies,
  features,
  InsertPacket,
  InsertThreat,
  InsertAlert,
  InsertFeature,
  Threat,
  Alert,
  Packet,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * ==================== المستخدمون ====================
 */

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * ==================== الحزم ====================
 */

export async function insertPacket(packet: InsertPacket) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(packets).values(packet);
  return result;
}

export async function getPackets(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(packets)
    .orderBy(desc(packets.timestamp))
    .limit(limit)
    .offset(offset);
}

export async function getPacketsByIp(sourceIp: string, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(packets)
    .where(or(eq(packets.sourceIp, sourceIp), eq(packets.destinationIp, sourceIp)))
    .orderBy(desc(packets.timestamp))
    .limit(limit);
}

export async function getPacketCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ count: packets.id })
    .from(packets);
  return result[0]?.count || 0;
}

/**
 * ==================== الميزات ====================
 */

export async function insertFeature(feature: InsertFeature) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(features).values(feature);
}

export async function getFeaturesByPacketId(packetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(features)
    .where(eq(features.packetId, packetId));
}

/**
 * ==================== التهديدات ====================
 */

export async function insertThreat(threat: InsertThreat) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(threats).values(threat);
  return result;
}

export async function getThreats(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(threats)
    .orderBy(desc(threats.timestamp))
    .limit(limit)
    .offset(offset);
}

export async function getThreatsBySeverity(severity: string, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(threats)
    .where(eq(threats.severity, severity as any))
    .orderBy(desc(threats.timestamp))
    .limit(limit);
}

export async function getThreatsByType(threatType: string, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(threats)
    .where(eq(threats.threatType, threatType as any))
    .orderBy(desc(threats.timestamp))
    .limit(limit);
}

export async function getThreatCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ count: threats.id })
    .from(threats);
  return result[0]?.count || 0;
}

export async function updateThreatStatus(threatId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(threats)
    .set({ status: status as any })
    .where(eq(threats.id, threatId));
}

/**
 * ==================== التنبيهات ====================
 */

export async function insertAlert(alert: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(alerts).values(alert);
}

export async function getAlerts(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(alerts)
    .orderBy(desc(alerts.timestamp))
    .limit(limit)
    .offset(offset);
}

export async function getNewAlerts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(alerts)
    .where(eq(alerts.status, "new"))
    .orderBy(desc(alerts.timestamp));
}

export async function updateAlertStatus(alertId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(alerts)
    .set({ status: status as any })
    .where(eq(alerts.id, alertId));
}

export async function getAlertCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ count: alerts.id })
    .from(alerts);
  return result[0]?.count || 0;
}

/**
 * ==================== قواعد الكشف ====================
 */

export async function insertDetectionRule(rule: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(detectionRules).values(rule);
}

export async function getDetectionRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(detectionRules)
    .where(eq(detectionRules.enabled, true));
}

export async function getDetectionRulesByType(threatType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(detectionRules)
    .where(
      and(
        eq(detectionRules.threatType, threatType),
        eq(detectionRules.enabled, true)
      )
    );
}

/**
 * ==================== نماذج الذكاء الاصطناعي ====================
 */

export async function insertMLModel(model: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(mlModels).values(model);
}

export async function getActiveMLModels() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(mlModels)
    .where(eq(mlModels.status, "active"));
}

export async function getMLModelByName(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(mlModels)
    .where(eq(mlModels.name, name))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * ==================== الإحصائيات ====================
 */

export async function insertStatistic(stat: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(statistics).values(stat);
}

export async function getLatestStatistics() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(statistics)
    .orderBy(desc(statistics.period))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getStatisticsByPeriod(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(statistics)
    .where(
      and(
        gte(statistics.period, startDate),
        lte(statistics.period, endDate)
      )
    )
    .orderBy(desc(statistics.period));
}

/**
 * ==================== السجلات ====================
 */

export async function insertLog(log: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(logs).values(log);
}

export async function getLogs(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(logs)
    .orderBy(desc(logs.timestamp))
    .limit(limit)
    .offset(offset);
}

/**
 * ==================== الإعدادات ====================
 */

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function setSetting(key: string, value: string, type: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getSetting(key);
  if (existing) {
    return await db
      .update(settings)
      .set({ value })
      .where(eq(settings.key, key));
  } else {
    return await db.insert(settings).values({ key, value, type: type as any });
  }
}

/**
 * ==================== الأجهزة المراقبة ====================
 */

export async function insertMonitoredDevice(device: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(monitoredDevices).values(device);
}

export async function getMonitoredDevices() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(monitoredDevices)
    .where(eq(monitoredDevices.status, "active"));
}

export async function updateDeviceLastSeen(deviceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(monitoredDevices)
    .set({ lastSeen: new Date() })
    .where(eq(monitoredDevices.id, deviceId));
}

/**
 * ==================== السياسات ====================
 */

export async function insertPolicy(policy: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(policies).values(policy);
}

export async function getActivePolicies() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(policies)
    .where(eq(policies.enabled, true))
    .orderBy(desc(policies.priority));
}
