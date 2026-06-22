# 📋 MesimaLiBot — בוט משימות לטלגרם (n8n + Google Sheets)

בוט טלגרם דו-לשוני (עברית) לניהול משימות אישי וזוגי, בנוי כ-workflow יחיד ב-**n8n**
עם אחסון ב-**Google Sheets**. נועד לפרויקט קטן (אני ואשתי) — בלי מסד נתונים כבד, עם
סיווג קטגוריות אוטומטי, עדכון סטטוס, כפתורים אינטראקטיביים, וזיהוי שפה טבעית בעברית.

> כל צ׳אט/קבוצה מקבל רשימת משימות **פרטית ונפרדת** (בידוד לפי `chat_id`).

---

## ✨ יכולות

- **הוספת משימות** בשפה טבעית — פשוט כותבים "להתקשר לרופא שיניים". גם פקודות (`/add`)
  וגם ריבוי משימות בהודעה אחת (שורה לכל משימה, או מופרד בפסיקים).
- **סיווג קטגוריות אוטומטי** לפי תוכן: 🛒 קניות · 🏠 בית · 🏥 רפואי · ⚖️ משפטי ·
  💼 עבודה · 💰 כספים · 📞 טלפונים · 🚗 רכב · 🎓 לימודים · 🎉 אירועים · ✈️ נסיעות · 📌 כללי.
- **ניהול סטטוס**: ⏳ ממתין · 🔄 בתהליך · ✅ בוצע · ❓ צריך חידוד · ❌ בוטל —
  דרך כפתורים, מספר משימה, או שפה טבעית ("סיימתי להתקשר לרופא").
- **כפתורים אינטראקטיביים (inline)** לכל משימה: עדכון סטטוס, שינוי שם, החלפת קטגוריה, מחיקה.
- **התאמת שם חכמה** עם אישור "התכוונת ל...?" כשהזיהוי לא ודאי.
- **תגובת אמוג׳י (reaction)** על ההודעה שיצרה את המשימה, כדי לראות סטטוס במבט.
- **עזרה מובנית** — שולחים "עזרה" או `?`.

---

## 🧱 ארכיטקטורה

הזרימה היא n8n workflow אחד (`workflow/telegram-task-bot.json`) עם 14 nodes:

```
Telegram Trigger ─► Config ─► Constants ─► Parse Update ─► Read Tasks (Sheets)
        │                                                        │
        └────────────────────────────────────────────────────► Resolve
                                                                 │
                                                          Route Final (switch)
                            ┌───────────────┬───────────────┬────┴───────────┐
                       Append Task      Update Task     Delete Task        (send)
                       (Sheets)         (Sheets)        (Sheets)             │
                            └───────────────┴───────────────┴──────────► Telegram API
                                                                            │
                                                                      Has Reaction ─► Set Reaction
```

| Node | סוג | תפקיד |
|------|-----|-------|
| **Telegram Trigger** | telegramTrigger | מאזין ל-`message` ול-`callback_query` |
| **Config** | set | מחזיק את `botToken` (כיום `{{ $env.TELEGRAM_BOT_TOKEN }}`) |
| **Constants** | code | מילונים: תוויות סטטוס, אייקונים, מילות-מפתח לקטגוריות, טקסט עזרה |
| **Parse Update** | code | מחלץ `chatId` ואת ה-update הגולמי |
| **Read Tasks** | googleSheets | קורא את משימות הצ׳אט (סינון לפי `chat_id`) |
| **Resolve** | code | **המנוע** — מתרגם כל פעולה (טקסט/כפתור) להחלטה: append/update/delete/send |
| **Route Final** | switch | מנתב לפי `finalAction` |
| **Append / Update / Delete Task** | googleSheets | כתיבה ל-Sheets |
| **Telegram API** | httpRequest | שולח את התשובה (`sendMessage`/`editMessageText`/...) |
| **Has Reaction → Set Reaction** | if + httpRequest | מוסיף אמוג׳י-reaction על ההודעה המקורית |

### מבנה גיליון ה-Google Sheets (טאב `Tasks`)

עמודות: `task_id`, `chat_id`, `user_name`, `task`, `status`, `category`,
`msg_id`, `created_at`, `updated_at`.

הבידוד הרב-דיירי (multi-tenant) מושג ע"י עמודת `chat_id` — קריאות מסוננות לפי
ה-`chat_id` של הצ׳אט הנוכחי, כך שכל קבוצה/שיחה רואה רק את המשימות שלה.

---

## 📂 מבנה הריפו

```
workflow/telegram-task-bot.json   # ה-workflow המלא, מנוקה מסודות, מוכן לייבוא ל-n8n
src/constants.js                  # קוד ה-node "Constants" (לקריאה/סקירה)
src/parse-update.js               # קוד ה-node "Parse Update"
src/resolve.js                    # קוד ה-node "Resolve" (מנוע ההחלטות)
scripts/check-secrets.sh          # סורק סודות — להרצה לפני כל commit/push
.claude/skills/secret-guard/      # סקיל אבטחה ל-Claude Code
.claude/hooks/guard-git.sh        # hook שחוסם commit/push אם נמצא סוד
.env.example                      # דוגמת משתני סביבה (בלי ערכים אמיתיים)
CLAUDE.md                         # כללי עבודה + כללי אבטחה
```

> `src/*.js` הם **מראה לקריאה בלבד** של ה-Code nodes. מקור האמת הוא ה-workflow ב-n8n.
> משנים לוגיקה ב-n8n ומסנכרנים חזרה לכאן.

---

## 🚀 התקנה

1. **ייבוא ל-n8n** — Import workflow מתוך `workflow/telegram-task-bot.json`.
2. **Telegram credential** — צרו בוט ב-[@BotFather](https://t.me/BotFather), והגדירו
   credential מסוג *Telegram API* ל-node ה-Trigger.
3. **משתנה סביבה** — הגדירו ב-n8n את `TELEGRAM_BOT_TOKEN` עם הטוקן של הבוט
   (ה-node `Config` מושך אותו דרך `{{ $env.TELEGRAM_BOT_TOKEN }}`).
4. **Google Sheets** —
   - צרו גיליון עם טאב `Tasks` והעמודות שלמעלה.
   - הגדירו credential מסוג *Google Sheets OAuth2*.
   - בכל אחד מ-nodes של Google Sheets החליפו את ה-`documentId` מהפלייסהולדר
     `YOUR_GOOGLE_SHEETS_ID` ל-ID/URL של הגיליון שלכם.
5. **הפעלה** — Activate ל-workflow, ושלחו "עזרה" לבוט.

---

## 🔒 אבטחה

הפרויקט מתוכנן לפרסום ציבורי ב-GitHub **בלי דליפת סודות**. הכללים מתועדים ב-
[`CLAUDE.md`](./CLAUDE.md) ונאכפים אוטומטית:

- **אין סודות ב-git.** טוקן הבוט תמיד `{{ $env.TELEGRAM_BOT_TOKEN }}`, וה-ID של
  הגיליון תמיד הפלייסהולדר `YOUR_GOOGLE_SHEETS_ID` בקבצים ש-commit-ים.
- **סורק סודות** — `scripts/check-secrets.sh --all` מזהה טוקני טלגרם, מזהי
  Google Sheets/Drive, מפתחות פרטיים ומפתחות API. רצים אותו לפני כל commit.
- **אכיפה אוטומטית** — `.claude/hooks/guard-git.sh` חוסם `git commit`/`git push`
  אם נמצא סוד; אפשר גם להתקין כ-git hook:
  ```bash
  ln -sf ../../scripts/check-secrets.sh .git/hooks/pre-commit
  ```
- **סקיל `secret-guard`** ל-Claude Code שמריץ את כל זה לפני פרסום.
- `.gitignore` חוסם `.env`, קבצי credentials וקבצי service-account.

> ⚠️ אם טוקן נחשף — לא מספיק למחוק את הקובץ. יש לבטל ולחדש אותו ב-@BotFather
> (`/revoke` ואז `/token`) ולעדכן את `TELEGRAM_BOT_TOKEN` ב-n8n.

---

## 🗺️ Roadmap (רעיונות)

- תזכורות מתוזמנות (Schedule Trigger) למשימות עם תאריך יעד.
- ייצוא/סיכום שבועי.
- חיפוש חופשי במשימות.

---

## 📄 רישיון

[MIT](./LICENSE).

---

<details>
<summary>English summary</summary>

**MesimaLiBot** is a Hebrew Telegram task-manager bot implemented as a single
**n8n** workflow backed by **Google Sheets**. It supports natural-language and
command-based task creation, automatic category classification, status
management, inline buttons, and per-chat isolation via `chat_id` (multi-tenant).

The repo is a **sanitized** mirror of the n8n workflow: the bot token is referenced
as `{{ $env.TELEGRAM_BOT_TOKEN }}` and the spreadsheet ID is the placeholder
`YOUR_GOOGLE_SHEETS_ID`. A secret scanner (`scripts/check-secrets.sh`), a
pre-commit/Claude hook, and a `secret-guard` skill keep credentials and the
private data file out of git. See `CLAUDE.md` for the security rules and the table
above for the node-by-node architecture.
</details>
