# GYMbro - פרויקט מסכם: תכנית עבודה לשני מפתחים

פרויקט זה מחולק באופן מובנה בין שני חברי צוות כדי למקסם את היעילות ולאפשר למידה מעמיקה בתחומים שונים.

## חלוקת אחריות כללית

### מפתח 1: יעקב - Backend & Infrastructure
- פיתוח צד שרת (Node.js, Express, TypeScript)
- תכנון מסד נתונים ומודלים
- אימות ואבטחה (JWT, OAuth)
- אינטגרציית AI (Gemini/ChatGPT APIs)
- דיפלוימנט וקונפיגורציית שרת

### מפתח 2: אמיר - Frontend & UX
- פיתוח ממשק משתמש (React, TypeScript)
- עיצוב חווית משתמש ו-UI
- אינטגרציה מול API
- בדיקות קליינט וולידציות
- בניית קומפוננטות אינטראקטיביות

## לוח זמנים לביצוע - 4 שבועות

### שבוע 1: הקמת תשתית ואפיון
**יעקב:**
- ✅ הקמת פרויקט Express עם TypeScript
- ✅ הגדרת מסד נתונים MongoDB והתחברות
- ✅ יצירת מודלים בסיסיים (Users, Posts)
- ✅ מימוש מערכת אימות משתמשים (JWT + Google OAuth)

**אמיר:**
- ✅ הקמת פרויקט React + TypeScript
- ✅ בחירת ספריות UI (כגון Bootstrap/Material)
- ✅ הגדרת נתיבים (React Router) ותשתית הרשאות
- ✅ יצירת עמודי הרשמה והתחברות

### שבוע 2: פיתוח ליבה
**יעקב:**
- ✅ API לניהול פוסטים (העלאה, עריכה, מחיקה)
- ✅ ניהול תגובות ולייקים
- ✅ מערכת טעינת ושמירת תמונות
- ✅ API למידע פרופיל משתמש

**אמיר:**
- ✅ דף הבית והזנת פוסטים
- ✅ דף פרופיל משתמש וערכית פרופיל
- ✅ עמוד יצירה/עריכת פוסט
- ✅ מימוש לייקים ותגובות בצד לקוח

### שבוע 3: אינטגרציית AI ושיפור UX
**יעקב:**
- ✅ אינטגרציה עם Gemini/OpenAI APIs
- ✅ API לקבלת תוכניות אימון מותאמות אישית
- ✅ API לייעוץ תזונה
- ✅ API לחישוב ערכים תזונתיים

**אמיר:**
- ✅ עמוד מתכנן תוכניות אימון
- ✅ עמוד ייעוץ תזונה
- ✅ עמוד מחשבון ערכים תזונתיים
- ✅ שיפורי UX (אנימציות, טעינות, הודעות שגיאה)

### שבוע 4: שיפורים, בדיקות ודיפלוימנט
**יעקב:**
- ✅ הוספת Swagger לתיעוד API
- ✅ כתיבת בדיקות יחידה לכל נקודות ה-API
- ✅ טיפול בקצב בקשות API חיצוני וניהול שגיאות
- ✅ העלאת השרת לייצור והגדרת HTTPS

**אמיר:**
- ✅ שיפורי ביצועים ואופטימיזציה בצד לקוח
- ✅ בדיקות UI וטיפול בתאימות דפדפנים
- ✅ תיקון באגים וניהול קריסות אפשריות
- ✅ העלאת הקליינט לייצור

## תהליכי עבודה ושיתוף פעולה

### Git Workflow
1. עבודה בענפים נפרדים לכל פיצ'ר
2. הקפדה על Commits קטנים ומתועדים
3. Pull Request וביקורת קוד הדדית
4. מיזוג רק לאחר אישור חבר צוות

### פגישות צוות
- סקראם יומי קצר (10-15 דקות)
- סקירת התקדמות שבועית
- פגישת תכנון לפני כל שבוע
- פגישת רטרוספקטיבה בסוף כל שבוע

### כלי תקשורת וניהול משימות
- GitHub Issues & Projects לניהול משימות 
- Discord/Slack לתקשורת שוטפת
- Google Docs לשיתוף מסמכי אפיון ותכנון

## סיכום

הפרויקט מאפשר חלוקה ברורה של אחריות בין שני המפתחים, אך דורש שיתוף פעולה הדוק. שני המפתחים יקבלו הזדמנות לעבוד על תשתיות בעלות ערך מקצועי גבוה:

1. **יעקב** ירכוש ניסיון מעמיק בפיתוח שרת, אבטחה, ואינטגרציית AI.
2. **אמיר** ירכוש ניסיון בפיתוח ממשק משתמש, UX, ואינטראקציה עם API.

השילוב של הידע והכישורים של שני חברי הצוות יאפשר לבנות פרויקט מלא ואיכותי תוך שמירה על לוח הזמנים.

_מסמך זה נועד לתכנון ראשוני ויכול להשתנות בהתאם להתקדמות ואתגרים שיעלו במהלך העבודה._ 