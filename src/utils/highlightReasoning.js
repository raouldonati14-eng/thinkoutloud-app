export const highlightReasoning = (text) => {
  if (!text) return "";

  const patterns = [
    /because/gi,
    /since/gi,
    /\bso\b/gi,
    /so that/gi,
    /so it/gi,
    /therefore/gi,
    /thus/gi,
    /as a result/gi,
    /this means/gi,
    /this shows/gi,
    /that'?s why/gi,
    /which means/gi,
    /which leads to/gi,
    /leads to/gi,
    /can lead to/gi,
    /results in/gi,
    /results?/gi,
    /due to/gi,
    /causes?/gi,
    /creates?/gi,
    /makes?/gi,
    /allows?/gi,
    /driven by/gi
  ];

  let result = text;

  patterns.forEach((pattern) => {
    result = result.replace(
      pattern,
      (match) =>
        `<span style="background-color:#fde68a; font-weight:600;">${match}</span>`
    );
  });

  return result;
};