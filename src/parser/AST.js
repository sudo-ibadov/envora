/**
 * @fileoverview AST node definitions for the Envora parser.
 *
 * Each node represents a part of a .envora configuration file.
 * Nodes carry line/column metadata for error reporting.
 */

/**
 * The root node — represents the entire file.
 * Contains a list of top-level entries (sections or assignments).
 */
export class DocumentNode {
  /**
   * @param {Array<SectionNode|AssignmentNode>} entries
   */
  constructor(entries) {
    this.type = 'Document';
    this.entries = entries;
  }
}

/**
 * A named block: IDENTIFIER { ... }
 * e.g. APP { name: "My App" }
 */
export class SectionNode {
  /**
   * @param {string} name
   * @param {Array<AssignmentNode|SectionNode>} body
   * @param {number} line
   * @param {number} column
   */
  constructor(name, body, line, column) {
    this.type = 'Section';
    this.name = name;
    this.body = body;
    this.line = line;
    this.column = column;
  }
}

/**
 * A key-value assignment: key: value  or  KEY = value
 */
export class AssignmentNode {
  /**
   * @param {string} key
   * @param {ASTValueNode} value
   * @param {number} line
   * @param {number} column
   */
  constructor(key, value, line, column) {
    this.type = 'Assignment';
    this.key = key;
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

/**
 * A string literal node.
 * The value may contain interpolation references like ${SERVER.host}
 */
export class StringNode {
  /**
   * @param {string} value - The raw string value (not yet interpolated)
   * @param {number} line
   * @param {number} column
   */
  constructor(value, line, column) {
    this.type = 'String';
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

/**
 * A numeric literal node.
 */
export class NumberNode {
  /**
   * @param {number} value
   * @param {number} line
   * @param {number} column
   */
  constructor(value, line, column) {
    this.type = 'Number';
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

/**
 * A boolean literal node.
 */
export class BooleanNode {
  /**
   * @param {boolean} value
   * @param {number} line
   * @param {number} column
   */
  constructor(value, line, column) {
    this.type = 'Boolean';
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

/**
 * A null literal node.
 */
export class NullNode {
  /**
   * @param {number} line
   * @param {number} column
   */
  constructor(line, column) {
    this.type = 'Null';
    this.value = null;
    this.line = line;
    this.column = column;
  }
}

/**
 * An array literal node: [ value, value, ... ]
 */
export class ArrayNode {
  /**
   * @param {ASTValueNode[]} elements
   * @param {number} line
   * @param {number} column
   */
  constructor(elements, line, column) {
    this.type = 'Array';
    this.elements = elements;
    this.line = line;
    this.column = column;
  }
}

/**
 * An inline object literal node: { key: value, ... }
 * (distinct from a named SectionNode)
 */
export class ObjectNode {
  /**
   * @param {AssignmentNode[]} entries
   * @param {number} line
   * @param {number} column
   */
  constructor(entries, line, column) {
    this.type = 'Object';
    this.entries = entries;
    this.line = line;
    this.column = column;
  }
}

/**
 * An env() call node.
 */
export class EnvCallNode {
  /**
   * @param {string} varName - Environment variable name
   * @param {ASTValueNode|null} defaultValue - Optional default value node
   * @param {number} line
   * @param {number} column
   */
  constructor(varName, defaultValue, line, column) {
    this.type = 'EnvCall';
    this.varName = varName;
    this.defaultValue = defaultValue;
    this.line = line;
    this.column = column;
  }
}

/**
 * A required() call node — like env() but throws if missing.
 */
export class RequiredCallNode {
  /**
   * @param {string} varName
   * @param {number} line
   * @param {number} column
   */
  constructor(varName, line, column) {
    this.type = 'RequiredCall';
    this.varName = varName;
    this.line = line;
    this.column = column;
  }
}

/**
 * A secret() call node — wraps another value and marks it sensitive.
 */
export class SecretCallNode {
  /**
   * @param {ASTValueNode} inner - The wrapped value (usually EnvCallNode)
   * @param {number} line
   * @param {number} column
   */
  constructor(inner, line, column) {
    this.type = 'SecretCall';
    this.inner = inner;
    this.line = line;
    this.column = column;
  }
}

/**
 * @typedef {StringNode|NumberNode|BooleanNode|NullNode|ArrayNode|ObjectNode|EnvCallNode|RequiredCallNode|SecretCallNode} ASTValueNode
 */
