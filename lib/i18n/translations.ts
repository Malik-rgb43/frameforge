// FrameForge i18n — minimal dictionary approach.
// Default language: English. Hebrew available via Settings.
// Add new keys at the top, both languages, alphabetically by feature.

export type Lang = "en" | "he";

export const TRANSLATIONS = {
  en: {
    // Shell
    "shell.untitled": "Untitled",
    "shell.menu": "Menu",
    "shell.team": "Team",
    "shell.settings": "Settings",
    "shell.view.board": "Board",
    "shell.view.storyboard": "Storyboard",

    // Tool rail
    "tool.generate": "Generate",
    "tool.magicfill": "Magic Fill",
    "tool.extend": "Extend",
    "tool.remix": "Remix",
    "tool.select": "Select",
    "tool.hand": "Hand",
    "tool.text": "Text",
    "tool.addimage": "Add image",
    "tool.chain": "Chain",
    "tool.concepts": "Concepts",
    "tool.download": "Download",

    // Chat bar
    "chat.placeholder.empty": "Describe your shot...",
    "chat.placeholder.withRefs": "Describe the shot — will use {n} refs",
    "chat.generate": "Generate",
    "chat.generating": "Generating...",
    "chat.clearRefs": "clear",
    "chat.hint": "/ for commands · ⌘↵ to send",
    "chat.model.pro": "NanoBanana Pro",
    "chat.model.pro.hint": "premium quality",
    "chat.model.nb2": "NanoBanana 3.1",
    "chat.model.nb2.hint": "fast + 4K",
    "chat.model.flash": "Flash",
    "chat.model.flash.hint": "drafts only",

    // Node
    "node.untitled": "Untitled",
    "node.status.generating": "generating",
    "node.status.error": "error",
    "node.action.inspect": "Inspect",
    "node.action.addRef": "Add as reference",
    "node.promptBadge": "prompt",

    // Inspector
    "inspector.tab.prompt": "Prompt",
    "inspector.tab.refs": "References",
    "inspector.tab.animation": "Animation",
    "inspector.close": "Close",
    "inspector.type.source": "Source",
    "inspector.type.shot": "Shot",
    "inspector.type.continuation": "Continuation",
    "inspector.type.note": "Note",
    "inspector.prompt.raw": "Raw prompt",
    "inspector.prompt.raw.sub": "What you typed in the Chat Bar",
    "inspector.prompt.enhanced": "Enhanced prompt",
    "inspector.prompt.enhanced.sub": "What was sent to NanoBanana after enhancement",
    "inspector.prompt.empty": "No prompt yet",
    "inspector.refs.empty": "No references used",
    "inspector.refs.summary": "This shot was built from {n} references:",
    "inspector.anim.intro": "Recommended motion prompt for external i2v tools (Kling 3 / Runway / Seedance / Sora)",
    "inspector.anim.empty": "No animation prompt generated yet",
    "inspector.anim.create": "Generate recommendation with Gemini →",
    "inspector.anim.label": "Motion Prompt",
    "inspector.anim.modelHint": "model hint",

    // Home
    "home.tagline":
      "AI studio for ad creatives — free canvas, shot chains, automatic creation from references.",
    "home.openStudio": "Open Studio",

    // Magic Fill
    "magicfill.title": "Magic Fill",
    "magicfill.subtitle": "Improve composition or swap an element — powered by NanoBanana Pro",
    "magicfill.source": "Source image",
    "magicfill.describe": "What do you want to change?",
    "magicfill.describe.placeholder":
      "e.g. replace the background with a concrete wall, remove the hand, add steam rising from the cup",
    "magicfill.strength": "Edit strength",
    "magicfill.strength.subtle": "Subtle",
    "magicfill.strength.balanced": "Balanced",
    "magicfill.strength.strong": "Strong",
    "magicfill.cta": "Apply Magic Fill",
    "magicfill.applying": "Applying...",
    "magicfill.cancel": "Cancel",
    "magicfill.empty.title": "Select a shot first",
    "magicfill.empty.body": "Click a shot on the canvas, then open Magic Fill.",

    // Settings
    "settings.title": "Settings",
    "settings.section.general": "General",
    "settings.language": "Language",
    "settings.language.sub": "Choose the interface language",
    "settings.language.en": "English",
    "settings.language.he": "Hebrew (עברית)",
    "settings.section.team": "Team",
    "settings.team.invite": "Invite a team member",
    "settings.team.inviteHint": "Send them an email invite to join this workspace",
    "settings.team.emailPlaceholder": "team@example.com",
    "settings.team.role.admin": "Admin",
    "settings.team.role.editor": "Editor",
    "settings.team.role.viewer": "Viewer",
    "settings.team.sendInvite": "Send Invite",
    "settings.section.ai": "AI Models",
    "settings.ai.imageModel": "Image model",
    "settings.ai.textModel": "Text model",
    "settings.section.danger": "Danger zone",
    "settings.danger.deleteProject": "Delete this project",

    // Common
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.close": "Close",
    "common.copy": "Copy",
    "common.copied": "Copied",
  },
  he: {
    // Shell
    "shell.untitled": "ללא שם",
    "shell.menu": "תפריט",
    "shell.team": "צוות",
    "shell.settings": "הגדרות",
    "shell.view.board": "בורד",
    "shell.view.storyboard": "סטוריבורד",

    // Tool rail
    "tool.generate": "יצירה",
    "tool.magicfill": "Magic Fill",
    "tool.extend": "הרחבה",
    "tool.remix": "רמיקס",
    "tool.select": "בחירה",
    "tool.hand": "יד",
    "tool.text": "טקסט",
    "tool.addimage": "הוספת תמונה",
    "tool.chain": "שרשרת",
    "tool.concepts": "קונספטים",
    "tool.download": "הורדה",

    // Chat bar
    "chat.placeholder.empty": "תאר את השוט...",
    "chat.placeholder.withRefs": "תאר את השוט — ישתמש ב-{n} refs",
    "chat.generate": "צור",
    "chat.generating": "יוצר...",
    "chat.clearRefs": "נקה",
    "chat.hint": "/ לפקודות · ⌘↵ לשליחה",
    "chat.model.pro": "NanoBanana Pro",
    "chat.model.pro.hint": "איכות פרימיום",
    "chat.model.nb2": "NanoBanana 3.1",
    "chat.model.nb2.hint": "מהיר + 4K",
    "chat.model.flash": "Flash",
    "chat.model.flash.hint": "לטיוטות בלבד",

    // Node
    "node.untitled": "ללא כותרת",
    "node.status.generating": "מייצר...",
    "node.status.error": "שגיאה",
    "node.action.inspect": "בחן",
    "node.action.addRef": "הוסף כ-reference",
    "node.promptBadge": "פרומפט",

    // Inspector
    "inspector.tab.prompt": "פרומפט",
    "inspector.tab.refs": "רפרנסים",
    "inspector.tab.animation": "אנימציה",
    "inspector.close": "סגור",
    "inspector.type.source": "מקור",
    "inspector.type.shot": "שוט",
    "inspector.type.continuation": "המשך",
    "inspector.type.note": "הערה",
    "inspector.prompt.raw": "פרומפט שנכתב",
    "inspector.prompt.raw.sub": "מה שכתבת ב-Chat Bar",
    "inspector.prompt.enhanced": "פרומפט משופר",
    "inspector.prompt.enhanced.sub": "מה שנשלח ל-NanoBanana אחרי enhancement",
    "inspector.prompt.empty": "אין פרומפט עדיין",
    "inspector.refs.empty": "לא השתמשו ברפרנסים",
    "inspector.refs.summary": "השוט הזה נבנה מ-{n} רפרנסים:",
    "inspector.anim.intro":
      "פרומפט אנימציה מומלץ לתוכנה חיצונית (Kling 3 / Runway / Seedance / Sora)",
    "inspector.anim.empty": "עדיין לא נוצר פרומפט אנימציה",
    "inspector.anim.create": "צור המלצה עם Gemini ←",
    "inspector.anim.label": "פרומפט אנימציה",
    "inspector.anim.modelHint": "מודל מומלץ",

    // Home
    "home.tagline":
      "סטודיו AI לקריאייטיבים — canvas חופשי, שרשראות shots, יצירה אוטומטית מרפרנסים.",
    "home.openStudio": "פתח Studio",

    // Magic Fill
    "magicfill.title": "Magic Fill",
    "magicfill.subtitle":
      "שפר קומפוזיציה או החלף אלמנט — בשימוש NanoBanana Pro",
    "magicfill.source": "תמונת מקור",
    "magicfill.describe": "מה תרצה לשנות?",
    "magicfill.describe.placeholder":
      "לדוגמה: החלף את הרקע לקיר בטון, הסר את היד, הוסף אדים עולים מהכוס",
    "magicfill.strength": "עוצמת שינוי",
    "magicfill.strength.subtle": "עדין",
    "magicfill.strength.balanced": "מאוזן",
    "magicfill.strength.strong": "חזק",
    "magicfill.cta": "החל Magic Fill",
    "magicfill.applying": "מחיל...",
    "magicfill.cancel": "בטל",
    "magicfill.empty.title": "בחר שוט קודם",
    "magicfill.empty.body": "לחץ על שוט ב-canvas ואז פתח Magic Fill.",

    // Settings
    "settings.title": "הגדרות",
    "settings.section.general": "כללי",
    "settings.language": "שפה",
    "settings.language.sub": "בחר את שפת הממשק",
    "settings.language.en": "English",
    "settings.language.he": "עברית",
    "settings.section.team": "צוות",
    "settings.team.invite": "הזמן חבר צוות",
    "settings.team.inviteHint": "שלח הזמנה באימייל להצטרפות ל-workspace הזה",
    "settings.team.emailPlaceholder": "team@example.com",
    "settings.team.role.admin": "אדמין",
    "settings.team.role.editor": "עורך",
    "settings.team.role.viewer": "צופה",
    "settings.team.sendInvite": "שלח הזמנה",
    "settings.section.ai": "מודלי AI",
    "settings.ai.imageModel": "מודל תמונה",
    "settings.ai.textModel": "מודל טקסט",
    "settings.section.danger": "אזור מסוכן",
    "settings.danger.deleteProject": "מחק את הפרויקט הזה",

    // Common
    "common.cancel": "בטל",
    "common.save": "שמור",
    "common.close": "סגור",
    "common.copy": "העתק",
    "common.copied": "הועתק",
  },
} as const;

export type TKey = keyof typeof TRANSLATIONS["en"];

export function translate(
  lang: Lang,
  key: TKey,
  vars?: Record<string, string | number>
): string {
  const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
  let s = (dict as Record<string, string>)[key] ?? (TRANSLATIONS.en as Record<string, string>)[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
