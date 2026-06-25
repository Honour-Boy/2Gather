// Full label catalogue. Used to resolve *any* stored language code to a human
// label (including legacy users whose stored code predates the current
// translation instance). `supported: true` marks the codes the live
// LibreTranslate instance (my-gpt-translator.hf.space) is configured to load —
// only those are offered in the profile picker so a user can't pick a language
// that would silently never translate. Keep this in sync with the instance's
// LT_LOAD_ONLY (verify against GET /languages). See services/messages.js
// (LT_CODE map: the app stores "zh"; the instance serves it as "zh-Hans").
const languages = [
    { label: "Arabic", value: "ar", supported: true },
    { label: "Azerbaijani", value: "az" },
    { label: "Bulgarian", value: "bg" },
    { label: "Bengali", value: "bn", supported: true },
    { label: "Catalan", value: "ca" },
    { label: "Czech", value: "cs", supported: true },
    { label: "Danish", value: "da" },
    { label: "German", value: "de", supported: true },
    { label: "Greek", value: "el", supported: true },
    { label: "English", value: "en", supported: true },
    { label: "Esperanto", value: "eo" },
    { label: "Spanish", value: "es", supported: true },
    { label: "Estonian", value: "et" },
    { label: "Basque", value: "eu" },
    { label: "Persian", value: "fa", supported: true },
    { label: "Finnish", value: "fi" },
    { label: "French", value: "fr", supported: true },
    { label: "Irish", value: "ga" },
    { label: "Galician", value: "gl" },
    { label: "Hebrew", value: "he", supported: true },
    { label: "Hindi", value: "hi", supported: true },
    { label: "Hungarian", value: "hu", supported: true },
    { label: "Indonesian", value: "id", supported: true },
    { label: "Italian", value: "it", supported: true },
    { label: "Japanese", value: "ja", supported: true },
    { label: "Korean", value: "ko", supported: true },
    { label: "Lithuanian", value: "lt" },
    { label: "Latvian", value: "lv" },
    { label: "Malay", value: "ms", supported: true },
    { label: "Norwegian", value: "nb" },
    { label: "Dutch", value: "nl", supported: true },
    { label: "Polish", value: "pl", supported: true },
    { label: "Portuguese", value: "pt", supported: true },
    { label: "Romanian", value: "ro", supported: true },
    { label: "Russian", value: "ru", supported: true },
    { label: "Slovak", value: "sk" },
    { label: "Slovenian", value: "sl" },
    { label: "Albanian", value: "sq" },
    { label: "Serbian", value: "sr" },
    { label: "Swedish", value: "sv", supported: true },
    { label: "Thai", value: "th", supported: true },
    { label: "Tagalog", value: "tl", supported: true },
    { label: "Turkish", value: "tr", supported: true },
    { label: "Ukrainian", value: "uk", supported: true },
    { label: "Urdu", value: "ur", supported: true },
    { label: "Vietnamese", value: "vi", supported: true },
    { label: "Chinese", value: "zh", supported: true },
    { label: "Chinese (traditional)", value: "zt" },
];

// Languages the user can actually pick: only those the translation instance
// serves. Picking anything else would 400 at translate time and silently fall
// back to the original (no translation), so we don't offer them.
export const supportedLanguages = languages.filter((l) => l.supported);

export default languages;
