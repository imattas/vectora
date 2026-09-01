import { expect, test } from 'vitest';
import Tokenizer from './tokenizer.ts';

test('tracks token line numbers across multiline input', () => {
  const tokenize = Tokenizer({
    whitespace: /\s$/,
    symbol: /^[a-z]$/,
    invalid: () => false,
  });
  expect([...tokenize('a\n  b')].map(token => [token.str, token.line])).toEqual([
    ['a', 1], ['\n  ', 1], ['b', 2],
  ]);
});
