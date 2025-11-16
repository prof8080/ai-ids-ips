import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, AlertTriangle, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * صفحة التهديدات
 * تعرض قائمة شاملة بجميع التهديدات المكتشفة
 */
export default function Threats() {
  const { user, loading: authLoading } = useAuth();
  const [filterType, setFilterType] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("");

  // استعلامات البيانات
  const threatsList = trpc.threats.list.useQuery({ limit: 100 }, {
    staleTime: 30000,
  });

  // إجراء تحديث الحالة
  const updateStatus = trpc.threats.updateStatus.useMutation({
    onSuccess: () => {
      threatsList.refetch();
    },
  });

  // حفظ البيانات المفلترة في useMemo
  const displayThreats = useMemo(() => {
    let threats = threatsList.data?.threats || [];

    if (filterType) {
      threats = threats.filter((t: any) => t.threatType === filterType);
    }

    if (filterSeverity) {
      threats = threats.filter((t: any) => t.severity === filterSeverity);
    }

    return threats;
  }, [threatsList.data?.threats, filterType, filterSeverity]);

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getThreatTypeColor = (threatType: string) => {
    switch (threatType) {
      case "sql_injection":
        return "bg-red-50 border-red-200";
      case "xss":
        return "bg-orange-50 border-orange-200";
      case "brute_force":
        return "bg-yellow-50 border-yellow-200";
      case "dos":
      case "ddos":
        return "bg-purple-50 border-purple-200";
      case "port_scan":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div>
          <h1 className="text-3xl font-bold">التهديدات المكتشفة</h1>
          <p className="text-muted-foreground">
            عرض شامل لجميع التهديدات والهجمات المكتشفة على النظام
          </p>
        </div>

        {/* أدوات الفلترة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              الفلاتر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* فلتر النوع */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  نوع التهديد
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">الكل</option>
                  <option value="sql_injection">SQL Injection</option>
                  <option value="xss">XSS</option>
                  <option value="brute_force">Brute Force</option>
                  <option value="dos">DoS</option>
                  <option value="ddos">DDoS</option>
                  <option value="port_scan">Port Scan</option>
                  <option value="anomaly">Anomaly</option>
                </select>
              </div>

              {/* فلتر الخطورة */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  مستوى الخطورة
                </label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">الكل</option>
                  <option value="critical">حرج</option>
                  <option value="high">مرتفع</option>
                  <option value="medium">متوسط</option>
                  <option value="low">منخفض</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* قائمة التهديدات */}
        <Card>
          <CardHeader>
            <CardTitle>
              قائمة التهديدات ({displayThreats.length})
            </CardTitle>
            <CardDescription>
              {filterType && `نوع: ${filterType}`}
              {filterSeverity && ` | خطورة: ${filterSeverity}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {threatsList.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin" />
              </div>
            ) : displayThreats && displayThreats.length > 0 ? (
              <div className="space-y-3">
                {displayThreats.map((threat: any) => (
                  <div
                    key={threat.id}
                    className={`p-4 border rounded-lg ${getThreatTypeColor(
                      threat.threatType
                    )}`}
                  >
                    {/* رأس التهديد */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <h3 className="font-semibold text-sm">
                            {threat.threatType.toUpperCase()}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {threat.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getSeverityColor(threat.severity)}>
                          {threat.severity}
                        </Badge>
                        <Badge variant="outline">
                          {threat.confidence.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>

                    {/* معلومات الشبكة */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">المصدر:</span>
                        <p className="font-mono">{threat.sourceIp}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الهدف:</span>
                        <p className="font-mono">{threat.destinationIp}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المنفذ:</span>
                        <p className="font-mono">
                          {threat.destinationPort || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الوقت:</span>
                        <p>
                          {new Date(threat.timestamp).toLocaleString("ar-SA")}
                        </p>
                      </div>
                    </div>

                    {/* الحمل (إن وجد) */}
                    {threat.payload && (
                      <div className="mb-3 p-2 bg-black/20 rounded text-xs font-mono overflow-x-auto">
                        <p className="text-muted-foreground mb-1">الحمل:</p>
                        <p>{threat.payload.substring(0, 200)}...</p>
                      </div>
                    )}

                    {/* الإجراءات */}
                    <div className="flex gap-2 justify-end">
                      {threat.status === "new" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({
                                threatId: threat.id,
                                status: "investigating",
                              })
                            }
                            disabled={updateStatus.isPending}
                          >
                            قيد التحقيق
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({
                                threatId: threat.id,
                                status: "false_positive",
                              })
                            }
                            disabled={updateStatus.isPending}
                          >
                            إنذار خاطئ
                          </Button>
                        </>
                      )}
                      {threat.status === "investigating" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({
                                threatId: threat.id,
                                status: "confirmed",
                              })
                            }
                            disabled={updateStatus.isPending}
                          >
                            تأكيد
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({
                                threatId: threat.id,
                                status: "resolved",
                              })
                            }
                            disabled={updateStatus.isPending}
                          >
                            تم الحل
                          </Button>
                        </>
                      )}
                      {threat.status !== "new" && threat.status !== "investigating" && (
                        <Badge variant="secondary">{threat.status}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                لا توجد تهديدات مطابقة للفلاتر المحددة
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
