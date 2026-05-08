/**
 * @fileoverview 游戏会话领域对象
 * @module domain/Game
 */

import { Sudoku, createSudokuFromJSON } from './Sudoku.js';
import { Move } from './Move.js';
import { Exploration, createExploration } from './Exploration.js';

/**
 * 游戏会话领域对象
 * 
 * 职责：
 * - 管理当前数独状态
 * - 维护 Undo/Redo 历史
 * - 处理用户操作
 * - 输入验证
 * - 探索模式管理
 */
export class Game {
  /** @type {Sudoku[]} Undo 栈，存储 Sudoku 快照 */
  _undoStack = [];
  
  /** @type {Sudoku[]} Redo 栈，存储 Sudoku 快照 */
  _redoStack = [];
  
  /** @type {Sudoku} 当前数独状态 */
  _currentSudoku;

  /** @type {Exploration | null} 当前探索会话，null 表示不在探索中 */
  _exploration = null;

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

  // ========== 探索模式（Explore）==========

  /**
   * 检查是否正在探索中
   * @returns {boolean}
   */
  isExploring() {
    return this._exploration !== null;
  }

  /**
   * 进入探索模式，创建探索会话
   * @returns {boolean} true = 成功进入探索，false = 已在探索中
   */
  enterExplore() {
    if (this._exploration !== null) {
      return false; // 已在探索中
    }
    
    // 创建探索会话，传入当前局面
    this._exploration = createExploration(this._currentSudoku);
    return true;
  }

  /**
   * 提交探索，将探索结果合并到主局面
   * @returns {boolean} true = 成功提交，false = 未在探索中
   */
  commitExplore() {
    if (this._exploration === null) {
      return false; // 未在探索中
    }

    // 获取探索的最终局面
    const finalSudoku = this._exploration.commit();
    
    // 将进入探索前的局面推入主 undoStack（用于回退）
    this._undoStack.push(this._parentSudokuBeforeExplore || this._currentSudoku.clone());
    
    // 保存进入探索前的主局面（用于放弃时恢复）
    this._parentSudokuBeforeExplore = this._currentSudoku.clone();
    
    // 设置最终局面为当前局面
    this._currentSudoku = finalSudoku;
    
    // 清空主 redoStack（提交后不能 redo）
    this._redoStack = [];
    
    // 清空探索会话
    this._exploration = null;
    
    return true;
  }

  /**
   * 放弃探索，恢复到探索前的主局面
   * @returns {boolean} true = 成功放弃，false = 未在探索中
   */
  abandonExplore() {
    if (this._exploration === null) {
      return false; // 未在探索中
    }

    // 放弃探索（会清除探索会话）
    this._exploration.abandon();
    
    // 清空探索会话
    this._exploration = null;
    
    return true;
  }

  /**
   * 获取探索会话（如果存在）
   * @returns {Exploration | null}
   */
  getExploration() {
    return this._exploration;
  }

  /**
   * 执行一步操作（支持探索模式路由）
   * @param {Move | {row: number, col: number, value: number}} move
   * @returns {boolean | object} 正常模式返回 boolean，探索模式返回详细结果对象
   */
  guess(move) {
    // 如果在探索中，路由到探索会话
    if (this._exploration !== null) {
      // 规范化 move
      if (!(move instanceof Move)) {
        if (!Move.isValid(move.row, move.col, move.value)) {
          return {
            success: false,
            message: '无效的操作'
          };
        }
        move = new Move(move);
      }

      // 检查固定格子
      if (!this._currentSudoku.canApply(move)) {
        return {
          success: false,
          hasConflict: false,
          conflicts: [],
          message: '固定格子不可修改'
        };
      }

      // 路由到探索会话
      return this._exploration.guess(move.row, move.col, move.value);
    }

    // 正常游戏模式
    if (!(move instanceof Move)) {
      if (!Move.isValid(move.row, move.col, move.value)) {
        return false;
      }
      move = new Move(move);
    }

    if (!this._currentSudoku.canApply(move)) {
      return false;
    }

    if (this._currentSudoku.isNoOp(move.row, move.col, move.value)) {
      return false;
    }

    this._undoStack.push(this._currentSudoku.clone());
    this._currentSudoku.guess(move);
    this._redoStack = [];

    return true;
  }

  /**
   * 撤销上一步操作（支持探索模式路由）
   * @returns {void | object} 正常模式返回 void，探索模式返回详细结果对象
   */
  undo() {
    // 如果在探索中，路由到探索会话
    if (this._exploration !== null) {
      return this._exploration.undo();
    }

    // 正常游戏模式
    if (!this.canUndo()) return;
    this._redoStack.push(this._currentSudoku.clone());
    this._currentSudoku = this._undoStack.pop();
  }

  /**
   * 重做上一步操作（支持探索模式路由）
   * @returns {void | object} 正常模式返回 void，探索模式返回详细结果对象
   */
  redo() {
    // 如果在探索中，路由到探索会话
    if (this._exploration !== null) {
      return this._exploration.redo();
    }

    // 正常游戏模式
    if (!this.canRedo()) return;
    this._undoStack.push(this._currentSudoku.clone());
    this._currentSudoku = this._redoStack.pop();
  }

  /**
   * 获取当前数独状态的深拷贝
   * @returns {Sudoku} Sudoku 实例的深拷贝
   */
  getSudoku() {
    // 如果在探索中，返回探索的当前局面
    if (this._exploration !== null) {
      return this._exploration.getSudoku();
    }
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
