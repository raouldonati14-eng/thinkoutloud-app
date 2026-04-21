import { useEffect, useMemo, useState } from "react";
import { translateMany } from "../utils/translate";

export function useBatchTranslate(texts = [], language = "en", context = "student") {
  const safeTexts = useMemo(
    () => texts.filter((text) => typeof text === "string" && text.trim().length > 0),
    [texts]
  );

  const [translated, setTranslated] = useState(safeTexts);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (safeTexts.length === 0) {
        setTranslated([]);
        return;
      }

      if (!language || language === "en") {
        setTranslated(safeTexts);
        return;
      }

      try {
        const result = await translateMany(safeTexts, language, context);
        if (!cancelled) {
          setTranslated(Array.isArray(result) ? result : safeTexts);
        }
      } catch (err) {
        console.error("useBatchTranslate error:", err);
        if (!cancelled) {
          setTranslated(safeTexts);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [safeTexts, language, context]);

  return translated;
}