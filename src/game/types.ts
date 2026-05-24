export type LetterStatus = 'correct' | 'present' | 'absent';
export type KeyStatus = LetterStatus | 'unused';
export type GameStatus = 'in_progress' | 'won' | 'lost';

export interface EvaluatedTile {
  letter: string;
  status: LetterStatus;
}

export interface SubmittedGuess {
  tiles: EvaluatedTile[];
}

export interface BoardState {
  answer: string; // lowercase, length === wordLength
  wordLength: number; // 5
  maxGuesses: number; // 6
  guesses: SubmittedGuess[]; // submitted only, never the in-progress row
  status: GameStatus;
  keyStatuses: Record<string, KeyStatus>; // 'a'..'z' aggregate
}

export type ValidationError =
  | { kind: 'too_short' }
  | { kind: 'not_in_word_list' }
  | { kind: 'game_over' };

export type SubmitResult =
  | {
      ok: true;
      board: BoardState;
      evaluation: SubmittedGuess;
      transition: 'won' | 'lost' | 'continue';
    }
  | { ok: false; error: ValidationError };
