// src/hooks/useTranslate.js

import { useEffect, useState } from "react";
import { translateText } from "../utils/translate";

export function useTranslate(text, language) {
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
  let isMounted = true;

  async function runTranslation() {
    console.log("useTranslate running:", { text, language });

    if (!text || typeof text !== "string") {
      setTranslated(text);
      return;
    }

    const trimmed = text.trim();

    if (!trimmed) {
      setTranslated(text);
      return;
    }

    if (!language || language === "en") {
      setTranslated(text);
      return;
    }

    try {
      const result = await translateText(trimmed, language);

      if (isMounted) {
        setTranslated(result);
      }
    } catch (err) {
      console.error("useTranslate error:", err);

      if (isMounted) {
        setTranslated(text);
      }
    }
  }

  runTranslation();

  return () => {
    isMounted = false;
  };
}, [text, language]);

  return translated;
}