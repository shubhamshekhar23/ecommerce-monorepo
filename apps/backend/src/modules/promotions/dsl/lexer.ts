export type TokenType =
  | 'IF'
  | 'THEN'
  | 'AND'
  | 'OR'
  | 'IDENT'
  | 'NUMBER'
  | 'STRING'
  | 'OP'
  | 'LPAREN'
  | 'RPAREN'
  | 'COLON'
  | 'COMMA'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const KEYWORDS = new Set(['IF', 'THEN', 'AND', 'OR']);

export function tokenise(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    if (input[i] === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i++ });
      continue;
    }
    if (input[i] === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i++ });
      continue;
    }
    if (input[i] === ':') {
      tokens.push({ type: 'COLON', value: ':', pos: i++ });
      continue;
    }
    if (input[i] === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i++ });
      continue;
    }

    if (/[><!]/.test(input[i]) || input[i] === '=') {
      let op = input[i++];
      if (i < input.length && input[i] === '=') op += input[i++];
      tokens.push({ type: 'OP', value: op, pos: i - op.length });
      continue;
    }

    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i++];
      let str = '';
      while (i < input.length && input[i] !== quote) str += input[i++];
      i++;
      tokens.push({ type: 'STRING', value: str, pos: i });
      continue;
    }

    if (/\d/.test(input[i])) {
      let num = '';
      while (i < input.length && /[\d.]/.test(input[i])) num += input[i++];
      tokens.push({ type: 'NUMBER', value: num, pos: i });
      continue;
    }

    if (/[a-zA-Z_]/.test(input[i])) {
      let word = '';
      while (i < input.length && /[a-zA-Z0-9_.]/.test(input[i])) word += input[i++];
      const upper = word.toUpperCase();
      const type: TokenType = KEYWORDS.has(upper) ? (upper as TokenType) : 'IDENT';
      tokens.push({ type, value: word, pos: i });
      continue;
    }

    throw new Error(`Unexpected character '${input[i]}' at position ${i}`);
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}
