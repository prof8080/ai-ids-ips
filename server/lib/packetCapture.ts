/**
 * مكتبة التقاط الحزم (Packet Capture Library)
 * تقوم بالتقاط حزم الشبكة وتحليلها واستخراج الميزات منها
 */

import { InsertPacket, InsertFeature } from "../../drizzle/schema";

/**
 * واجهة معلومات الحزمة
 */
export interface PacketInfo {
  timestamp: Date;
  sourceIp: string;
  destinationIp: string;
  sourcePort: number;
  destinationPort: number;
  protocol: string;
  payloadSize: number;
  flags?: string;
  ttl?: number;
  payload?: string;
  rawData?: string;
}

/**
 * واجهة الميزات المستخرجة
 */
export interface ExtractedFeatures {
  protocolType: string;
  duration: number;
  sourceBytes: number;
  destinationBytes: number;
  sourcePackets: number;
  destinationPackets: number;
  sourcePortCount: number;
  destinationPortCount: number;
  payloadLength: number;
  averagePayloadSize: number;
  interPacketTime: number;
  flagCounts: string;
}

/**
 * فئة معالج الحزم
 */
export class PacketProcessor {
  private packetBuffer: PacketInfo[] = [];
  private featureCache: Map<string, ExtractedFeatures> = new Map();

  /**
   * إضافة حزمة إلى المخزن المؤقت
   */
  addPacket(packet: PacketInfo): void {
    this.packetBuffer.push(packet);
    // الاحتفاظ بآخر 1000 حزمة فقط
    if (this.packetBuffer.length > 1000) {
      this.packetBuffer.shift();
    }
  }

  /**
   * تحويل معلومات الحزمة إلى سجل قاعدة بيانات
   */
  packetToDbRecord(packet: PacketInfo): InsertPacket {
    return {
      timestamp: packet.timestamp,
      sourceIp: packet.sourceIp,
      destinationIp: packet.destinationIp,
      sourcePort: packet.sourcePort,
      destinationPort: packet.destinationPort,
      protocol: packet.protocol,
      payloadSize: packet.payloadSize,
      flags: packet.flags,
      ttl: packet.ttl,
      payload: packet.payload,
      rawData: packet.rawData,
    };
  }

  /**
   * استخراج الميزات من مجموعة من الحزم
   */
  extractFeatures(packets: PacketInfo[]): ExtractedFeatures {
    if (packets.length === 0) {
      return this.getDefaultFeatures();
    }

    // حساب الميزات الأساسية
    const protocolType = packets[0].protocol;
    const sourceBytes = packets.reduce(
      (sum, p) => sum + p.payloadSize,
      0
    );
    const sourcePackets = packets.length;

    // حساب مدة الاتصال
    const duration =
      packets.length > 1
        ? (packets[packets.length - 1].timestamp.getTime() -
            packets[0].timestamp.getTime()) /
          1000
        : 0;

    // حساب عدد المنافذ الفريدة
    const uniqueSourcePorts = new Set(packets.map((p) => p.sourcePort)).size;
    const uniqueDestPorts = new Set(packets.map((p) => p.destinationPort)).size;

    // حساب متوسط حجم الحمل
    const averagePayloadSize =
      sourceBytes / sourcePackets;

    // حساب وقت الفاصل بين الحزم
    let interPacketTime = 0;
    if (packets.length > 1) {
      const times = packets.map((p) => p.timestamp.getTime());
      let totalGap = 0;
      for (let i = 1; i < times.length; i++) {
        totalGap += times[i] - times[i - 1];
      }
      interPacketTime = totalGap / (packets.length - 1);
    }

    // حساب عدد الأعلام
    const flagCounts = this.countFlags(packets);

    return {
      protocolType,
      duration: Math.round(duration),
      sourceBytes,
      destinationBytes: 0, // سيتم حسابه من البيانات الثنائية الاتجاه
      sourcePackets,
      destinationPackets: 0,
      sourcePortCount: uniqueSourcePorts,
      destinationPortCount: uniqueDestPorts,
      payloadLength: sourceBytes,
      averagePayloadSize: Math.round(averagePayloadSize * 100) / 100,
      interPacketTime: Math.round(interPacketTime * 100) / 100,
      flagCounts,
    };
  }

  /**
   * حساب عدد الأعلام في الحزم
   */
  private countFlags(packets: PacketInfo[]): string {
    const flagCount: Record<string, number> = {
      SYN: 0,
      ACK: 0,
      FIN: 0,
      RST: 0,
      PSH: 0,
      URG: 0,
    };

    packets.forEach((packet) => {
      if (packet.flags) {
        const flags = packet.flags.split(",");
        flags.forEach((flag) => {
          const trimmed = flag.trim();
          if (trimmed in flagCount) {
            flagCount[trimmed]++;
          }
        });
      }
    });

    return JSON.stringify(flagCount);
  }

  /**
   * الحصول على الميزات الافتراضية
   */
  private getDefaultFeatures(): ExtractedFeatures {
    return {
      protocolType: "unknown",
      duration: 0,
      sourceBytes: 0,
      destinationBytes: 0,
      sourcePackets: 0,
      destinationPackets: 0,
      sourcePortCount: 0,
      destinationPortCount: 0,
      payloadLength: 0,
      averagePayloadSize: 0,
      interPacketTime: 0,
      flagCounts: "{}",
    };
  }

  /**
   * تحويل الميزات إلى سجل قاعدة بيانات
   */
  featuresToDbRecord(
    features: ExtractedFeatures,
    packetId: number
  ): InsertFeature {
    return {
      packetId,
      protocolType: features.protocolType,
      duration: features.duration,
      sourceBytes: features.sourceBytes,
      destinationBytes: features.destinationBytes,
      sourcePackets: features.sourcePackets,
      destinationPackets: features.destinationPackets,
      sourcePortCount: features.sourcePortCount,
      destinationPortCount: features.destinationPortCount,
      payloadLength: features.payloadLength,
      averagePayloadSize: features.averagePayloadSize.toString(),
      interPacketTime: features.interPacketTime.toString(),
      flagCounts: features.flagCounts,
    };
  }

  /**
   * الحصول على الحزم المخزنة مؤقتًا
   */
  getBufferedPackets(): PacketInfo[] {
    return [...this.packetBuffer];
  }

  /**
   * مسح المخزن المؤقت
   */
  clearBuffer(): void {
    this.packetBuffer = [];
    this.featureCache.clear();
  }

  /**
   * الحصول على إحصائيات المخزن المؤقت
   */
  getBufferStats() {
    return {
      packetCount: this.packetBuffer.length,
      cacheSize: this.featureCache.size,
      memoryUsage: process.memoryUsage(),
    };
  }
}

/**
 * محلل البروتوكول
 */
export class ProtocolAnalyzer {
  /**
   * تحليل بروتوكول HTTP
   */
  static analyzeHTTP(payload: string): {
    method?: string;
    path?: string;
    host?: string;
    userAgent?: string;
  } {
    const result: any = {};

    // استخراج الطريقة والمسار
    const methodMatch = payload.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)/);
    if (methodMatch) {
      result.method = methodMatch[1];
      result.path = methodMatch[2];
    }

    // استخراج Host
    const hostMatch = payload.match(/Host:\s*([^\r\n]+)/i);
    if (hostMatch) {
      result.host = hostMatch[1];
    }

    // استخراج User-Agent
    const userAgentMatch = payload.match(/User-Agent:\s*([^\r\n]+)/i);
    if (userAgentMatch) {
      result.userAgent = userAgentMatch[1];
    }

    return result;
  }

  /**
   * تحليل بروتوكول DNS
   */
  static analyzeDNS(payload: string): {
    domain?: string;
    queryType?: string;
  } {
    const result: any = {};

    // استخراج اسم النطاق (بسيط)
    const domainMatch = payload.match(/([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/);
    if (domainMatch) {
      result.domain = domainMatch[1];
    }

    return result;
  }

  /**
   * تحليل بروتوكول TCP
   */
  static analyzeTCP(flags: string): {
    isSynFlood?: boolean;
    isNormalHandshake?: boolean;
    isReset?: boolean;
  } {
    const result: any = {};

    if (flags) {
      const flagArray = flags.split(",").map((f) => f.trim());
      result.isSynFlood = flagArray.includes("SYN") && !flagArray.includes("ACK");
      result.isNormalHandshake = flagArray.includes("SYN") && flagArray.includes("ACK");
      result.isReset = flagArray.includes("RST");
    }

    return result;
  }

  /**
   * الكشف عن الحزم المشبوهة
   */
  static detectSuspiciousPatterns(payload: string): string[] {
    const patterns: string[] = [];

    // الكشف عن SQL Injection
    const sqlPatterns = [
      /('|")\s*(or|and)\s*('|")?[^'"]*(=|!=|<>)/i,
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
    ];

    sqlPatterns.forEach((pattern) => {
      if (pattern.test(payload)) {
        patterns.push("sql_injection");
      }
    });

    // الكشف عن XSS
    const xssPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
    ];

    xssPatterns.forEach((pattern) => {
      if (pattern.test(payload)) {
        patterns.push("xss");
      }
    });

    // الكشف عن محاولات الوصول غير المصرح
    if (/\.\.\/|\.\.\\/.test(payload)) {
      patterns.push("path_traversal");
    }

    // الكشف عن الأوامر الخطرة
    if (/;rm\s+-rf|;cat\s+\/etc|;wget\s+|;curl\s+/.test(payload)) {
      patterns.push("command_injection");
    }

    return patterns;
  }
}

/**
 * محلل حركة المرور
 */
export class TrafficAnalyzer {
  /**
   * الكشف عن هجمات DoS/DDoS
   */
  static detectDosAttack(packets: PacketInfo[]): {
    isDosAttack: boolean;
    packetsPerSecond: number;
    uniqueSourceIps: number;
  } {
    if (packets.length === 0) {
      return {
        isDosAttack: false,
        packetsPerSecond: 0,
        uniqueSourceIps: 0,
      };
    }

    const timeRange =
      (packets[packets.length - 1].timestamp.getTime() -
        packets[0].timestamp.getTime()) /
      1000;

    const packetsPerSecond =
      timeRange > 0 ? packets.length / timeRange : 0;

    const uniqueSourceIps = new Set(
      packets.map((p) => p.sourceIp)
    ).size;

    // إذا كان هناك أكثر من 100 حزمة في الثانية، فقد يكون DoS
    const isDosAttack = packetsPerSecond > 100;

    return {
      isDosAttack,
      packetsPerSecond: Math.round(packetsPerSecond * 100) / 100,
      uniqueSourceIps,
    };
  }

  /**
   * الكشف عن Port Scan
   */
  static detectPortScan(packets: PacketInfo[]): {
    isPortScan: boolean;
    uniquePorts: number;
    targetIp?: string;
  } {
    if (packets.length === 0) {
      return {
        isPortScan: false,
        uniquePorts: 0,
      };
    }

    // جميع الحزم من نفس المصدر إلى نفس الهدف؟
    const sourceIps = new Set(packets.map((p) => p.sourceIp));
    const destIps = new Set(packets.map((p) => p.destinationIp));

    if (sourceIps.size === 1 && destIps.size === 1) {
      const uniquePorts = new Set(
        packets.map((p) => p.destinationPort)
      ).size;

      // إذا كان هناك أكثر من 10 منافذ مختلفة، قد يكون Port Scan
      const isPortScan = uniquePorts > 10;

      return {
        isPortScan,
        uniquePorts,
        targetIp: Array.from(destIps)[0],
      };
    }

    return {
      isPortScan: false,
      uniquePorts: 0,
    };
  }

  /**
   * الكشف عن Brute Force
   */
  static detectBruteForce(packets: PacketInfo[]): {
    isBruteForce: boolean;
    failedAttempts: number;
    targetPort: number;
  } {
    if (packets.length === 0) {
      return {
        isBruteForce: false,
        failedAttempts: 0,
        targetPort: 0,
      };
    }

    // عد الاتصالات المتكررة من نفس المصدر إلى نفس الهدف والمنفذ
    const connectionMap = new Map<string, number>();

    packets.forEach((packet) => {
      const key = `${packet.sourceIp}:${packet.destinationIp}:${packet.destinationPort}`;
      connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
    });

    // البحث عن أي اتصال متكرر أكثر من 10 مرات
    let maxAttempts = 0;
    let targetPort = 0;

    connectionMap.forEach((count, key) => {
      if (count > maxAttempts) {
        maxAttempts = count;
        const parts = key.split(":");
        targetPort = parseInt(parts[2]);
      }
    });

    const isBruteForce = maxAttempts > 10;

    return {
      isBruteForce,
      failedAttempts: maxAttempts,
      targetPort,
    };
  }
}

/**
 * مولد البيانات الوهمية (للاختبار)
 */
export class MockPacketGenerator {
  static generateRandomPacket(): PacketInfo {
    const protocols = ["TCP", "UDP", "ICMP"];
    const sourceIps = [
      "192.168.1.100",
      "10.0.0.50",
      "172.16.0.25",
      "192.168.1.101",
    ];
    const destIps = [
      "8.8.8.8",
      "1.1.1.1",
      "192.168.1.1",
      "10.0.0.1",
    ];

    return {
      timestamp: new Date(),
      sourceIp: sourceIps[Math.floor(Math.random() * sourceIps.length)],
      destinationIp: destIps[Math.floor(Math.random() * destIps.length)],
      sourcePort: Math.floor(Math.random() * 65535) + 1024,
      destinationPort: [22, 80, 443, 3306, 5432, 8080][
        Math.floor(Math.random() * 6)
      ],
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      payloadSize: Math.floor(Math.random() * 1500),
      flags: "SYN,ACK",
      ttl: 64,
      payload: "Sample payload",
    };
  }

  static generatePackets(count: number): PacketInfo[] {
    const packets: PacketInfo[] = [];
    for (let i = 0; i < count; i++) {
      packets.push(this.generateRandomPacket());
    }
    return packets;
  }

  static generateSQLInjectionPacket(): PacketInfo {
    return {
      timestamp: new Date(),
      sourceIp: "192.168.1.100",
      destinationIp: "192.168.1.1",
      sourcePort: 12345,
      destinationPort: 80,
      protocol: "TCP",
      payloadSize: 200,
      flags: "PSH,ACK",
      ttl: 64,
      payload: "GET /search?q=' OR '1'='1 HTTP/1.1",
    };
  }

  static generateXSSPacket(): PacketInfo {
    return {
      timestamp: new Date(),
      sourceIp: "192.168.1.100",
      destinationIp: "192.168.1.1",
      sourcePort: 12345,
      destinationPort: 80,
      protocol: "TCP",
      payloadSize: 150,
      flags: "PSH,ACK",
      ttl: 64,
      payload: "<script>alert('XSS')</script>",
    };
  }

  static generateDosPackets(count: number = 100): PacketInfo[] {
    const packets: PacketInfo[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      packets.push({
        timestamp: new Date(now.getTime() + i * 10), // 10ms apart
        sourceIp: "192.168.1.100",
        destinationIp: "192.168.1.1",
        sourcePort: 12345 + i,
        destinationPort: 80,
        protocol: "TCP",
        payloadSize: Math.floor(Math.random() * 1500),
        flags: "SYN",
        ttl: 64,
      });
    }

    return packets;
  }
}
