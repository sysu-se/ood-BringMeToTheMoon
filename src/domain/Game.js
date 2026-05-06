/**
 * @fileoverview 游戏会话领域对象
 * @module domain/Game
 */

import { Sudoku, createSudokuFromJSON } from './Sudoku.js';
import { Move } from './Move.js';

/**
 * 游戏会话领域对象
 * 
 * 职责：
 * - 管理当前数独状态
 * - 维护 Undo/Redo 历史
 * - 处理用户操作
 * - 输入验证
 */
export class Game {
  /** @type {Sudoku[]} Undo 栈，存储 Sudoku 快照 */
  _undoStack = [];
  
  /** @type {Sudoku[]} Redo 栈，存储 Sudoku 快照 */
  _redoStack = [];
  
  /** @type {Sudoku} 当前数独状态 */
  _currentSudoku;

  /**
   * @param {{sudoku: Sudoku}} config
   * @throws {Error} sudoku 不是有效的 Sudoku 实例
   */
  constructor({ sudoku }) {
    if (!(sudoku instanceof Sudoku)) {
      throw new Error('Game: sudoku must be a Sudoku instance');
    }
    this._currentSudoku = sudoku;
  }

  /**
   * 执行一步操作（会清空 Redo 栈）
   * 验证流程：Move.isValid() → Sudoku.canApply() → isNoOp() → 执行
   * @param {Move | {row: number, col: number, value: number}} move
   * @returns {boolean} true = 成功，false = 无效操作
   */
  guess(move) {
    if (!(move instanceof Move)) {
      // 先用静态方法验证格式
      if (!Move.isValid(move.row, move.col, move.value)) {
        return false;
      }
      move = new Move(move);
    }

    // 检查棋盘状态（固定格子）
    if (!this._currentSudoku.canApply(move)) {
      return false;
    }

    // 检查是否是无状态变化的 no-op，不记录历史
    if (this._currentSudoku.isNoOp(move.row, move.col, move.value)) {
      return false;
    }

    this._undoStack.push(this._currentSudoku.clone());
    this._currentSudoku.guess(move);
    this._redoStack = [];

    return true;
  }

  /**
   * 撤销上一步操作
   */
  undo() {
    if (!this.canUndo()) return;

    this._redoStack.push(this._currentSudoku.clone());
    this._currentSudoku = this._undoStack.pop();
  }

  /**
   * 重做上一步被撤销的操作
   */
  redo() {
    if (!this.canRedo()) return;

    this._undoStack.push(this._currentSudoku.clone());
    this._currentSudoku = this._redoStack.pop();
  }

  /**
   * @returns {boolean} 是否可以撤销
   */
  canUndo() {
    return this._undoStack.length > 0;
  }

  /**
   * @returns {boolean} 是否可以重做
   */
  canRedo() {
    return this._redoStack.length > 0;
  }

  /**
   * 获取当前数独状态的深拷贝
   * @returns {Sudoku} Sudoku 实例的深拷贝
   */
  getSudoku() {
    return this._currentSudoku.clone();
  }

  /**
   * 序列化完整游戏状态
   * @returns {{currentSudoku: Object, undoStack: Object[], redoStack: Object[]}}
   */
  toJSON() {
    return {
      currentSudoku: this._currentSudoku.toJSON(),
      undoStack: this._undoStack.map(s => s.toJSON()),
      redoStack: this._redoStack.map(s => s.toJSON())
    };
  }

  /**
   * 从 JSON 反序列化恢复游戏状态
   * @param {{currentSudoku: Object, undoStack: Object[], redoStack: Object[]}} json
   * @returns {Game}
   */
  static fromJSON(json) {
    const game = new Game({
      sudoku: createSudokuFromJSON(json.currentSudoku)
    });
    
    game._undoStack = json.undoStack.map(s => createSudokuFromJSON(s));
    game._redoStack = json.redoStack.map(s => createSudokuFromJSON(s));
    
    return game;
  }
}

/**
 * @param {{sudoku: Sudoku}} config
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  return new Game({ sudoku });
}

/**
 * @param {Object} json
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}
