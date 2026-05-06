/**
 * @fileoverview 操作命令值对象
 * @module domain/Move
 */

/**
 * 操作命令值对象
 *
 * 封装一次用户操作的信息。
 *
 * 设计原则：
 * - 验证方法在 Move 类内部（格式验证：坐标和值范围）
 * - 业务状态验证由 Sudoku/Game 负责
 */
export class Move {
  /** @type {number} 行索引 [0-8] */
  row;

  /** @type {number} 列索引 [0-8] */
  col;

  /** @type {number} 填入的值 [0-9]，0 表示清除 */
  value;

  /**
   * 验证 Move 参数格式是否合法（静态方法，不抛异常）
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @param {number} value - 填入的值 [0-9]
   * @returns {boolean} true = 格式合法，false = 越界或类型错误
   */
  static isValid(row, col, value) {
    if (typeof row !== 'number' || row < 0 || row > 8 || !Number.isInteger(row)) {
      return false;
    }
    if (typeof col !== 'number' || col < 0 || col > 8 || !Number.isInteger(col)) {
      return false;
    }
    if (typeof value !== 'number' || value < 0 || value > 9 || !Number.isInteger(value)) {
      return false;
    }
    return true;
  }

  /**
   * @param {{row: number, col: number, value: number}} param
   * @param {number} param.row - 行索引 [0-8]
   * @param {number} param.col - 列索引 [0-8]
   * @param {number} param.value - 填入的值 [0-9]
   * @throws {Error} 参数超出范围或类型错误
   */
  constructor({ row, col, value }) {
    if (!Move.isValid(row, col, value)) {
      throw new Error(`Move: invalid parameters (row=${row}, col=${col}, value=${value}). Row/col must be 0-8 integers, value must be 0-9 integer.`);
    }

    this.row = row;
    this.col = col;
    this.value = value;
  }

  /**
   * @returns {{row: number, col: number, value: number}}
   */
  toJSON() {
    return {
      row: this.row,
      col: this.col,
      value: this.value
    };
  }

  /**
   * @param {{row: number, col: number, value: number}} json
   * @returns {Move}
   */
  static fromJSON(json) {
    return new Move(json);
  }
}
