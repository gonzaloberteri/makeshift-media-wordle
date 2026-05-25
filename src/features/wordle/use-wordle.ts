import { useEffect, useReducer, useRef } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { applyGuess, createBoard, validateGuess } from '@/game/engine';
import type { BoardState, ValidationError } from '@/game/types';
import { ALLOWED_SET, pickRandomAnswer } from '@/game/wordlist';

import { getSeededAnswer, parseSeedFromUrl } from './dev-seed';

export type UiState = {
  board: BoardState;
  currentGuess: string;
  lastError: ValidationError | null;
  /** Index of the just-submitted row so the UI can run the reveal animation. */
  revealRowIndex: number | null;
  /** Monotonic counter so consecutive errors on the same row still re-trigger the shake. */
  errorTick: number;
};

type Action =
  | { type: 'press_letter'; letter: string }
  | { type: 'press_backspace' }
  | { type: 'submit_ok'; nextBoard: BoardState; rowIndex: number }
  | { type: 'submit_invalid'; error: ValidationError }
  | { type: 'restart'; answer: string }
  | { type: 'clear_error' }
  | { type: 'clear_reveal'; rowIndex: number };

function initState(answer: string): UiState {
  return {
    board: createBoard({ answer }),
    currentGuess: '',
    lastError: null,
    revealRowIndex: null,
    errorTick: 0,
  };
}

function reducer(state: UiState, action: Action): UiState {
  switch (action.type) {
    case 'press_letter': {
      if (state.board.status !== 'in_progress') return state;
      if (state.currentGuess.length >= state.board.wordLength) {
        return state.lastError ? { ...state, lastError: null } : state;
      }
      const letter = action.letter.toLowerCase();
      if (!/^[a-z]$/.test(letter)) return state;
      return {
        ...state,
        currentGuess: state.currentGuess + letter,
        lastError: null,
      };
    }
    case 'press_backspace': {
      if (state.board.status !== 'in_progress') return state;
      if (state.currentGuess.length === 0) {
        return state.lastError ? { ...state, lastError: null } : state;
      }
      return {
        ...state,
        currentGuess: state.currentGuess.slice(0, -1),
        lastError: null,
      };
    }
    case 'submit_ok': {
      return {
        ...state,
        board: action.nextBoard,
        currentGuess: '',
        lastError: null,
        revealRowIndex: action.rowIndex,
      };
    }
    case 'submit_invalid': {
      return {
        ...state,
        lastError: action.error,
        errorTick: state.errorTick + 1,
      };
    }
    case 'restart': {
      return initState(action.answer);
    }
    case 'clear_error': {
      return state.lastError ? { ...state, lastError: null } : state;
    }
    case 'clear_reveal': {
      if (state.revealRowIndex === action.rowIndex) {
        return { ...state, revealRowIndex: null };
      }
      return state;
    }
    default:
      return state;
  }
}

function describeError(err: ValidationError): string {
  switch (err.kind) {
    case 'too_short':
      return 'Not enough letters';
    case 'not_in_word_list':
      return 'Not in word list';
    case 'game_over':
      return 'Game is over';
  }
}

function pickInitialAnswer(): string {
  const seeded = getSeededAnswer();
  if (seeded) return seeded;
  return pickRandomAnswer();
}

/**
 * If `initialAnswerOverride` is provided (e.g. from a deep-link route param)
 * the game starts with that word instead of the random/seeded default.
 * Dev/test affordance only — `__DEV__`-gated upstream.
 */
export function useWordle(opts?: { initialAnswerOverride?: string | null }) {
  const override = opts?.initialAnswerOverride ?? null;
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initState(override && /^[a-z]{5}$/.test(override) ? override : pickInitialAnswer()),
  );

  const onLetter = (letter: string) => {
    dispatch({ type: 'press_letter', letter });
  };

  const onBackspace = () => {
    dispatch({ type: 'press_backspace' });
  };

  const onEnter = () => {
    if (state.board.status !== 'in_progress') return;
    const validation = validateGuess(state.currentGuess, {
      wordLength: state.board.wordLength,
      wordSet: ALLOWED_SET,
    });
    if (!validation.ok) {
      dispatch({ type: 'submit_invalid', error: validation.error });
      return;
    }
    const result = applyGuess(state.board, validation.normalized);
    if (!result.ok) {
      dispatch({ type: 'submit_invalid', error: result.error });
      return;
    }
    const rowIndex = state.board.guesses.length; // the row that was just submitted
    dispatch({ type: 'submit_ok', nextBoard: result.board, rowIndex });
  };

  const onRestart = () => {
    const seeded = getSeededAnswer();
    dispatch({ type: 'restart', answer: seeded ?? pickRandomAnswer() });
  };

  const onClearReveal = (rowIndex: number) => {
    dispatch({ type: 'clear_reveal', rowIndex });
  };

  // Latest-handler ref so the web keydown effect can stay registered with []
  // deps while still calling the up-to-date onEnter/onBackspace/onLetter
  // closures (which read fresh state on each render). The ref is updated in an
  // effect, never during render.
  const handlersRef = useRef({ onEnter, onBackspace, onLetter });
  useEffect(() => {
    handlersRef.current = { onEnter, onBackspace, onLetter };
  });

  // Dev-only: on native, react to seed deep links by restarting with the seeded word.
  // `__DEV__` gate so Metro strips this in release builds.
  useEffect(() => {
    if (!__DEV__) return;
    if (Platform.OS === 'web') return;
    let cancelled = false;
    Linking.getInitialURL()
      .then((url) => {
        if (cancelled) return;
        const seed = parseSeedFromUrl(url);
        if (seed) dispatch({ type: 'restart', answer: seed });
      })
      .catch(() => {
        /* ignore */
      });
    const sub = Linking.addEventListener('url', ({ url }) => {
      const seed = parseSeedFromUrl(url);
      if (seed) dispatch({ type: 'restart', answer: seed });
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Web physical keyboard support.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (key === 'Enter') {
        e.preventDefault();
        handlersRef.current.onEnter();
      } else if (key === 'Backspace') {
        e.preventDefault();
        handlersRef.current.onBackspace();
      } else if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();
        handlersRef.current.onLetter(key.toLowerCase());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const errorMessage = state.lastError ? describeError(state.lastError) : null;

  return {
    board: state.board,
    currentGuess: state.currentGuess,
    lastError: state.lastError,
    errorMessage,
    errorTick: state.errorTick,
    revealRowIndex: state.revealRowIndex,
    onLetter,
    onBackspace,
    onEnter,
    onRestart,
    onClearReveal,
  };
}
