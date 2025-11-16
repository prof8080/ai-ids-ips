import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import {
  PacketProcessor,
  ProtocolAnalyzer,
  TrafficAnalyzer,
  MockPacketGenerator,
  PacketInfo,
} from "./lib/packetCapture";
import {
  HybridDetectionEngine,
  DetectionEngineManager,
} from "./lib/detectionEngine";
import { ModelManager } from "./lib/mlModels";
import { z } from "zod";

// إنشاء مثيلات من الفئات
const packetProcessor = new PacketProcessor();
const detectionManager = new DetectionEngineManager();
const modelManager = new ModelManager();

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * ==================== إجراءات الحزم ====================
   */
  packets: router({
    /**
     * الحصول على قائمة الحزم
     */
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(100),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const packets = await db.getPackets(input.limit, input.offset);
        const count = await db.getPacketCount();
        return {
          packets,
          total: count,
          limit: input.limit,
          offset: input.offset,
        };
      }),

    /**
     * الحصول على الحزم من عنوان IP معين
     */
    getByIp: protectedProcedure
      .input(z.object({ ip: z.string() }))
      .query(async ({ input }) => {
        return await db.getPacketsByIp(input.ip);
      }),

    /**
     * إضافة حزمة جديدة
     */
    create: protectedProcedure
      .input(
        z.object({
          sourceIp: z.string(),
          destinationIp: z.string(),
          sourcePort: z.number(),
          destinationPort: z.number(),
          protocol: z.string(),
          payloadSize: z.number(),
          payload: z.string().optional(),
          flags: z.string().optional(),
          ttl: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const packet: PacketInfo = {
          timestamp: new Date(),
          ...input,
        };

        // معالجة الحزمة
        packetProcessor.addPacket(packet);

        // تخزين في قاعدة البيانات
        const dbRecord = packetProcessor.packetToDbRecord(packet);
        await db.insertPacket(dbRecord);

        // الكشف عن التهديدات
        const threatResult = detectionManager.detect(packet);

        return {
          success: true,
          packetId: Math.floor(Math.random() * 1000000),
          threatDetected: threatResult?.threatDetected || false,
          threat: threatResult,
        };
      }),

    /**
     * الحصول على إحصائيات الحزم
     */
    stats: protectedProcedure.query(async () => {
      const count = await db.getPacketCount();
      const bufferStats = packetProcessor.getBufferStats();

      return {
        totalPackets: count,
        bufferedPackets: bufferStats.packetCount,
        cacheSize: bufferStats.cacheSize,
      };
    }),
  }),

  /**
   * ==================== إجراءات التهديدات ====================
   */
  threats: router({
    /**
     * الحصول على قائمة التهديدات
     */
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(100),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const threats = await db.getThreats(input.limit, input.offset);
        const count = await db.getThreatCount();
        return {
          threats,
          total: count,
          limit: input.limit,
          offset: input.offset,
        };
      }),

    /**
     * الحصول على التهديدات حسب النوع
     */
    getByType: protectedProcedure
      .input(z.object({ threatType: z.string() }))
      .query(async ({ input }) => {
        return await db.getThreatsByType(input.threatType);
      }),

    /**
     * الحصول على التهديدات حسب الخطورة
     */
    getBySeverity: protectedProcedure
      .input(z.object({ severity: z.string() }))
      .query(async ({ input }) => {
        return await db.getThreatsBySeverity(input.severity);
      }),

    /**
     * تحديث حالة التهديد
     */
    updateStatus: protectedProcedure
      .input(
        z.object({
          threatId: z.number(),
          status: z.enum(["new", "investigating", "confirmed", "false_positive", "resolved"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateThreatStatus(input.threatId, input.status);
        return { success: true };
      }),

    /**
     * الحصول على إحصائيات التهديدات
     */
    stats: protectedProcedure.query(async () => {
      const count = await db.getThreatCount();
      const stats = detectionManager.getStatistics();

      return {
        totalThreats: count,
        detectionStats: stats,
      };
    }),
  }),

  /**
   * ==================== إجراءات التنبيهات ====================
   */
  alerts: router({
    /**
     * الحصول على قائمة التنبيهات
     */
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(100),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const alerts = await db.getAlerts(input.limit, input.offset);
        const count = await db.getAlertCount();
        return {
          alerts,
          total: count,
          limit: input.limit,
          offset: input.offset,
        };
      }),

    /**
     * الحصول على التنبيهات الجديدة
     */
    getNew: protectedProcedure.query(async () => {
      return await db.getNewAlerts();
    }),

    /**
     * تحديث حالة التنبيه
     */
    updateStatus: protectedProcedure
      .input(
        z.object({
          alertId: z.number(),
          status: z.enum(["new", "acknowledged", "resolved"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateAlertStatus(input.alertId, input.status);
        return { success: true };
      }),

    /**
     * الحصول على عدد التنبيهات الجديدة
     */
    newCount: protectedProcedure.query(async () => {
      const newAlerts = await db.getNewAlerts();
      return { count: newAlerts.length };
    }),
  }),

  /**
   * ==================== إجراءات الكشف ====================
   */
  detection: router({
    /**
     * الكشف عن التهديدات في حزمة واحدة
     */
    detectPacket: protectedProcedure
      .input(
        z.object({
          sourceIp: z.string(),
          destinationIp: z.string(),
          sourcePort: z.number(),
          destinationPort: z.number(),
          protocol: z.string(),
          payloadSize: z.number(),
          payload: z.string().optional(),
          flags: z.string().optional(),
          ttl: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const packet: PacketInfo = {
          timestamp: new Date(),
          ...input,
        };

        const result = detectionManager.detect(packet);

        return {
          threatDetected: result?.threatDetected || false,
          threat: result,
        };
      }),

    /**
     * الكشف عن DoS/DDoS
     */
    detectDos: protectedProcedure.query(async () => {
      const packets = packetProcessor.getBufferedPackets();
      const result = TrafficAnalyzer.detectDosAttack(packets);

      return {
        isDosAttack: result.isDosAttack,
        packetsPerSecond: result.packetsPerSecond,
        uniqueSourceIps: result.uniqueSourceIps,
      };
    }),

    /**
     * الكشف عن Port Scan
     */
    detectPortScan: protectedProcedure.query(async () => {
      const packets = packetProcessor.getBufferedPackets();
      const result = TrafficAnalyzer.detectPortScan(packets);

      return {
        isPortScan: result.isPortScan,
        uniquePorts: result.uniquePorts,
        targetIp: result.targetIp,
      };
    }),

    /**
     * الكشف عن Brute Force
     */
    detectBruteForce: protectedProcedure.query(async () => {
      const packets = packetProcessor.getBufferedPackets();
      const result = TrafficAnalyzer.detectBruteForce(packets);

      return {
        isBruteForce: result.isBruteForce,
        failedAttempts: result.failedAttempts,
        targetPort: result.targetPort,
      };
    }),

    /**
     * الحصول على سجل الكشف
     */
    history: protectedProcedure.query(async () => {
      return detectionManager.getHistory();
    }),

    /**
     * الحصول على إحصائيات الكشف
     */
    stats: protectedProcedure.query(async () => {
      return detectionManager.getStatistics();
    }),
  }),

  /**
   * ==================== إجراءات نماذج الذكاء الاصطناعي ====================
   */
  models: router({
    /**
     * التنبؤ باستخدام Random Forest
     */
    predictRandomForest: protectedProcedure
      .input(z.object({ features: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        try {
          const result = modelManager.predictRandomForest(input.features);
          return {
            success: true,
            prediction: result,
          };
        } catch (error) {
          return {
            success: false,
            error: "Model not trained",
          };
        }
      }),

    /**
     * التنبؤ باستخدام Neural Network
     */
    predictNeuralNetwork: protectedProcedure
      .input(z.object({ features: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        try {
          const result = modelManager.predictNeuralNetwork(input.features);
          return {
            success: true,
            prediction: result,
          };
        } catch (error) {
          return {
            success: false,
            error: "Model not trained",
          };
        }
      }),

    /**
     * التنبؤ باستخدام Ensemble
     */
    predictEnsemble: protectedProcedure
      .input(z.object({ features: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        try {
          const result = modelManager.predictEnsemble(input.features);
          return {
            success: true,
            prediction: result,
          };
        } catch (error) {
          return {
            success: false,
            error: "Model not trained",
          };
        }
      }),
  }),

  /**
   * ==================== إجراءات الإحصائيات ====================
   */
  statistics: router({
    /**
     * الحصول على أحدث الإحصائيات
     */
    latest: protectedProcedure.query(async () => {
      return await db.getLatestStatistics();
    }),

    /**
     * الحصول على الإحصائيات حسب الفترة الزمنية
     */
    byPeriod: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await db.getStatisticsByPeriod(input.startDate, input.endDate);
      }),

    /**
     * الحصول على ملخص الإحصائيات
     */
    summary: protectedProcedure.query(async () => {
      const packetCount = await db.getPacketCount();
      const threatCount = await db.getThreatCount();
      const alertCount = await db.getAlertCount();
      const detectionStats = detectionManager.getStatistics();

      return {
        packetCount,
        threatCount,
        alertCount,
        detectionStats,
      };
    }),
  }),

  /**
   * ==================== إجراءات الأجهزة المراقبة ====================
   */
  devices: router({
    /**
     * الحصول على قائمة الأجهزة المراقبة
     */
    list: protectedProcedure.query(async () => {
      return await db.getMonitoredDevices();
    }),

    /**
     * إضافة جهاز جديد
     */
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          ipAddress: z.string(),
          macAddress: z.string().optional(),
          networkInterface: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.insertMonitoredDevice(input);
        return {
          success: true,
          deviceId: Math.floor(Math.random() * 1000000),
        };
      }),
  }),

  /**
   * ==================== إجراءات الاختبار ====================
   */
  testing: router({
    /**
     * توليد حزم وهمية
     */
    generatePackets: protectedProcedure
      .input(z.object({ count: z.number().default(10) }))
      .mutation(async ({ input }) => {
        const packets = MockPacketGenerator.generatePackets(input.count);

        for (const packet of packets) {
          packetProcessor.addPacket(packet);
          const dbRecord = packetProcessor.packetToDbRecord(packet);
          await db.insertPacket(dbRecord);
        }

        return {
          success: true,
          count: packets.length,
        };
      }),

    /**
     * توليد حزمة SQL Injection
     */
    generateSQLInjection: protectedProcedure.mutation(async () => {
      const packet = MockPacketGenerator.generateSQLInjectionPacket();
      packetProcessor.addPacket(packet);
      const dbRecord = packetProcessor.packetToDbRecord(packet);
      await db.insertPacket(dbRecord);

      const threatResult = detectionManager.detect(packet);

      return {
        success: true,
        packetId: Math.floor(Math.random() * 1000000),
        threatDetected: threatResult?.threatDetected || false,
        threat: threatResult,
      };
    }),

    /**
     * توليد حزمة XSS
     */
    generateXSS: protectedProcedure.mutation(async () => {
      const packet = MockPacketGenerator.generateXSSPacket();
      packetProcessor.addPacket(packet);
      const dbRecord = packetProcessor.packetToDbRecord(packet);
      await db.insertPacket(dbRecord);

      const threatResult = detectionManager.detect(packet);

      return {
        success: true,
        packetId: Math.floor(Math.random() * 1000000),
        threatDetected: threatResult?.threatDetected || false,
        threat: threatResult,
      };
    }),

    /**
     * توليد حزم DoS
     */
    generateDoS: protectedProcedure
      .input(z.object({ count: z.number().default(100) }))
      .mutation(async ({ input }) => {
        const packets = MockPacketGenerator.generateDosPackets(input.count);

        for (const packet of packets) {
          packetProcessor.addPacket(packet);
          const dbRecord = packetProcessor.packetToDbRecord(packet);
          await db.insertPacket(dbRecord);
        }

        const dosResult = TrafficAnalyzer.detectDosAttack(packets);

        return {
          success: true,
          count: packets.length,
          isDosAttack: dosResult.isDosAttack,
          packetsPerSecond: dosResult.packetsPerSecond,
        };
      }),

    /**
     * الحصول على حالة النظام
     */
    systemStatus: protectedProcedure.query(async () => {
      const packetCount = await db.getPacketCount();
      const threatCount = await db.getThreatCount();
      const alertCount = await db.getAlertCount();
      const bufferStats = packetProcessor.getBufferStats();

      return {
        packetCount,
        threatCount,
        alertCount,
        bufferStats,
        timestamp: new Date(),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
