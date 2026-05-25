import { describe, expect, it } from '@jest/globals';

import { createBoard, submitGuess, validateGuess } from './engine';
import type { BoardState, LetterStatus, SubmitResult } from './types';
import { ALLOWED_SET, ANSWERS } from './wordlist';

// ---------- helpers ----------

/** Compact assertion for a guess's tile statuses, in order. */
function statusesOf(result: SubmitResult): LetterStatus[] {
  if (!result.ok) throw new Error('expected ok result');
  return result.evaluation.tiles.map((t) => t.status);
}

/** A wordSet that always says yes — lets us exercise applyGuess via submitGuess
 *  without depending on the curated word list. */
const PERMISSIVE_WORDSET: ReadonlySet<string> = new Set<string>([
  // canonical examples used across the suite
  'alloy',
  'aloha',
  'llama',
  'apple',
  'apply',
  'pleat',
  'crane',
  'zebra',
  'plumb',
  'fight',
  'noise',
  'magic',
  'house',
  'route',
  'snake',
  'place',
  'plate',
  'spore',
  'spurt',
  'spurs',
  'spire',
  'speed',
]);

function ok<T extends SubmitResult>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) {
    throw new Error(`expected ok; got error ${JSON.stringify(r.error)}`);
  }
  return r as Extract<T, { ok: true }>;
}

// ---------- wordlist sanity ----------

describe('wordlist', () => {
  it('every answer is in the allowed set (ANSWERS ⊆ ALLOWED)', () => {
    const missing = ANSWERS.filter((a) => !ALLOWED_SET.has(a));
    expect(missing).toEqual([]);
  });

  it('has a non-trivial number of answers and allowed guesses', () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(200);
    expect(ALLOWED_SET.size).toBeGreaterThanOrEqual(2000);
    expect(ALLOWED_SET.size).toBeGreaterThanOrEqual(ANSWERS.length);
  });

  it('answers and allowed entries are all length 5, lowercase', () => {
    const isCanon = (w: string) => w.length === 5 && /^[a-z]+$/.test(w);
    expect(ANSWERS.every(isCanon)).toBe(true);
    expect([...ALLOWED_SET].every(isCanon)).toBe(true);
  });
});

// ---------- createBoard ----------

describe('createBoard', () => {
  it('normalizes answer to lowercase and initializes keyStatuses to unused', () => {
    const board = createBoard({ answer: 'APPLE' });
    expect(board.answer).toBe('apple');
    expect(board.wordLength).toBe(5);
    expect(board.maxGuesses).toBe(6);
    expect(board.guesses).toEqual([]);
    expect(board.status).toBe('in_progress');
    expect(Object.keys(board.keyStatuses).length).toBe(26);
    expect(Object.values(board.keyStatuses).every((v) => v === 'unused')).toBe(true);
  });

  it('throws if the answer length does not match wordLength', () => {
    expect(() => createBoard({ answer: 'cat' })).toThrow();
  });
});

// ---------- validateGuess (negative paths) ----------

describe('validateGuess', () => {
  const wordSet = PERMISSIVE_WORDSET;

  it('rejects guesses shorter than wordLength as too_short', () => {
    const result = validateGuess('cat', { wordLength: 5, wordSet });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ kind: 'too_short' });
  });

  it('rejects guesses longer than wordLength as too_short', () => {
    const result = validateGuess('toolong', { wordLength: 5, wordSet });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ kind: 'too_short' });
  });

  it('rejects words not in the allowed wordSet as not_in_word_list', () => {
    const result = validateGuess('zzzzz', { wordLength: 5, wordSet });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ kind: 'not_in_word_list' });
  });

  it('accepts and normalizes case/whitespace for valid guesses', () => {
    const result = validateGuess('  APPLE ', { wordLength: 5, wordSet });
    expect(result).toEqual({ ok: true, normalized: 'apple' });
  });
});

// ---------- applyGuess: evaluation correctness ----------

describe('applyGuess / submitGuess — evaluation', () => {
  it('correct guess on first try → transition won, status won, all tiles correct', () => {
    const board = createBoard({ answer: 'apple' });
    const result = ok(submitGuess(board, 'apple', PERMISSIVE_WORDSET));
    expect(result.transition).toBe('won');
    expect(result.board.status).toBe('won');
    expect(statusesOf(result)).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('correct guess on the sixth try → transition won, not lost', () => {
    let board: BoardState = createBoard({ answer: 'apple' });
    // 5 wrong guesses
    for (let i = 0; i < 5; i++) {
      const r = ok(submitGuess(board, 'crane', PERMISSIVE_WORDSET));
      board = r.board;
      expect(r.transition).toBe('continue');
      expect(board.status).toBe('in_progress');
    }
    const final = ok(submitGuess(board, 'apple', PERMISSIVE_WORDSET));
    expect(final.transition).toBe('won');
    expect(final.board.status).toBe('won');
  });

  it('partial match: produces greens, yellows, and greys in distinct positions', () => {
    // answer "place"  guess "plumb"
    // p p → correct
    // l l → correct
    // a u → absent
    // c m → absent
    // e b → absent
    const board = createBoard({ answer: 'place' });
    const result = ok(submitGuess(board, 'plumb', PERMISSIVE_WORDSET));
    expect(statusesOf(result)).toEqual(['correct', 'correct', 'absent', 'absent', 'absent']);

    // answer "spore"  guess "spurs" → greens p+s, yellow s wraps? Use cleaner case:
    // answer "spore"  guess "spire" → s correct, p correct, i absent, r correct, e correct
    const board2 = createBoard({ answer: 'spore' });
    const r2 = ok(submitGuess(board2, 'spire', PERMISSIVE_WORDSET));
    expect(statusesOf(r2)).toEqual(['correct', 'correct', 'absent', 'correct', 'correct']);

    // greens + yellows + greys in distinct positions: answer "crane" guess "place"
    // p c → absent
    // l r → absent
    // a a → correct
    // c n → absent  (c is in answer but already consumed? no, c is unresolved letter; answer has one c at pos 0, not yet matched green; so it's present)
    //   Recompute: pos0 p vs c → not green; pool[c]=1, pool[r]=1, pool[n]=1, pool[e]=1 (a is green so removed)
    //   pos1 l vs r → not in pool → absent
    //   pos3 c vs n → c in pool (count 1) → present, decrement
    //   pos4 e vs e → green
    // So: [absent, absent, correct, present, correct]
    const board3 = createBoard({ answer: 'crane' });
    const r3 = ok(submitGuess(board3, 'place', PERMISSIVE_WORDSET));
    expect(statusesOf(r3)).toEqual(['absent', 'absent', 'correct', 'present', 'correct']);
  });

  // The canonical duplicate-letter case from the spec.
  it('duplicate letter beyond answer count is absent (ALLOY vs ALOHA)', () => {
    // answer "aloha" guess "alloy"
    // pos0 a a → correct
    // pos1 l l → correct
    // pos2 l o → not green; pool after greens: o,h,a (l consumed once, but answer has only one l → none in pool); pool[l]=0 → absent
    // pos3 o h → o in pool → present
    // pos4 y a → not in pool → absent
    const board = createBoard({ answer: 'aloha' });
    const result = ok(submitGuess(board, 'alloy', PERMISSIVE_WORDSET));
    expect(statusesOf(result)).toEqual(['correct', 'correct', 'absent', 'present', 'absent']);
  });

  it('duplicate letters in the guess when answer also has duplicates (LLAMA vs ALOHA)', () => {
    // answer "aloha" guess "llama"
    // greens pass:
    //   pos0 l vs a → no  → pool[a]+=1
    //   pos1 l vs l → CORRECT
    //   pos2 a vs o → no  → pool[o]+=1
    //   pos3 m vs h → no  → pool[h]+=1
    //   pos4 a vs a → CORRECT
    // pool after greens: { a:1, o:1, h:1 }
    // yellows/greys pass on unresolved positions:
    //   pos0 l: pool[l]? 0 → absent
    //   pos2 a: pool[a]=1 → present (decrement → 0)
    //   pos3 m: 0 → absent
    const board = createBoard({ answer: 'aloha' });
    const result = ok(submitGuess(board, 'llama', PERMISSIVE_WORDSET));
    expect(statusesOf(result)).toEqual(['absent', 'correct', 'present', 'absent', 'correct']);
  });

  it('keyStatuses aggregates with correct precedence — never downgrades from correct to present', () => {
    // answer "apple"
    // first guess "spurs" — `p` ends up... wait, simpler:
    // Step A: guess "apply"
    //   pos0 a a → correct, pos1 p p → correct, pos2 p p → correct,
    //   pos3 l l → correct, pos4 y e → absent
    //   keyStatuses: a=correct, p=correct, l=correct, y=absent
    // Step B: guess "pleat"
    //   answer apple
    //   pos0 p a → not green; pool[a]=1
    //   pos1 l p → not green; pool[p]=1
    //   pos2 e p → not green; pool[p]=2
    //   pos3 a l → not green; pool[l]=1
    //   pos4 t e → not green; pool[e]=1
    //   passes:
    //   pos0 p → pool[p]=2 → present (decrement → 1)
    //   pos1 l → pool[l]=1 → present (decrement → 0)
    //   pos2 e → pool[e]=1 → present (decrement → 0)
    //   pos3 a → pool[a]=1 → present (decrement → 0)
    //   pos4 t → pool[t]=0 → absent
    //   Now, incoming key updates: p=present, l=present, e=present, a=present, t=absent
    //   Existing: p=correct, l=correct, a=correct → must NOT downgrade.
    //   Final keys after Step B:
    //     a=correct, p=correct, l=correct, y=absent, e=present, t=absent
    const board0 = createBoard({ answer: 'apple' });
    const step1 = ok(submitGuess(board0, 'apply', PERMISSIVE_WORDSET));
    const step2 = ok(submitGuess(step1.board, 'pleat', PERMISSIVE_WORDSET));

    expect(step2.board.keyStatuses.a).toBe('correct');
    expect(step2.board.keyStatuses.p).toBe('correct');
    expect(step2.board.keyStatuses.l).toBe('correct');
    expect(step2.board.keyStatuses.y).toBe('absent');
    expect(step2.board.keyStatuses.e).toBe('present');
    expect(step2.board.keyStatuses.t).toBe('absent');
  });

  it('also promotes from absent → present → correct (precedence works upward too)', () => {
    // answer "spore"
    // Step A: guess "snake" — s correct, n absent, a absent, k absent, e correct
    //   keys: s=correct, n=absent, a=absent, k=absent, e=correct
    // Step B: guess "route" against "spore"
    //   pos0 r vs s → not green; pos1 o vs p → not green; pos2 u vs o → not green;
    //   pos3 t vs r → not green; pos4 e vs e → green
    //   pool after greens: { s:1, p:1, o:1, r:1 }
    //   pos0 r → pool[r]=1 → present
    //   pos1 o → pool[o]=1 → present
    //   pos2 u → 0 → absent
    //   pos3 t → 0 → absent
    //   keys upgrade: r:unused→present, o:unused→present, u:unused→absent, t:unused→absent, e stays correct
    const board0 = createBoard({ answer: 'spore' });
    const a = ok(submitGuess(board0, 'snake', PERMISSIVE_WORDSET));
    expect(a.board.keyStatuses.s).toBe('correct');
    expect(a.board.keyStatuses.e).toBe('correct');
    expect(a.board.keyStatuses.n).toBe('absent');

    const b = ok(submitGuess(a.board, 'route', PERMISSIVE_WORDSET));
    expect(b.board.keyStatuses.r).toBe('present');
    expect(b.board.keyStatuses.o).toBe('present');
    expect(b.board.keyStatuses.u).toBe('absent');
    expect(b.board.keyStatuses.t).toBe('absent');
    expect(b.board.keyStatuses.e).toBe('correct'); // never downgraded

    // Step C: guess "spore" — full win promotes o from present → correct (upward).
    const c = ok(submitGuess(b.board, 'spore', PERMISSIVE_WORDSET));
    expect(c.transition).toBe('won');
    expect(c.board.keyStatuses.o).toBe('correct');
    expect(c.board.keyStatuses.p).toBe('correct');
    expect(c.board.keyStatuses.r).toBe('correct');
  });
});

// ---------- terminal / negative transitions ----------

describe('terminal transitions', () => {
  it('sixth wrong guess → status lost, transition lost', () => {
    let board: BoardState = createBoard({ answer: 'apple' });
    for (let i = 0; i < 5; i++) {
      const r = ok(submitGuess(board, 'crane', PERMISSIVE_WORDSET));
      board = r.board;
      expect(r.transition).toBe('continue');
    }
    const final = ok(submitGuess(board, 'zebra', PERMISSIVE_WORDSET));
    expect(final.transition).toBe('lost');
    expect(final.board.status).toBe('lost');
    expect(final.board.guesses.length).toBe(6);
  });

  it('guess after status === won → not ok, error game_over', () => {
    const board = createBoard({ answer: 'apple' });
    const win = ok(submitGuess(board, 'apple', PERMISSIVE_WORDSET));
    expect(win.board.status).toBe('won');
    const after = submitGuess(win.board, 'apply', PERMISSIVE_WORDSET);
    expect(after.ok).toBe(false);
    if (!after.ok) expect(after.error).toEqual({ kind: 'game_over' });
  });

  it('guess after status === lost → not ok, error game_over', () => {
    let board: BoardState = createBoard({ answer: 'apple' });
    for (let i = 0; i < 6; i++) {
      const r = ok(submitGuess(board, 'crane', PERMISSIVE_WORDSET));
      board = r.board;
    }
    expect(board.status).toBe('lost');
    const after = submitGuess(board, 'apple', PERMISSIVE_WORDSET);
    expect(after.ok).toBe(false);
    if (!after.ok) expect(after.error).toEqual({ kind: 'game_over' });
  });

  it('submitGuess surfaces too_short before applying', () => {
    const board = createBoard({ answer: 'apple' });
    const r = submitGuess(board, 'cat', PERMISSIVE_WORDSET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: 'too_short' });
    // state unchanged: applying again still works
    const ok1 = ok(submitGuess(board, 'apple', PERMISSIVE_WORDSET));
    expect(ok1.transition).toBe('won');
  });

  it('submitGuess surfaces not_in_word_list before applying', () => {
    const board = createBoard({ answer: 'apple' });
    const r = submitGuess(board, 'zzzzz', PERMISSIVE_WORDSET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: 'not_in_word_list' });
  });
});

// ---------- immutability ----------

describe('purity', () => {
  it('does not mutate the input board', () => {
    const board = createBoard({ answer: 'apple' });
    const snapshot = JSON.stringify(board);
    submitGuess(board, 'apply', PERMISSIVE_WORDSET);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
