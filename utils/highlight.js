import hljs from "highlight.js";

export default function(str, lang) {
  if (lang != null && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(lang, str).value;
    } catch (err) {
      console.error(err.stack);
    }
  }

  try {
    return hljs.highlightAuto(str).value;
  } catch (err) {
    console.error(err.stack);
  }

  return "";
}
