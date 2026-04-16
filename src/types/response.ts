export interface Reasoning {
  claim: boolean;
  evidence: boolean;
  counterargument: boolean;
}

export interface AIFeedback {
  score: number;
  correct: string;
  incorrect: string;
  suggestion: string;
}

export interface Response {
  id: string;
  classId: string;
  questionId: string;
  studentId: string;
  originalText: string;
  language: string;
  translatedText: string;
  reasoning: Reasoning | null;
  aiFeedback: AIFeedback | null;
  isNew: boolean;
  createdAt: any; // or Timestamp later
  createdAtClient: number;
}