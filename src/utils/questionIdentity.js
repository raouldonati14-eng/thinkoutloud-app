export function resolveQuestionIdentity(classData = {}) {
  const category = (classData?.category || "General").trim();
  const lesson = Number(classData?.currentLesson) || 1;
  const explicitTitle = `${classData?.currentQuestion || ""}`.trim();
  const fallbackTitle = `${category} Lesson ${lesson} Question 1`;

  return {
    title: explicitTitle || fallbackTitle,
    text: classData?.essentialQuestion || ""
  };
}

