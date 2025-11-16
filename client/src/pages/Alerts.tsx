import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Bell, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * صفحة التنبيهات
 * تعرض قائمة شاملة بجميع التنبيهات والإشعارات
 */
export default function Alerts() {
  const { user, loading: authLoading } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>("new");

  // استعلامات البيانات
  const alertsList = trpc.alerts.list.useQuery({ limit: 100 });
  const newAlerts = trpc.alerts.getNew.useQuery();

  // إجراء تحديث الحالة
  const updateStatus = trpc.alerts.updateStatus.useMutation({
    onSuccess: () => {
      alertsList.refetch();
      newAlerts.refetch();
    },
  });

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

  // فلترة التنبيهات حسب الحالة
  let displayAlerts = alertsList.data?.alerts || [];
  if (filterStatus === "new") {
    displayAlerts = newAlerts.data || [];
  } else if (filterStatus === "all") {
    displayAlerts = alertsList.data?.alerts || [];
  } else {
    displayAlerts = (alertsList.data?.alerts || []).filter(
      (alert: any) => alert.status === filterStatus
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "acknowledged":
        return <Bell className="h-4 w-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div>
          <h1 className="text-3xl font-bold">التنبيهات والإشعارات</h1>
          <p className="text-muted-foreground">
            إدارة شاملة لجميع التنبيهات والإشعارات المرسلة من النظام
          </p>
        </div>

        {/* ملخص التنبيهات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* التنبيهات الجديدة */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">تنبيهات جديدة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {newAlerts.data?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                بحاجة إلى اهتمام
              </p>
            </CardContent>
          </Card>

          {/* التنبيهات المعترف بها */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {(alertsList.data?.alerts || []).filter(
                  (a: any) => a.status === "acknowledged"
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">
                تنبيهات معترف بها
              </p>
            </CardContent>
          </Card>

          {/* التنبيهات المحلولة */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">محلولة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(alertsList.data?.alerts || []).filter(
                  (a: any) => a.status === "resolved"
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">
                تنبيهات تم حلها
              </p>
            </CardContent>
          </Card>
        </div>

        {/* أدوات الفلترة */}
        <Card>
          <CardHeader>
            <CardTitle>الفلاتر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {["new", "acknowledged", "resolved", "all"].map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status === "new"
                    ? "جديدة"
                    : status === "acknowledged"
                    ? "معترف بها"
                    : status === "resolved"
                    ? "محلولة"
                    : "الكل"}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* قائمة التنبيهات */}
        <Card>
          <CardHeader>
            <CardTitle>
              قائمة التنبيهات ({displayAlerts.length})
            </CardTitle>
            <CardDescription>
              {filterStatus === "new"
                ? "التنبيهات الجديدة"
                : filterStatus === "acknowledged"
                ? "التنبيهات المعترف بها"
                : filterStatus === "resolved"
                ? "التنبيهات المحلولة"
                : "جميع التنبيهات"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alertsList.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin" />
              </div>
            ) : displayAlerts && displayAlerts.length > 0 ? (
              <div className="space-y-3">
                {displayAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg transition ${
                      alert.status === "new"
                        ? "bg-red-50 border-red-200"
                        : alert.status === "acknowledged"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-green-50 border-green-200"
                    }`}
                  >
                    {/* رأس التنبيه */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(alert.status)}
                        <div>
                          <h3 className="font-semibold text-sm">
                            {alert.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                      <Badge className={getPriorityColor(alert.priority)}>
                        {alert.priority}
                      </Badge>
                    </div>

                    {/* معلومات إضافية */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">الوقت:</span>
                        <p>
                          {new Date(alert.timestamp).toLocaleString("ar-SA")}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الحالة:</span>
                        <p className="capitalize">{alert.status}</p>
                      </div>
                      {alert.actionTimestamp && (
                        <div>
                          <span className="text-muted-foreground">
                            وقت الإجراء:
                          </span>
                          <p>
                            {new Date(alert.actionTimestamp).toLocaleString(
                              "ar-SA"
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* الإجراء المتخذ (إن وجد) */}
                    {alert.actionTaken && (
                      <div className="mb-3 p-2 bg-black/10 rounded text-xs">
                        <p className="text-muted-foreground mb-1">الإجراء:</p>
                        <p>{alert.actionTaken}</p>
                      </div>
                    )}

                    {/* الأزرار */}
                    <div className="flex gap-2 justify-end">
                      {alert.status === "new" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus.mutate({
                              alertId: alert.id,
                              status: "acknowledged",
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          الاعتراف
                        </Button>
                      )}
                      {alert.status === "acknowledged" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus.mutate({
                              alertId: alert.id,
                              status: "resolved",
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          تم الحل
                        </Button>
                      )}
                      {alert.status === "resolved" && (
                        <Badge variant="secondary">محلول</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                لا توجد تنبيهات في هذه الفئة
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
