export interface QuestionCard {
  question: string;
  answer: string;
  due_time: number; // 毫秒时间戳
}

export interface QuestionDeck {
  cards: QuestionCard[];
}

export interface QuestionDeckContent {
  question_deck: QuestionDeck;
}

export interface ListFilesData {
  filenames: string[];
}

