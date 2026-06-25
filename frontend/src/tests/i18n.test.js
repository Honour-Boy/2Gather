// Exercises the i18n config in lib/i18n.js: lazy catalog loading, French
// translation, fallback to English for languages without a catalog, and RTL.
// Non-English catalogs are lazy-loaded, so we switch via setUiLanguage (which
// awaits the catalog) rather than i18n.changeLanguage directly.
import i18n, { setUiLanguage, UI_LANGUAGES } from "@/lib/i18n";

test("resolves an English string", async () => {
  await setUiLanguage("en");
  expect(i18n.t("login.signIn")).toBe("Sign in");
  expect(document.documentElement.dir).toBe("ltr");
});

test("lazy-loads and translates into French", async () => {
  await setUiLanguage("fr");
  expect(i18n.t("login.signIn")).toBe("Se connecter");
});

test("flips <html dir> to rtl for Arabic", async () => {
  await setUiLanguage("ar");
  expect(i18n.t("login.signIn")).toBe("تسجيل الدخول");
  expect(document.documentElement.dir).toBe("rtl");
});

test("falls back to English for a language without a catalog", async () => {
  await setUiLanguage("zz"); // not a UI language
  expect(i18n.t("login.signIn")).toBe("Sign in");
});

test("localizes the chat/settings surfaces", async () => {
  await setUiLanguage("fr");
  expect(i18n.t("settings.editProfile")).toBe("Modifier le profil");
  expect(i18n.t("chat.send")).toBe("Envoyer");
  // Interpolation still works in a translated string.
  expect(i18n.t("chat.translatedTo", { lang: "anglais" })).toBe(
    "Traduit en anglais"
  );
});

test("ships a catalog for all 30 supported chat languages", () => {
  // UI_LANGUAGES must stay aligned with the translation backend's served set
  // (Languages.js `supported`) so a user can't pick a language whose UI
  // silently stays English. Also guards against listing a language whose
  // catalog file is missing (which would break the build's dynamic import).
  expect(UI_LANGUAGES).toContain("en");
  expect(UI_LANGUAGES.length).toBe(30);
});

test("lazy-loads a non-Latin, RTL-eligible catalog (Persian)", async () => {
  await setUiLanguage("fa");
  expect(i18n.t("login.signIn")).toBe("ورود");
  expect(document.documentElement.dir).toBe("rtl");
});
