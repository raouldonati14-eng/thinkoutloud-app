import { useEffect, useState } from "react";
import { translateText } from "../../utils/translate";

const memoryCache = {};

export default function T({ text, lang = "en", context = "student" }) {
  const [translated, setTranslated] = useState(() => {
    if (lang === "en") return text;

    const key = `${lang}:${text}`;
    return memoryCache[key] || text;
  });

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!text) {
        if (mounted) setTranslated(text);
        return;
      }

      if (lang === "en") {
        if (mounted) setTranslated(text);
        return;
      }

      const key = `${lang}:${text}`;

      // ✅ instant render if cached
      if (memoryCache[key]) {
        setTranslated(memoryCache[key]);
        return;
      }

      const result = await translateText(text, lang, context);

      memoryCache[key] = result;

      if (mounted) setTranslated(result);
    }

    run();

    return () => {
      mounted = false;
    };
  }, [text, lang, context]);

  return translated;
}
