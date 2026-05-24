import type {
  BoardState,
  EvaluatedTile,
  KeyStatus,
  LetterStatus,
  SubmitResult,
  SubmittedGuess,
  ValidationError,
} from './types';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const STATUS_RANK: Record<KeyStatus, number> = {
  unused: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

function emptyKeyStatuses(): Record<string, KeyStatus> {
  const map: Record<string, KeyStatus> = {};
  for (const letter of LETTERS) {
    map[letter] = 'unused';
  }
  return map;
}

export function createBoard(opts: {
  answer: string;
  wordLength?: 5;
  maxGuesses?: 6;
}): BoardState {
  const wordLength = opts.wordLength ?? 5;
  const maxGuesses = opts.maxGuesses ?? 6;
  const answer = opts.answer.toLowerCase();
  if (answer.length !== wordLength) {
    throw new Error(
      `createBoard: answer length ${answer.length} does not match wordLength ${wordLength}`,
    );
  }
  return {
    answer,
    wordLength,
    maxGuesses,
    guesses: [],
    status: 'in_progress',
    keyStatuses: emptyKeyStatuses(),
  };
}

export function validateGuess(
  raw: string,
  opts: { wordLength: number; wordSet: ReadonlySet<string> },
):
  | { ok: true; normalized: string }
  | { ok: false; error: ValidationError } {
  const normalized = (raw ?? '').trim().toLowerCase();
  if (normalized.length !== opts.wordLength) {
    return { ok: false, error: { kind: 'too_short' } };
  }
  if (!opts.wordSet.has(normalized)) {
    return { ok: false, error: { kind: 'not_in_word_list' } };
  }
  return { ok: true, normalized };
}

function evaluateGuess(answer: string, guess: string): SubmittedGuess {
  const length = answer.length;
  const statuses: LetterStatus[] = new Array(length).fill('absent');
  // Pool of remaining (non-green) answer letters.
  const pool: Record<string, number> = {};

  // Pass 1: greens. Build the pool from non-green letters.
  for (let i = 0; i < length; i++) {
    if (guess[i] === answer[i]) {
      statuses[i] = 'correct';
    } else {
      pool[answer[i]] = (pool[answer[i]] ?? 0) + 1;
    }
  }

  // Pass 2: yellows / greys.
  for (let i = 0; i < length; i++) {
    if (statuses[i] === 'correct') continue;
    const g = guess[i];
    if ((pool[g] ?? 0) > 0) {
      statuses[i] = 'present';
      pool[g] -= 1;
    } else {
      statuses[i] = 'absent';
    }
  }

  const tiles: EvaluatedTile[] = [];
  for (let i = 0; i < length; i++) {
    tiles.push({ letter: guess[i], status: statuses[i] });
  }
  return { tiles };
}

function mergeKeyStatuses(
  prev: Record<string, KeyStatus>,
  evaluation: SubmittedGuess,
): Record<string, KeyStatus> {
  const next: Record<string, KeyStatus> = { ...prev };
  for (const tile of evaluation.tiles) {
    const current = next[tile.letter] ?? 'unused';
    const incoming: KeyStatus = tile.status;
    if (STATUS_RANK[incoming] > STATUS_RANK[current]) {
      next[tile.letter] = incoming;
    }
  }
  return next;
}

export function applyGuess(
  board: BoardState,
  normalizedGuess: string,
): SubmitResult {
  if (board.status !== 'in_progress') {
    return { ok: false, error: { kind: 'game_over' } };
  }

  const evaluation = evaluateGuess(board.answer, normalizedGuess);
  const guesses = [...board.guesses, evaluation];
  const keyStatuses = mergeKeyStatuses(board.keyStatuses, evaluation);

  const isWin = normalizedGuess === board.answer;
  const isOutOfGuesses = guesses.length >= board.maxGuesses;

  let status: BoardState['status'] = 'in_progress';
  let transition: 'won' | 'lost' | 'continue' = 'continue';
  if (isWin) {
    status = 'won';
    transition = 'won';
  } else if (isOutOfGuesses) {
    status = 'lost';
    transition = 'lost';
  }

  const nextBoard: BoardState = {
    ...board,
    guesses,
    keyStatuses,
    status,
  };

  return { ok: true, board: nextBoard, evaluation, transition };
}

export function submitGuess(
  board: BoardState,
  raw: string,
  wordSet: ReadonlySet<string>,
): SubmitResult {
  if (board.status !== 'in_progress') {
    return { ok: false, error: { kind: 'game_over' } };
  }
  const validation = validateGuess(raw, {
    wordLength: board.wordLength,
    wordSet,
  });
  if (!validation.ok) {
    return validation;
  }
  return applyGuess(board, validation.normalized);
}
