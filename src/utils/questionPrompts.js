function shortenQuestion(questionText) {
  if (!questionText) return "this essential question";

  const trimmed = questionText.trim();
  if (trimmed.length <= 110) return trimmed;
  return `${trimmed.slice(0, 107).trim()}...`;
}

export function buildQuestionPrompts(questionText, category = "the lesson") {
  const shortQuestion = shortenQuestion(questionText);
  const topic = category || "the lesson";

  return {
    discussionPrompts: [
      `What is the strongest main idea someone could use to answer: "${shortQuestion}"`,
      `What evidence from the ${topic} lesson would make an answer stronger?`,
      `Which vocabulary words should appear in a strong response to this question?`,
      `What is one idea a classmate might misunderstand, and how would you clarify it?`
    ],
    reflectionPrompts: [
      `How did your answer to "${shortQuestion}" improve after listening to other responses?`,
      `What is one part of your reasoning you would revise to make it clearer or more complete?`,
      `Which lesson detail or vocabulary word helped strengthen your response the most?`,
      `If you answered this question again, what would you add to earn a stronger score?`
    ]
  };
}

export function resolveQuestionPrompts(question) {
  const generated = buildQuestionPrompts(question?.text, question?.category);

  return {
    discussionPrompts:
      question?.discussionPrompts?.length > 0
        ? question.discussionPrompts
        : generated.discussionPrompts,
    reflectionPrompts:
      question?.reflectionPrompts?.length > 0
        ? question.reflectionPrompts
        : generated.reflectionPrompts
  };
}
