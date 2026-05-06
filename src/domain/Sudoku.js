/**
 * @fileoverview 数独棋盘领域对象
 * @module domain/Sudoku
 */

import { Move } from './Move.js';

/**
 * 数独棋盘领域对象
 * 
 * 设计原则：
 * - 持有 grid 和 fixed 数据
 * - guess() 直接修改实例（可变设计，兼容测试用例）
 * - clone() 用于显式深拷贝（如保存历史快照）
 * - 所有公开方法都有输入验证，防止外部污染
 */
export class Sudoku {
  /** @type {number[][]} 9x9 数独棋盘，值为 0-9（0 表示空格） */
  _grid;
  
  /** @type {boolean[][]} 9x9 固定掩码，true = 固定不可改 */
  _fixed;

  /**
   * @param {number[][] | {grid: number[][], fixed: boolean[][]}} input
   * 
   * 支持两种格式：
   * - 简化格式：9x9 数字数组（大于 0 视为固定）
   * - 完整格式：{ grid: 9x9数组, fixed: 9x9布尔数组 }
   * 
   * @throws {Error} input 为空或格式无效
   */
  constructor(input) {
    if (!input) {
      throw new Error('Sudoku: constructor requires valid input');
    }

    if (input && input.grid && input.fixed) {
      // 完整格式：{ grid, fixed }
      this._validateGrid(input.grid);
      this._validateFixed(input.fixed);
      this._grid = input.grid.map(row => [...row]);
      this._fixed = input.fixed.map(row => [...row]);
    } else {
      // 简化格式：纯 grid，> 0 的视为固定数字
      this._validateGrid(input);
      this._grid = input.map(row => [...row]);
      this._fixed = this._grid.map(row => row.map(v => v !== 0));
    }
  }

  /**
   * @private
   * @param {number[][]} grid - 9x9 数字数组
   * @throws {Error} grid 不是 9x9 数组或包含非法值
   */
  _validateGrid(grid) {
    if (!Array.isArray(grid) || grid.length !== 9) {
      throw new Error('Sudoku: grid must be a 9x9 array');
    }
    for (let r = 0; r < 9; r++) {
      if (!Array.isArray(grid[r]) || grid[r].length !== 9) {
        throw new Error(`Sudoku: grid row ${r} must have 9 elements`);
      }
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (typeof val !== 'number' || val < 0 || val > 9 || !Number.isInteger(val)) {
          throw new Error(`Sudoku: grid[${r}][${c}] must be integer 0-9, got ${val}`);
        }
      }
    }
  }

  /**
   * @private
   * @param {boolean[][]} fixed - 9x9 布尔数组
   * @throws {Error} fixed 不是 9x9 布尔数组
   */
  _validateFixed(fixed) {
    if (!Array.isArray(fixed) || fixed.length !== 9) {
      throw new Error('Sudoku: fixed must be a 9x9 boolean array');
    }
    for (let r = 0; r < 9; r++) {
      if (!Array.isArray(fixed[r]) || fixed[r].length !== 9) {
        throw new Error(`Sudoku: fixed row ${r} must have 9 elements`);
      }
      for (let c = 0; c < 9; c++) {
        if (typeof fixed[r][c] !== 'boolean') {
          throw new Error(`Sudoku: fixed[${r}][${c}] must be boolean, got ${typeof fixed[r][c]}`);
        }
      }
    }
  }

  /**
   * @private
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @throws {Error} 坐标超出范围
   */
  _validateCoord(row, col) {
    if (typeof row !== 'number' || row < 0 || row > 8 || !Number.isInteger(row)) {
      throw new Error(`Sudoku: row must be 0-8 integer, got ${row}`);
    }
    if (typeof col !== 'number' || col < 0 || col > 8 || !Number.isInteger(col)) {
      throw new Error(`Sudoku: col must be 0-8 integer, got ${col}`);
    }
  }

  /**
   * 获取棋盘数据（返回深拷贝）
   * @returns {number[][]} 9x9 数组，值为 0-9
   */
  getGrid() {
    return this._grid.map(row => [...row]);
  }

  /**
   * 获取固定掩码（返回深拷贝）
   * @returns {boolean[][]} 9x9 布尔数组
   */
  getFixed() {
    return this._fixed.map(row => [...row]);
  }

  /**
   * 判断指定位置是否是固定格子
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @returns {boolean} true = 固定不可改
   * @throws {Error} 坐标超出范围
   */
  isFixedAt(row, col) {
    this._validateCoord(row, col);
    return this._fixed[row][col];
  }

  /**
   * 检查操作是否是无状态变化的 no-op
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @param {number} value - 填入的值 [0-9]
   * @returns {boolean} true = 是 no-op
   */
  isNoOp(row, col, value) {
    this._validateCoord(row, col);
    return this._grid[row][col] === value;
  }

  /**
   * 获取指定位置的值
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @returns {number} 格子值 0-9
   */
  getValue(row, col) {
    this._validateCoord(row, col);
    return this._grid[row][col];
  }

  /**
   * 检查 Move 是否可以应用到当前棋盘（仅检查固定格子，不验证数独冲突）
   * 坐标和值范围的有效性由 Move 构造函数保证
   * @param {Move} move - 操作命令
   * @returns {boolean} true = 可以填入，false = 固定格子不可改
   */
  canApply(move) {
    if (!(move instanceof Move)) {
      throw new Error('Sudoku.canApply requires a Move instance');
    }
    return !this._fixed[move.row][move.col];
  }

  /**
   * 验证移动是否合法（兼容旧接口，内部委托给 canApply）
   * @deprecated 使用 canApply(Move) 代替
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @param {number} value - 填入的值 [0-9]，0 表示清除
   * @returns {boolean} true 表示可以尝试填入
   */
  isValidMove(row, col, value) {
    return this.canApply(new Move({ row, col, value }));
  }

  /**
   * 执行一步操作（直接修改当前实例）
   * @param {Move | {row: number, col: number, value: number}} move
   * @returns {boolean} true = 成功，false = 失败（固定格子或验证失败）
   */
  guess(move) {
    if (!(move instanceof Move)) {
      move = new Move(move);
    }

    if (this._fixed[move.row][move.col]) {
      return false;
    }

    this._grid[move.row][move.col] = move.value;
    return true;
  }

  /**
   * 显式深拷贝
   * @returns {Sudoku} 新的 Sudoku 实例
   */
  clone() {
    return new Sudoku({
      grid: this._grid.map(row => [...row]),
      fixed: this._fixed.map(row => [...row])
    });
  }

  /**
   * 序列化
   * @returns {{grid: number[][], fixed: boolean[][]}}
   */
  toJSON() {
    return {
      grid: this._grid.map(row => [...row]),
      fixed: this._fixed.map(row => [...row])
    };
  }

  /**
   * 从 JSON 反序列化
   * @param {{grid: number[][], fixed: boolean[][]}} json
   * @returns {Sudoku}
   */
  static fromJSON(json) {
    return new Sudoku({ grid: json.grid, fixed: json.fixed });
  }

  /**
   * 调试用文本表示
   * @returns {string}
   */
  toString() {
    let out = '╔═══════╤═══════╤═══════╗\n';

    for (let row = 0; row < 9; row++) {
      if (row !== 0 && row % 3 === 0) {
        out += '╟───────┼───────┼───────╢\n';
      }

      for (let col = 0; col < 9; col++) {
        if (col === 0) {
          out += '║ ';
        } else if (col % 3 === 0) {
          out += '│ ';
        }

        out += (this._grid[row][col] === 0 ? '·' : this._grid[row][col]) + ' ';

        if (col === 8) {
          out += '║';
        }
      }

      out += '\n';
    }

    out += '╚═══════╧═══════╧═══════╝';
    return out;
  }

  /**
   * 检查在指定位置放置值是否会产生冲突（行/列/宫）
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @param {number} value - 要检查的值 [1-9]
   * @returns {boolean} true = 有冲突，false = 无冲突
   */
  hasConflict(row, col, value) {
    this._validateCoord(row, col);
    
    // 检查行
    for (let c = 0; c < 9; c++) {
      if (c !== col && this._grid[row][c] === value) return true;
    }
    
    // 检查列
    for (let r = 0; r < 9; r++) {
      if (r !== row && this._grid[r][col] === value) return true;
    }
    
    // 检查宫
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && this._grid[r][c] === value) return true;
      }
    }
    
    return false;
  }

  /**
   * 获取所有冲突单元格坐标
   * @returns {string[]} 冲突单元格坐标数组，如 ['0,0', '1,2']
   */
  getConflicts() {
    const conflicts = [];
    
    const addConflict = (r, c) => {
      const key = `${r},${c}`;
      if (!conflicts.includes(key)) conflicts.push(key);
    };
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const value = this._grid[r][c];
        if (value === 0) continue;
        
        // 行冲突
        for (let cc = 0; cc < 9; cc++) {
          if (cc !== c && this._grid[r][cc] === value) {
            addConflict(r, c);
            addConflict(r, cc);
          }
        }
        
        // 列冲突
        for (let rr = 0; rr < 9; rr++) {
          if (rr !== r && this._grid[rr][c] === value) {
            addConflict(r, c);
            addConflict(rr, c);
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * 检查游戏是否胜利（棋盘填满且无冲突）
   * @returns {boolean}
   */
  isSolved() {
    // 检查是否填满
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this._grid[r][c] === 0) return false;
      }
    }
    // 检查无冲突
    return this.getConflicts().length === 0;
  }
}

/**
 * @param {number[][] | {grid: number[][], fixed: boolean[][]}} input
 * @returns {Sudoku}
 */
export function createSudoku(input) {
  return new Sudoku(input);
}

/**
 * @param {{grid: number[][], fixed: boolean[][]}} json
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  return Sudoku.fromJSON(json);
}
