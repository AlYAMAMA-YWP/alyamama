# ALYAMAMA iPhone Starter

هذا المجلد يجهز غلاف iPhone للتطبيق الحالي باستخدام `WKWebView` مع دعم الموقع وفتح روابط خرائط جوجل خارج التطبيق.

## ما الموجود هنا

- ملفات Swift جاهزة للإضافة إلى مشروع iOS في Xcode
- ملف `Info.plist` جاهز للصلاحيات الأساسية
- نسخة من ملفات الواجهة داخل `web`
- سكربت مزامنة لنسخ آخر ملفات الواجهة إلى مجلد iOS

## ما الذي تحتاجه للبناء

- جهاز Mac
- Xcode
- حساب Apple Developer إذا أردت التثبيت على أجهزة متعددة أو الرفع إلى App Store

## الطريقة الأسرع

1. افتح Xcode على جهاز Mac.
2. أنشئ مشروع `iOS App` جديد باسم `ALYAMAMA`.
3. اختر `Swift` و `SwiftUI`.
4. انسخ ملفات هذا المجلد إلى المشروع الجديد.
5. استبدل محتوى ملفات التطبيق بملفات Swift الموجودة هنا.
6. أضف مجلد `web` إلى الـ app target.

## مزامنة الواجهة

من ويندوز، بعد تعديل ملفات الويب شغّل:

```powershell
powershell -ExecutionPolicy Bypass -File .\ios\sync-web-assets.ps1
```

هذا يحدّث مجلد `ios/web` ليحمل آخر نسخة من:

- `index.html`
- `app.js`
- `styles.css`
- `manifest.json`
- `icon.svg`
- `reset.html`
