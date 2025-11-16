/**
 * محرك الكشف عن الهجمات (Detection Engine)
 * يدعم ثلاث طرق للكشف: التوقيع، الشذوذ، والهجين
 */

import { PacketInfo, ProtocolAnalyzer, TrafficAnalyzer } from "./packetCapture";

/**
 * واجهة نتيجة الكشف
 */
export interface DetectionResult {
  threatDetected: boolean;
  threatType: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  detectionMethod: "signature" | "anomaly" | "hybrid";
  payload?: string;
  metadata?: Record<string, any>;
}

/**
 * واجهة قاعدة الكشف
 */
export interface DetectionRule {
  id: string;
  name: string;
  threatType: string;
  pattern: string | RegExp;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  enabled: boolean;
}

/**
 * محرك الكشف بناءً على التوقيع (Signature-based Detection)
 */
export class SignatureDetectionEngine {
  private rules: Map<string, DetectionRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * تهيئة القواعس الافتراضية
   */
  private initializeDefaultRules(): void {
    const defaultRules: DetectionRule[] = [
      // قواعس SQL Injection
      {
        id: "sql_injection_1",
        name: "SQL Injection - Union Select",
        threatType: "sql_injection",
        pattern: /union\s+select/i,
        severity: "high",
        confidence: 85,
        enabled: true,
      },
      {
        id: "sql_injection_2",
        name: "SQL Injection - OR Condition",
        threatType: "sql_injection",
        pattern: /('|")\s*(or|and)\s*('|")?[^'"]*(=|!=|<>)/i,
        severity: "high",
        confidence: 80,
        enabled: true,
      },
      {
        id: "sql_injection_3",
        name: "SQL Injection - DROP TABLE",
        threatType: "sql_injection",
        pattern: /drop\s+table/i,
        severity: "critical",
        confidence: 95,
        enabled: true,
      },
      {
        id: "sql_injection_4",
        name: "SQL Injection - DELETE FROM",
        threatType: "sql_injection",
        pattern: /delete\s+from/i,
        severity: "critical",
        confidence: 90,
        enabled: true,
      },

      // قواعس XSS
      {
        id: "xss_1",
        name: "XSS - Script Tag",
        threatType: "xss",
        pattern: /<script[^>]*>/i,
        severity: "high",
        confidence: 90,
        enabled: true,
      },
      {
        id: "xss_2",
        name: "XSS - JavaScript Protocol",
        threatType: "xss",
        pattern: /javascript:/i,
        severity: "high",
        confidence: 85,
        enabled: true,
      },
      {
        id: "xss_3",
        name: "XSS - Event Handler",
        threatType: "xss",
        pattern: /on\w+\s*=/i,
        severity: "high",
        confidence: 80,
        enabled: true,
      },
      {
        id: "xss_4",
        name: "XSS - IFrame",
        threatType: "xss",
        pattern: /<iframe[^>]*>/i,
        severity: "medium",
        confidence: 75,
        enabled: true,
      },

      // قواعس Path Traversal
      {
        id: "path_traversal_1",
        name: "Path Traversal - Directory Escape",
        threatType: "path_traversal",
        pattern: /\.\.\/|\.\.\\|\.\.%2f|\.\.%5c/i,
        severity: "high",
        confidence: 85,
        enabled: true,
      },

      // قواعس Command Injection
      {
        id: "command_injection_1",
        name: "Command Injection - RM",
        threatType: "command_injection",
        pattern: /;rm\s+-rf|;\s*rm\s+-rf/i,
        severity: "critical",
        confidence: 95,
        enabled: true,
      },
      {
        id: "command_injection_2",
        name: "Command Injection - CAT",
        threatType: "command_injection",
        pattern: /;cat\s+\/etc|;\s*cat\s+\/etc/i,
        severity: "critical",
        confidence: 90,
        enabled: true,
      },
      {
        id: "command_injection_3",
        name: "Command Injection - WGET",
        threatType: "command_injection",
        pattern: /;wget\s+|;\s*wget\s+/i,
        severity: "high",
        confidence: 85,
        enabled: true,
      },

      // قواعس XXE (XML External Entity)
      {
        id: "xxe_1",
        name: "XXE - DOCTYPE Declaration",
        threatType: "xxe",
        pattern: /<!DOCTYPE[^>]*\[<!ENTITY/i,
        severity: "high",
        confidence: 85,
        enabled: true,
      },

      // قواعس LDAP Injection
      {
        id: "ldap_injection_1",
        name: "LDAP Injection - Wildcard",
        threatType: "ldap_injection",
        pattern: /\*\)\(\|/i,
        severity: "medium",
        confidence: 75,
        enabled: true,
      },
    ];

    defaultRules.forEach((rule) => {
      this.addRule(rule);
    });
  }

  /**
   * إضافة قاعدة جديدة
   */
  addRule(rule: DetectionRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * إزالة قاعدة
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * تفعيل/تعطيل قاعدة
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * الكشف عن التهديدات بناءً على التوقيع
   */
  detect(packet: PacketInfo): DetectionResult | null {
    const payload = packet.payload || "";

    for (const rule of Array.from(this.rules.values())) {
      if (!rule.enabled) continue;

      const pattern =
        typeof rule.pattern === "string"
          ? new RegExp(rule.pattern, "i")
          : rule.pattern;

      if (pattern.test(payload)) {
        return {
          threatDetected: true,
          threatType: rule.threatType,
          severity: rule.severity,
          confidence: rule.confidence,
          description: rule.name,
          detectionMethod: "signature",
          payload: payload.substring(0, 500), // الحد من طول الحمل
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
          },
        };
      }
    }

    return null;
  }

  /**
   * الحصول على جميع القواعس
   */
  getRules(): DetectionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * الحصول على القواعس المفعلة
   */
  getEnabledRules(): DetectionRule[] {
    return Array.from(this.rules.values()).filter((r) => r.enabled);
  }
}

/**
 * محرك الكشف بناءً على الشذوذ (Anomaly Detection Engine)
 */
export class AnomalyDetectionEngine {
  private baselineStats: Map<string, any> = new Map();
  private threshold: number = 2.0; // الانحراف المعياري

  /**
   * تعيين خط الأساس (Baseline)
   */
  setBaseline(key: string, stats: any): void {
    this.baselineStats.set(key, stats);
  }

  /**
   * حساب درجة الشذوذ
   */
  calculateAnomalyScore(
    currentValue: number,
    mean: number,
    stdDev: number
  ): number {
    if (stdDev === 0) return 0;
    return Math.abs((currentValue - mean) / stdDev);
  }

  /**
   * الكشف عن الشذوذ في الحزم
   */
  detectAnomaly(packet: PacketInfo): DetectionResult | null {
    // الكشف عن حجم الحمل غير الطبيعي
    const payloadSizeAnomaly = this.detectPayloadSizeAnomaly(packet);
    if (payloadSizeAnomaly) return payloadSizeAnomaly;

    // الكشف عن أنماط المنافذ غير الطبيعية
    const portAnomaly = this.detectPortAnomaly(packet);
    if (portAnomaly) return portAnomaly;

    // الكشف عن أنماط البروتوكول غير الطبيعية
    const protocolAnomaly = this.detectProtocolAnomaly(packet);
    if (protocolAnomaly) return protocolAnomaly;

    return null;
  }

  /**
   * الكشف عن حجم الحمل غير الطبيعي
   */
  private detectPayloadSizeAnomaly(packet: PacketInfo): DetectionResult | null {
    // إذا كان حجم الحمل أكبر من 10000 بايت، قد يكون شذوذ
    if (packet.payloadSize > 10000) {
      return {
        threatDetected: true,
        threatType: "anomaly",
        severity: "medium",
        confidence: 65,
        description: "Unusual payload size detected",
        detectionMethod: "anomaly",
        metadata: {
          payloadSize: packet.payloadSize,
          expectedSize: "< 1500",
        },
      };
    }

    return null;
  }

  /**
   * الكشف عن أنماط المنافذ غير الطبيعية
   */
  private detectPortAnomaly(packet: PacketInfo): DetectionResult | null {
    // المنافذ المشبوهة
    const suspiciousPorts = [
      666, 1337, 4444, 5555, 6666, 7777, 8888, 9999, 31337, 65432,
    ];

    if (suspiciousPorts.includes(packet.destinationPort)) {
      return {
        threatDetected: true,
        threatType: "anomaly",
        severity: "medium",
        confidence: 70,
        description: "Connection to suspicious port detected",
        detectionMethod: "anomaly",
        metadata: {
          port: packet.destinationPort,
          reason: "Known malicious port",
        },
      };
    }

    return null;
  }

  /**
   * الكشف عن أنماط البروتوكول غير الطبيعية
   */
  private detectProtocolAnomaly(packet: PacketInfo): DetectionResult | null {
    // استخدام ICMP على منفذ HTTP
    if (packet.protocol === "ICMP" && packet.destinationPort === 80) {
      return {
        threatDetected: true,
        threatType: "anomaly",
        severity: "medium",
        confidence: 75,
        description: "Unusual protocol-port combination detected",
        detectionMethod: "anomaly",
        metadata: {
          protocol: packet.protocol,
          port: packet.destinationPort,
        },
      };
    }

    return null;
  }

  /**
   * تعيين عتبة الشذوذ
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  /**
   * الحصول على عتبة الشذوذ
   */
  getThreshold(): number {
    return this.threshold;
  }
}

/**
 * محرك الكشف الهجين (Hybrid Detection Engine)
 */
export class HybridDetectionEngine {
  private signatureEngine: SignatureDetectionEngine;
  private anomalyEngine: AnomalyDetectionEngine;

  constructor() {
    this.signatureEngine = new SignatureDetectionEngine();
    this.anomalyEngine = new AnomalyDetectionEngine();
  }

  /**
   * الكشف باستخدام كلا الطريقتين
   */
  detect(packet: PacketInfo): DetectionResult | null {
    // محاولة الكشف بناءً على التوقيع أولاً
    const signatureResult = this.signatureEngine.detect(packet);
    if (signatureResult) {
      signatureResult.detectionMethod = "hybrid";
      return signatureResult;
    }

    // ثم محاولة الكشف بناءً على الشذوذ
    const anomalyResult = this.anomalyEngine.detectAnomaly(packet);
    if (anomalyResult) {
      anomalyResult.detectionMethod = "hybrid";
      return anomalyResult;
    }

    return null;
  }

  /**
   * الكشف عن تهديدات متعددة
   */
  detectMultiple(packets: PacketInfo[]): DetectionResult[] {
    const results: DetectionResult[] = [];

    packets.forEach((packet) => {
      const result = this.detect(packet);
      if (result) {
        results.push(result);
      }
    });

    return results;
  }

  /**
   * الحصول على محرك التوقيع
   */
  getSignatureEngine(): SignatureDetectionEngine {
    return this.signatureEngine;
  }

  /**
   * الحصول على محرك الشذوذ
   */
  getAnomalyEngine(): AnomalyDetectionEngine {
    return this.anomalyEngine;
  }

  /**
   * الكشف عن هجمات محددة
   */
  detectSpecificAttacks(packets: PacketInfo[]): DetectionResult[] {
    const results: DetectionResult[] = [];

    // الكشف عن DoS/DDoS
    const dosResult = TrafficAnalyzer.detectDosAttack(packets);
    if (dosResult.isDosAttack) {
      results.push({
        threatDetected: true,
        threatType: "dos",
        severity: "critical",
        confidence: 90,
        description: `DoS attack detected: ${dosResult.packetsPerSecond} packets/sec`,
        detectionMethod: "anomaly",
        metadata: dosResult,
      });
    }

    // الكشف عن Port Scan
    const portScanResult = TrafficAnalyzer.detectPortScan(packets);
    if (portScanResult.isPortScan) {
      results.push({
        threatDetected: true,
        threatType: "port_scan",
        severity: "medium",
        confidence: 80,
        description: `Port scan detected: ${portScanResult.uniquePorts} ports scanned`,
        detectionMethod: "anomaly",
        metadata: portScanResult,
      });
    }

    // الكشف عن Brute Force
    const bruteForceResult = TrafficAnalyzer.detectBruteForce(packets);
    if (bruteForceResult.isBruteForce) {
      results.push({
        threatDetected: true,
        threatType: "brute_force",
        severity: "high",
        confidence: 85,
        description: `Brute force attack detected: ${bruteForceResult.failedAttempts} attempts`,
        detectionMethod: "anomaly",
        metadata: bruteForceResult,
      });
    }

    // الكشف عن التهديدات الفردية
    packets.forEach((packet) => {
      const result = this.detect(packet);
      if (result && !results.some((r) => r.threatType === result.threatType)) {
        results.push(result);
      }
    });

    return results;
  }
}

/**
 * مدير محرك الكشف
 */
export class DetectionEngineManager {
  private hybridEngine: HybridDetectionEngine;
  private detectionHistory: DetectionResult[] = [];
  private maxHistorySize: number = 10000;

  constructor() {
    this.hybridEngine = new HybridDetectionEngine();
  }

  /**
   * الكشف عن التهديدات
   */
  detect(packet: PacketInfo): DetectionResult | null {
    const result = this.hybridEngine.detect(packet);
    if (result) {
      this.addToHistory(result);
    }
    return result;
  }

  /**
   * الكشف عن تهديدات متعددة
   */
  detectMultiple(packets: PacketInfo[]): DetectionResult[] {
    const results = this.hybridEngine.detectMultiple(packets);
    results.forEach((result) => this.addToHistory(result));
    return results;
  }

  /**
   * الكشف عن هجمات محددة
   */
  detectSpecificAttacks(packets: PacketInfo[]): DetectionResult[] {
    const results = this.hybridEngine.detectSpecificAttacks(packets);
    results.forEach((result) => this.addToHistory(result));
    return results;
  }

  /**
   * إضافة إلى السجل
   */
  private addToHistory(result: DetectionResult): void {
    this.detectionHistory.push(result);
    if (this.detectionHistory.length > this.maxHistorySize) {
      this.detectionHistory.shift();
    }
  }

  /**
   * الحصول على السجل
   */
  getHistory(): DetectionResult[] {
    return [...this.detectionHistory];
  }

  /**
   * الحصول على إحصائيات الكشف
   */
  getStatistics() {
    const stats = {
      totalDetections: this.detectionHistory.length,
      byThreatType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byMethod: {} as Record<string, number>,
    };

    this.detectionHistory.forEach((result) => {
      stats.byThreatType[result.threatType] =
        (stats.byThreatType[result.threatType] || 0) + 1;
      stats.bySeverity[result.severity] =
        (stats.bySeverity[result.severity] || 0) + 1;
      stats.byMethod[result.detectionMethod] =
        (stats.byMethod[result.detectionMethod] || 0) + 1;
    });

    return stats;
  }

  /**
   * مسح السجل
   */
  clearHistory(): void {
    this.detectionHistory = [];
  }

  /**
   * الحصول على محرك الهجين
   */
  getHybridEngine(): HybridDetectionEngine {
    return this.hybridEngine;
  }
}
