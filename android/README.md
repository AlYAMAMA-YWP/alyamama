# ALYAMAMA Android App

هذا مشروع Android يلف واجهة الحضور الحالية داخل تطبيق WebView محلي.

## ما الذي يفعله

- يحمّل ملفات الواجهة من `app/src/main/assets/web`
- يفعّل `JavaScript` و`localStorage`
- يطلب صلاحية الموقع حتى يعمل `GPS`
- يفتح روابط خرائط جوجل خارج التطبيق

## تشغيله

1. افتح مجلد `android` في Android Studio.
2. اسمح له بعمل Gradle Sync.
3. شغّل المشروع على جهاز Android أو محاكي.

## تحديث ملفات الواجهة

بعد أي تعديل في ملفات الويب الرئيسية شغّل:

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-web-assets.ps1
```
