import { tokenise, Token } from './lexer';

export interface CompareNode {
  type: 'compare';
  field: string;
  op: string;
  value: string | number;
}

export interface BinaryNode {
  type: 'binary';
  op: 'AND' | 'OR';
  left: ConditionNode;
  right: ConditionNode;
}

export type ConditionNode = CompareNode | BinaryNode;

export interface ActionNode {
  type: 'action';
  name: string;
  args: Record<string, string | number>;
}

export interface RuleNode {
  type: 'rule';
  condition: ConditionNode;
  action: ActionNode;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }
  private consume(type?: string): Token {
    const tok = this.tokens[this.pos++];
    if (type && tok.type !== type) {
      throw new Error(`Expected ${type} but got ${tok.type} ('${tok.value}') at pos ${tok.pos}`);
    }
    return tok;
  }

  parse(): RuleNode {
    this.consume('IF');
    const condition = this.parseCondition();
    this.consume('THEN');
    const action = this.parseAction();
    return { type: 'rule', condition, action };
  }

  private parseCondition(): ConditionNode {
    let left = this.parseComparison();
    while (this.peek().type === 'AND' || this.peek().type === 'OR') {
      const op = this.consume().type as 'AND' | 'OR';
      const right = this.parseComparison();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  private parseComparison(): ConditionNode {
    const field = this.consume('IDENT').value;
    const op = this.consume('OP').value;
    const valTok = this.peek();
    let value: string | number;
    if (valTok.type === 'NUMBER') {
      value = parseFloat(this.consume().value);
    } else if (valTok.type === 'STRING') {
      value = this.consume().value;
    } else {
      throw new Error(`Expected value but got ${valTok.type}`);
    }
    return { type: 'compare', field, op, value };
  }

  private parseAction(): ActionNode {
    const name = this.consume('IDENT').value;
    this.consume('LPAREN');
    const args: Record<string, string | number> = {};
    while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
      const key = this.consume('IDENT').value;
      this.consume('COLON');
      const valTok = this.peek();
      if (valTok.type === 'NUMBER') {
        args[key] = parseFloat(this.consume().value);
      } else if (valTok.type === 'STRING') {
        args[key] = this.consume().value;
      } else {
        throw new Error(`Expected value for arg ${key}`);
      }
      if (this.peek().type === 'COMMA') this.consume('COMMA');
    }
    this.consume('RPAREN');
    return { type: 'action', name, args };
  }
}

export function parseDsl(input: string): RuleNode {
  const tokens = tokenise(input);
  return new Parser(tokens).parse();
}
