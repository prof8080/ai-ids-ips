import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Loader2, AlertTriangle, Activity, Shield, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * صفحة لوحة التحكم الرئيسية
 * تعرض الإحصائيات والتهديدات والتنبيهات
 */
export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");

  // استعلامات البيانات - بدون enabled للحصول على البيانات مباشرة
  const statisticsSummary = trpc.statistics.summary.useQuery(undefined, {
    staleTime: 30000,
  });
  const threatsList = trpc.threats.list.useQuery({ limit: 10 }, {
    staleTime: 30000,
  });
  const alertsList = trpc.alerts.list.useQuery({ limit: 10 }, {
    staleTime: 30000,
  });
  const detectionStats = trpc.detection.stats.useQuery(undefined, {
    staleTime: 30000,
  });
  const dosDetection = trpc.detection.detectDos.useQuery(undefined, {
    staleTime: 30000,
  });
  const portScanDetection = trpc.detection.detectPortScan.useQuery(undefined, {
    staleTime: 30000,
  });
  const bruteForceDetection = trpc.detection.detectBruteForce.useQuery(undefined, {
    staleTime: 30000,
  });

  // إجراءات الاختبار
  const generatePackets = trpc.testing.generatePackets.useMutation();
  const generateSQLInjection = trpc.testing.generateSQLInjection.useMutation();
  const generateXSS = trpc.testing.generateXSS.useMutation();
  const generateDoS = trpc.testing.generateDoS.useMutation();

  // حفظ البيانات في useMemo لتجنب re-renders غير ضرورية
  const threatData = useMemo(
    () => threatsList.data?.threats || [],
    [threatsList.data?.threats]
  );

  const alertData = useMemo(
    () => alertsList.data?.alerts || [],
    [alertsList.data?.alerts]
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>نظام IDS/IPS بالذكاء الاصطناعي</CardTitle>
            <CardDescription>
              نظام كشف ومنع التسلل المتقدم
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              يرجى تسجيل الدخول للوصول إلى لوحة التحكم
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">لوحة التحكم</h1>
            <p className="text-muted-foreground">
              مرحباً {user.name || "المستخدم"}، هذه لوحة التحكم الرئيسية لنظام IDS/IPS
            </p>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* إجمالي الحزم */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الحزم</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statisticsSummary.data?.packetCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                حزم تم التقاطها
              </p>
            </CardContent>
          </Card>

          {/* إجمالي التهديدات */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">التهديدات</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statisticsSummary.data?.threatCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                تهديدات مكتشفة
              </p>
            </CardContent>
          </Card>

          {/* التنبيهات الجديدة */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">التنبيهات</CardTitle>
              <Shield className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statisticsSummary.data?.alertCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                تنبيهات نشطة
              </p>
            </CardContent>
          </Card>

          {/* معدل الكشف */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">معدل الكشف</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statisticsSummary.data?.detectionStats?.totalDetections || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                عمليات كشف
              </p>
            </CardContent>
          </Card>
        </div>

        {/* التنبيهات والتهديدات النشطة */}
        {(dosDetection.data?.isDosAttack ||
          portScanDetection.data?.isPortScan ||
          bruteForceDetection.data?.isBruteForce) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>تحذير:</strong> تم كشف هجمات نشطة على النظام!
              {dosDetection.data?.isDosAttack && (
                <div className="mt-2">
                  • هجوم DoS: {dosDetection.data.packetsPerSecond} حزمة/ثانية
                </div>
              )}
              {portScanDetection.data?.isPortScan && (
                <div className="mt-2">
                  • Port Scan: {portScanDetection.data.uniquePorts} منفذ مختلف
                </div>
              )}
              {bruteForceDetection.data?.isBruteForce && (
                <div className="mt-2">
                  • Brute Force: {bruteForceDetection.data.failedAttempts} محاولة فاشلة
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* الأتاب الرئيسية */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="threats">التهديدات</TabsTrigger>
            <TabsTrigger value="alerts">التنبيهات</TabsTrigger>
            <TabsTrigger value="testing">الاختبار</TabsTrigger>
          </TabsList>

          {/* نظرة عامة */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* توزيع التهديدات */}
              <Card>
                <CardHeader>
                  <CardTitle>توزيع التهديدات</CardTitle>
                  <CardDescription>
                    توزيع أنواع التهديدات المكتشفة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {detectionStats.data?.byThreatType &&
                      Object.entries(detectionStats.data.byThreatType).map(
                        ([type, count]) => (
                          <div key={type} className="flex justify-between">
                            <span className="text-sm">{type}</span>
                            <span className="font-bold">{count}</span>
                          </div>
                        )
                      )}
                  </div>
                </CardContent>
              </Card>

              {/* توزيع الخطورة */}
              <Card>
                <CardHeader>
                  <CardTitle>توزيع الخطورة</CardTitle>
                  <CardDescription>
                    توزيع مستويات الخطورة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {detectionStats.data?.bySeverity &&
                      Object.entries(detectionStats.data.bySeverity).map(
                        ([severity, count]) => (
                          <div key={severity} className="flex justify-between">
                            <span className="text-sm capitalize">{severity}</span>
                            <span className="font-bold">{count}</span>
                          </div>
                        )
                      )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* طرق الكشف */}
            <Card>
              <CardHeader>
                <CardTitle>طرق الكشف المستخدمة</CardTitle>
                <CardDescription>
                  توزيع طرق الكشف (Signature, Anomaly, Hybrid)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {detectionStats.data?.byMethod &&
                    Object.entries(detectionStats.data.byMethod).map(
                      ([method, count]) => (
                        <div key={method} className="text-center">
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {method}
                          </div>
                        </div>
                      )
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* التهديدات */}
          <TabsContent value="threats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>آخر التهديدات المكتشفة</CardTitle>
                <CardDescription>
                  قائمة بأحدث 10 تهديدات
                </CardDescription>
              </CardHeader>
              <CardContent>
                {threatsList.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : threatData && threatData.length > 0 ? (
                  <div className="space-y-3">
                    {threatData.map((threat: any) => (
                      <div
                        key={threat.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-sm">
                              {threat.threatType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {threat.sourceIp} → {threat.destinationIp}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              threat.severity === "critical"
                                ? "bg-red-100 text-red-800"
                                : threat.severity === "high"
                                ? "bg-orange-100 text-orange-800"
                                : threat.severity === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {threat.severity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {threat.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد تهديدات مكتشفة
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* التنبيهات */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>آخر التنبيهات</CardTitle>
                <CardDescription>
                  قائمة بأحدث 10 تنبيهات
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertsList.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : alertData && alertData.length > 0 ? (
                  <div className="space-y-3">
                    {alertData.map((alert: any) => (
                      <div
                        key={alert.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-sm">
                              {alert.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(alert.timestamp).toLocaleString("ar-SA")}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              alert.status === "new"
                                ? "bg-red-100 text-red-800"
                                : alert.status === "acknowledged"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {alert.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد تنبيهات
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* الاختبار */}
          <TabsContent value="testing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>أدوات الاختبار</CardTitle>
                <CardDescription>
                  أدوات لاختبار نظام الكشف بمحاكاة هجمات مختلفة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* توليد حزم عادية */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">توليد حزم عادية</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      توليد حزم شبكة عادية للاختبار
                    </p>
                    <Button
                      onClick={() => generatePackets.mutate({ count: 50 })}
                      disabled={generatePackets.isPending}
                      className="w-full"
                    >
                      {generatePackets.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          جاري التوليد...
                        </>
                      ) : (
                        "توليد 50 حزمة"
                      )}
                    </Button>
                  </div>

                  {/* SQL Injection */}
                  <div className="p-4 border rounded-lg border-red-200 bg-red-50">
                    <h3 className="font-semibold mb-2">SQL Injection</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      محاكاة هجوم SQL Injection
                    </p>
                    <Button
                      onClick={() => generateSQLInjection.mutate()}
                      disabled={generateSQLInjection.isPending}
                      className="w-full"
                      variant="destructive"
                    >
                      {generateSQLInjection.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          جاري الاختبار...
                        </>
                      ) : (
                        "اختبار SQL Injection"
                      )}
                    </Button>
                  </div>

                  {/* XSS */}
                  <div className="p-4 border rounded-lg border-orange-200 bg-orange-50">
                    <h3 className="font-semibold mb-2">XSS Attack</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      محاكاة هجوم XSS (Cross-Site Scripting)
                    </p>
                    <Button
                      onClick={() => generateXSS.mutate()}
                      disabled={generateXSS.isPending}
                      className="w-full"
                      variant="destructive"
                    >
                      {generateXSS.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          جاري الاختبار...
                        </>
                      ) : (
                        "اختبار XSS"
                      )}
                    </Button>
                  </div>

                  {/* DoS */}
                  <div className="p-4 border rounded-lg border-yellow-200 bg-yellow-50">
                    <h3 className="font-semibold mb-2">DoS Attack</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      محاكاة هجوم DoS (Denial of Service)
                    </p>
                    <Button
                      onClick={() => generateDoS.mutate({ count: 100 })}
                      disabled={generateDoS.isPending}
                      className="w-full"
                      variant="destructive"
                    >
                      {generateDoS.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          جاري الاختبار...
                        </>
                      ) : (
                        "اختبار DoS"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
