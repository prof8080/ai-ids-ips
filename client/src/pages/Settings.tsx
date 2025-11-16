import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Settings as SettingsIcon, Save } from "lucide-react";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * صفحة الإعدادات
 * تسمح للمستخدمين بتخصيص إعدادات النظام
 */
export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // الإعدادات
  const [settings, setSettings] = useState({
    systemName: "نظام IDS/IPS المتقدم",
    enableNotifications: true,
    enableAutoResponse: false,
    alertThreshold: 70,
    packetBufferSize: 1000,
    detectionMethod: "hybrid",
    enableLogging: true,
    logRetention: 30,
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

  const handleSave = async () => {
    setIsSaving(true);
    // محاكاة حفظ الإعدادات
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert("تم حفظ الإعدادات بنجاح!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div>
          <h1 className="text-3xl font-bold">الإعدادات</h1>
          <p className="text-muted-foreground">
            قم بتخصيص إعدادات النظام والتفضيلات الخاصة بك
          </p>
        </div>

        {/* الإعدادات العامة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              الإعدادات العامة
            </CardTitle>
            <CardDescription>
              الإعدادات الأساسية للنظام
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* اسم النظام */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                اسم النظام
              </label>
              <Input
                value={settings.systemName}
                onChange={(e) =>
                  setSettings({ ...settings, systemName: e.target.value })
                }
                placeholder="أدخل اسم النظام"
              />
            </div>

            {/* طريقة الكشف */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                طريقة الكشف الافتراضية
              </label>
              <select
                value={settings.detectionMethod}
                onChange={(e) =>
                  setSettings({ ...settings, detectionMethod: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="signature">التوقيع (Signature)</option>
                <option value="anomaly">الشذوذ (Anomaly)</option>
                <option value="hybrid">الهجين (Hybrid)</option>
              </select>
            </div>

            {/* حد التنبيه */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                حد التنبيه (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.alertThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    alertThreshold: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                سيتم إرسال تنبيه عندما تتجاوز ثقة التهديد هذه النسبة
              </p>
            </div>

            {/* حجم مخزن الحزم */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                حجم مخزن الحزم
              </label>
              <Input
                type="number"
                min="100"
                value={settings.packetBufferSize}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    packetBufferSize: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                الحد الأقصى لعدد الحزم المخزنة في الذاكرة
              </p>
            </div>
          </CardContent>
        </Card>

        {/* إعدادات التنبيهات */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات التنبيهات</CardTitle>
            <CardDescription>
              تخصيص كيفية استقبال التنبيهات والإشعارات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* تفعيل التنبيهات */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">تفعيل التنبيهات</p>
                <p className="text-xs text-muted-foreground">
                  استقبال إشعارات عند اكتشاف تهديدات
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    enableNotifications: e.target.checked,
                  })
                }
                className="w-5 h-5"
              />
            </div>

            {/* الاستجابة التلقائية */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">الاستجابة التلقائية</p>
                <p className="text-xs text-muted-foreground">
                  اتخاذ إجراءات تلقائية ضد التهديدات المؤكدة
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAutoResponse}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    enableAutoResponse: e.target.checked,
                  })
                }
                className="w-5 h-5"
              />
            </div>
          </CardContent>
        </Card>

        {/* إعدادات السجلات */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات السجلات</CardTitle>
            <CardDescription>
              إدارة السجلات والأرشيفات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* تفعيل السجلات */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">تفعيل السجلات</p>
                <p className="text-xs text-muted-foreground">
                  تسجيل جميع الأنشطة والأحداث
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableLogging}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    enableLogging: e.target.checked,
                  })
                }
                className="w-5 h-5"
              />
            </div>

            {/* فترة الاحتفاظ بالسجلات */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                فترة الاحتفاظ بالسجلات (يوم)
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                value={settings.logRetention}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    logRetention: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                سيتم حذف السجلات الأقدم من هذه المدة تلقائياً
              </p>
            </div>
          </CardContent>
        </Card>

        {/* إعدادات متقدمة */}
        <Card>
          <CardHeader>
            <CardTitle>الإعدادات المتقدمة</CardTitle>
            <CardDescription>
              إعدادات متقدمة للمستخدمين المتمرسين
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                ⚠️ تحذير
              </p>
              <p className="text-xs text-yellow-700">
                تعديل الإعدادات المتقدمة قد يؤثر على أداء النظام. يرجى التأكد من معرفتك بما تفعله قبل إجراء أي تغييرات.
              </p>
            </div>

            <Button variant="outline" className="w-full">
              الوصول إلى الإعدادات المتقدمة
            </Button>
          </CardContent>
        </Card>

        {/* الأزرار */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline">إلغاء</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
