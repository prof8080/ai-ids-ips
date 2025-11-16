import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Network, Activity, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * صفحة تحليل حركة المرور
 * تعرض تحليلات مفصلة عن حركة المرور والشبكة
 */
export default function TrafficAnalysis() {
  const { user, loading: authLoading } = useAuth();

  // استعلامات البيانات
  const packetsList = trpc.packets.list.useQuery({ limit: 1000 });
  const dosDetection = trpc.detection.detectDos.useQuery();
  const portScanDetection = trpc.detection.detectPortScan.useQuery();
  const bruteForceDetection = trpc.detection.detectBruteForce.useQuery();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // تحليل البيانات
  const packets = packetsList.data?.packets || [];
  
  // حساب إحصائيات البروتوكول
  const protocolStats = packets.reduce(
    (acc: Record<string, number>, packet: any) => {
      acc[packet.protocol] = (acc[packet.protocol] || 0) + 1;
      return acc;
    },
    {}
  );

  // حساب أكثر المنافذ استخداماً
  const portStats = packets.reduce(
    (acc: Record<number, number>, packet: any) => {
      if (packet.destinationPort) {
        acc[packet.destinationPort] = (acc[packet.destinationPort] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  // حساب أكثر عناوين IP
  const sourceIpStats = packets.reduce(
    (acc: Record<string, number>, packet: any) => {
      acc[packet.sourceIp] = (acc[packet.sourceIp] || 0) + 1;
      return acc;
    },
    {}
  );

  const destIpStats = packets.reduce(
    (acc: Record<string, number>, packet: any) => {
      acc[packet.destinationIp] = (acc[packet.destinationIp] || 0) + 1;
      return acc;
    },
    {}
  );

  // حساب حجم البيانات
  const totalBytes = packets.reduce(
    (sum: number, packet: any) => sum + (packet.payloadSize || 0),
    0
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div>
          <h1 className="text-3xl font-bold">تحليل حركة المرور</h1>
          <p className="text-muted-foreground">
            تحليل مفصل لحركة المرور والشبكة والأنماط المكتشفة
          </p>
        </div>

        {/* ملخص حركة المرور */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* إجمالي الحزم */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الحزم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{packets.length}</div>
              <p className="text-xs text-muted-foreground">
                حزمة تم تحليلها
              </p>
            </CardContent>
          </Card>

          {/* إجمالي البيانات */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي البيانات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(totalBytes / 1024 / 1024).toFixed(2)} MB
              </div>
              <p className="text-xs text-muted-foreground">
                حجم البيانات المنقولة
              </p>
            </CardContent>
          </Card>

          {/* البروتوكولات المختلفة */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">البروتوكولات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(protocolStats).length}
              </div>
              <p className="text-xs text-muted-foreground">
                نوع بروتوكول مختلف
              </p>
            </CardContent>
          </Card>

          {/* المنافذ المختلفة */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">المنافذ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(portStats).length}
              </div>
              <p className="text-xs text-muted-foreground">
                منفذ مختلف مستخدم
              </p>
            </CardContent>
          </Card>
        </div>

        {/* الأنماط المكتشفة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* DoS Detection */}
          <Card
            className={
              dosDetection.data?.isDosAttack
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                DoS Attack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dosDetection.data?.isDosAttack ? "مكتشف ⚠️" : "آمن ✓"}
              </div>
              {dosDetection.data?.isDosAttack && (
                <p className="text-xs text-muted-foreground mt-1">
                  {dosDetection.data.packetsPerSecond} حزمة/ثانية
                </p>
              )}
            </CardContent>
          </Card>

          {/* Port Scan Detection */}
          <Card
            className={
              portScanDetection.data?.isPortScan
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Network className="h-4 w-4" />
                Port Scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {portScanDetection.data?.isPortScan ? "مكتشف ⚠️" : "آمن ✓"}
              </div>
              {portScanDetection.data?.isPortScan && (
                <p className="text-xs text-muted-foreground mt-1">
                  {portScanDetection.data.uniquePorts} منفذ مختلف
                </p>
              )}
            </CardContent>
          </Card>

          {/* Brute Force Detection */}
          <Card
            className={
              bruteForceDetection.data?.isBruteForce
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Brute Force
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bruteForceDetection.data?.isBruteForce ? "مكتشف ⚠️" : "آمن ✓"}
              </div>
              {bruteForceDetection.data?.isBruteForce && (
                <p className="text-xs text-muted-foreground mt-1">
                  {bruteForceDetection.data.failedAttempts} محاولة فاشلة
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* توزيع البروتوكولات */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع البروتوكولات</CardTitle>
            <CardDescription>
              النسبة المئوية لاستخدام كل بروتوكول
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(protocolStats)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([protocol, count]) => (
                  <div key={protocol} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium uppercase">{protocol}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${((count as number) / packets.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="ml-4 text-sm font-bold">
                      {((count as number) / packets.length * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* أكثر المنافذ استخداماً */}
        <Card>
          <CardHeader>
            <CardTitle>أكثر المنافذ استخداماً</CardTitle>
            <CardDescription>
              أكثر 10 منافذ تم الوصول إليها
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(portStats)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 10)
                .map(([port, count]) => (
                  <div
                    key={port}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="font-mono text-sm">:{port}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${
                              ((count as number) /
                                Math.max(
                                  ...(Object.values(portStats) as number[])
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="font-bold text-sm">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* أكثر عناوين IP المصدر */}
        <Card>
          <CardHeader>
            <CardTitle>أكثر عناوين IP المصدر</CardTitle>
            <CardDescription>
              أكثر 10 عناوين IP قاموا بإرسال حزم
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(sourceIpStats)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 10)
                .map(([ip, count]) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="font-mono text-sm">{ip}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full"
                          style={{
                            width: `${
                              ((count as number) /
                                Math.max(
                                  ...(Object.values(sourceIpStats) as number[])
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="font-bold text-sm">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
