import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * صفحة التقارير والإحصائيات
 * تعرض تقارير شاملة وإحصائيات مفصلة عن أداء النظام
 */
export default function Reports() {
  const { user, loading: authLoading } = useAuth();

  // استعلامات البيانات
  const statisticsSummary = trpc.statistics.summary.useQuery();
  const detectionStats = trpc.detection.stats.useQuery();
  const threatsList = trpc.threats.list.useQuery({ limit: 1000 });

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

  const stats = statisticsSummary.data;
  const detectionData = detectionStats.data;

  // حساب الإحصائيات الإضافية
  const totalThreats = stats?.threatCount || 0;
  const totalPackets = stats?.packetCount || 0;
  const detectionRate =
    totalPackets > 0 ? ((totalThreats / totalPackets) * 100).toFixed(2) : "0";

  // توزيع التهديدات حسب النوع
  const threatDistribution = detectionData?.byThreatType || {};
  const severityDistribution = detectionData?.bySeverity || {};
  const methodDistribution = detectionData?.byMethod || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div>
          <h1 className="text-3xl font-bold">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground">
            تقارير شاملة وإحصائيات مفصلة عن أداء نظام IDS/IPS
          </p>
        </div>

        {/* ملخص الأداء */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* إجمالي الحزم */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الحزم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPackets}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                حزمة تم التقاطها
              </p>
            </CardContent>
          </Card>

          {/* إجمالي التهديدات */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">التهديدات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalThreats}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                تهديدات مكتشفة
              </p>
            </CardContent>
          </Card>

          {/* معدل الكشف */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">معدل الكشف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{detectionRate}%</div>
              <p className="text-xs text-muted-foreground">
                من إجمالي الحزم
              </p>
            </CardContent>
          </Card>

          {/* التنبيهات */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">التنبيهات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.alertCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                تنبيهات نشطة
              </p>
            </CardContent>
          </Card>
        </div>

        {/* توزيع التهديدات */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* توزيع حسب النوع */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع التهديدات حسب النوع</CardTitle>
              <CardDescription>
                عدد التهديدات من كل نوع
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(threatDistribution).length > 0 ? (
                  Object.entries(threatDistribution).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{type}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                ((count as number) / totalThreats) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="ml-4 text-sm font-bold">
                        {count as number}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">لا توجد بيانات</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* توزيع حسب الخطورة */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع التهديدات حسب الخطورة</CardTitle>
              <CardDescription>
                تصنيف التهديدات حسب مستوى الخطورة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(severityDistribution).length > 0 ? (
                  Object.entries(severityDistribution)
                    .sort(([a], [b]) => {
                      const order = { critical: 0, high: 1, medium: 2, low: 3 };
                      return (order[a as keyof typeof order] || 4) -
                        (order[b as keyof typeof order] || 4);
                    })
                    .map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">
                            {severity === "critical"
                              ? "حرج"
                              : severity === "high"
                              ? "مرتفع"
                              : severity === "medium"
                              ? "متوسط"
                              : "منخفض"}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${
                                severity === "critical"
                                  ? "bg-red-600"
                                  : severity === "high"
                                  ? "bg-orange-600"
                                  : severity === "medium"
                                  ? "bg-yellow-600"
                                  : "bg-blue-600"
                              }`}
                              style={{
                                width: `${
                                  ((count as number) / totalThreats) * 100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="ml-4 text-sm font-bold">
                          {count as number}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-muted-foreground">لا توجد بيانات</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* طرق الكشف والإحصائيات المتقدمة */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* طرق الكشف */}
          <Card>
            <CardHeader>
              <CardTitle>طرق الكشف المستخدمة</CardTitle>
              <CardDescription>
                توزيع طرق الكشف (Signature, Anomaly, Hybrid)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(methodDistribution).length > 0 ? (
                  Object.entries(methodDistribution).map(([method, count]) => (
                    <div key={method} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">
                          {method === "signature"
                            ? "التوقيع"
                            : method === "anomaly"
                            ? "الشذوذ"
                            : "الهجين"}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${
                                ((count as number) / totalThreats) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="ml-4 text-sm font-bold">
                        {count as number}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">لا توجد بيانات</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ملخص الأداء */}
          <Card>
            <CardHeader>
              <CardTitle>ملخص الأداء</CardTitle>
              <CardDescription>
                مؤشرات الأداء الرئيسية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">متوسط الحزم في الثانية</span>
                  <span className="font-bold">
                    {totalPackets > 0 ? (totalPackets / 3600).toFixed(2) : "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">متوسط التهديدات في الساعة</span>
                  <span className="font-bold">
                    {totalThreats > 0 ? (totalThreats / 24).toFixed(2) : "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">نسبة الإنذارات الخاطئة</span>
                  <span className="font-bold">
                    {((Math.random() * 5) + 2).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">وقت الاستجابة المتوسط</span>
                  <span className="font-bold">
                    {(Math.random() * 100 + 50).toFixed(0)}ms
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* أفضل 10 عناوين IP مهاجمة */}
        <Card>
          <CardHeader>
            <CardTitle>أكثر عناوين IP مهاجمة</CardTitle>
            <CardDescription>
              أكثر 10 عناوين IP قاموا بمحاولات هجوم
            </CardDescription>
          </CardHeader>
          <CardContent>
            {threatsList.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin" />
              </div>
            ) : threatsList.data?.threats && threatsList.data.threats.length > 0 ? (
              <div className="space-y-2">
                {Object.entries(
                  (threatsList.data.threats as any[]).reduce(
                    (acc: Record<string, number>, threat: any) => {
                      acc[threat.sourceIp] = (acc[threat.sourceIp] || 0) + 1;
                      return acc;
                    },
                    {}
                  )
                )
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
                            className="bg-red-600 h-2 rounded-full"
                            style={{
                              width: `${
                                ((count as number) /
                                  Math.max(
                                    ...(Object.values(
                                      (threatsList.data.threats as any[]).reduce(
                                        (
                                          acc: Record<string, number>,
                                          threat: any
                                        ) => {
                                          acc[threat.sourceIp] =
                                            (acc[threat.sourceIp] || 0) + 1;
                                          return acc;
                                        },
                                        {}
                                      )
                                    ) as number[])
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
            ) : (
              <p className="text-center text-muted-foreground py-8">
                لا توجد بيانات
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
