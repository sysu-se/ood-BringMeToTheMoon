/**
 * @fileoverview 探索会话领域对象
 * @module domain/Exploration
 */

import { Sudoku } from './Sudoku.js';
import { Move } from './Move.js';

/**
 * 探索会话领域对象
 * 
 * 职责：
 * - 管理探索模式的独立状态
 * - 维护探索内的分支历史（Undo/Redo）
 * - 检测冲突
 * - 记录失败的棋盘状态（记忆错误功能）
 * 
 * 设计原则：
 * - 持有独立的 Sudoku 实例，与主局面隔离
 * - 探索内操作不直接影响主 history
 * - 提交时合并到主局面，放弃时丢弃
 */
export class Exploration {
  /** @type {Sudoku} 父局面（进入探索时的主局面快照） */
  _parentSudoku;

  /** @type {Sudoku} 当前探索局面（独立副本） */
  _currentSudoku;

  /** @type {Sudoku[]} 探索内撤销栈 */
  _undoStack = [];

  /** @type {Sudoku[]} 探索内重做栈 */
  _redoStack = [];

  /** @type {Set<string>} 失败棋盘状态集合（存储哈希字符串） */
  _failedStates = new Set();

  /** @type {boolean} 是否存在未解决的冲突 */
  _hasConflict = false;

  /** @type {boolean} 是否已离开探索模式（用于清除失败列表） */
  _leftExploreMode = false;

  /**
   * @param {Sudoku} sudoku - 进入探索时的主局面
   */
  constructor(sudoku) {
    if (!(sudoku instanceof Sudoku)) {
      throw new Error('Exploration: sudoku must be a Sudoku instance');
    }
    // 深拷贝父局面作为探索起点
    this._parentSudoku = sudoku.clone();
    this._currentSudoku = sudoku.clone();
    // 初始化状态
    this._hasConflict = false;
    this._leftExploreMode = false;
    this._failedStates = new Set();
    this._undoStack = [];
    this._redoStack = [];
  }

  /**
   * 获取当前棋盘状态的哈希字符串
   * @returns {string} 81字符的哈希字符串
   */
  getStateHash() {
    return this._currentSudoku.getGrid().map(row => row.join('')).join('');
  }

  /**
   * 执行一步猜测操作
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @param {number} value - 填入的值 [0-9]
   * @returns {{success: boolean, hasConflict: boolean, conflicts: string[], isFailedState: boolean, message?: string}}
   */
  guess(row, col, value) {
    // 清除失败列表（离开探索模式后第一次 guess）
    if (this._leftExploreMode) {
      this._failedStates.clear();
      this._leftExploreMode = false;
    }

    // 冲突前置检查
    if (this._hasConflict) {
      return {
        success: false,
        hasConflict: true,
        conflicts: this._currentSudoku.getConflicts(),
        isFailedState: false,
        message: '请先解决当前冲突（undo/abandon）'
      };
    }

    // 检查操作是否有效
    if (this._currentSudoku.isFixedAt(row, col)) {
      return {
        success: false,
        hasConflict: false,
        conflicts: [],
        isFailedState: false,
        message: '固定格子不可修改'
      };
    }

    // 保存快照到撤销栈
    this._undoStack.push(this._currentSudoku.clone());
    
    // 执行猜测
    this._currentSudoku.guess({ row, col, value });
    
    // 清空重做栈
    this._redoStack = [];

    // 检测冲突
    const conflicts = this._currentSudoku.getConflicts();
    this._hasConflict = conflicts.length > 0;

    // 冲突处理：记录失败状态
    if (this._hasConflict) {
      const stateHash = this.getStateHash();
      this._failedStates.add(stateHash);
    }

    // 检查失败状态
    const failedCheck = this.checkFailedState();

    return {
      success: true,
      hasConflict: this._hasConflict,
      conflicts,
      isFailedState: failedCheck.isFailed,
      message: failedCheck.message
    };
  }

  /**
   * 撤销上一步操作
   * @returns {{success: boolean, hasConflict: boolean, conflicts: string[]}}
   */
  undo() {
    if (!this.canUndo()) {
      return {
        success: false,
        hasConflict: this._hasConflict,
        conflicts: this._currentSudoku.getConflicts(),
        message: '无可撤销的操作'
      };
    }

    // 保存当前状态到重做栈
    this._redoStack.push(this._currentSudoku.clone());
    
    // 恢复上一个状态
    this._currentSudoku = this._undoStack.pop();

    // 检查冲突
    const conflicts = this._currentSudoku.getConflicts();
    this._hasConflict = conflicts.length > 0;

    return {
      success: true,
      hasConflict: this._hasConflict,
      conflicts
    };
  }

  /**
   * 重做上一步被撤销的操作
   * @returns {{success: boolean, hasConflict: boolean, conflicts: string[], isFailedState: boolean, message?: string}}
   */
  redo() {
    if (!this.canRedo()) {
      return {
        success: false,
        hasConflict: this._hasConflict,
        conflicts: this._currentSudoku.getConflicts(),
        isFailedState: false,
        message: '无可重做的操作'
      };
    }

    // 保存当前状态到撤销栈
    this._undoStack.push(this._currentSudoku.clone());
    
    // 恢复下一个状态
    this._currentSudoku = this._redoStack.pop();

    // 检查冲突
    const conflicts = this._currentSudoku.getConflicts();
    this._hasConflict = conflicts.length > 0;

    // 冲突处理：记录失败状态
    if (this._hasConflict) {
      const stateHash = this.getStateHash();
      this._failedStates.add(stateHash);
    }

    // 检查失败状态
    const failedCheck = this.checkFailedState();

    return {
      success: true,
      hasConflict: this._hasConflict,
      conflicts,
      isFailedState: failedCheck.isFailed,
      message: failedCheck.message
    };
  }

  /**
   * 删除指定位置的猜测值
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @returns {{success: boolean, hasConflict: boolean, conflicts: string[]}}
   */
  delete(row, col) {
    // 不能删除固定格子
    if (this._currentSudoku.isFixedAt(row, col)) {
      return {
        success: false,
        hasConflict: this._hasConflict,
        conflicts: this._currentSudoku.getConflicts(),
        message: '固定格子不可删除'
      };
    }

    // 不能在有冲突时删除（可能导致其他冲突）
    if (this._hasConflict) {
      // 保存快照
      this._undoStack.push(this._currentSudoku.clone());
      
      // 删除值
      this._currentSudoku.guess({ row, col, value: 0 });
      
      // 检查冲突是否解决
      const conflicts = this._currentSudoku.getConflicts();
      this._hasConflict = conflicts.length > 0;
      
      return {
        success: true,
        hasConflict: this._hasConflict,
        conflicts
      };
    }

    // 无冲突时，保存快照并删除
    this._undoStack.push(this._currentSudoku.clone());
    this._currentSudoku.guess({ row, col, value: 0 });
    this._redoStack = [];

    return {
      success: true,
      hasConflict: false,
      conflicts: []
    };
  }

  /**
   * 放弃探索，恢复到进入探索前的状态
   * @returns {Sudoku} 父局面的深拷贝
   */
  abandon() {
    // 标记已离开探索模式
    this._leftExploreMode = true;
    
    // 清除探索内状态
    this._undoStack = [];
    this._redoStack = [];
    this._failedStates.clear();
    this._hasConflict = false;
    
    // 返回父局面的深拷贝
    return this._parentSudoku.clone();
  }

  /**
   * 提交探索，将最终局面作为新状态
   * @returns {Sudoku} 最终局面的深拷贝
   */
  commit() {
    // 标记已离开探索模式
    this._leftExploreMode = true;
    
    // 清除探索内状态
    this._undoStack = [];
    this._redoStack = [];
    this._failedStates.clear();
    this._hasConflict = false;
    
    // 返回最终局面的深拷贝
    return this._currentSudoku.clone();
  }

  /**
   * 检查当前局面是否有冲突
   * @returns {boolean}
   */
  hasConflict() {
    return this._hasConflict;
  }

  /**
   * 获取当前所有冲突单元格坐标
   * @returns {string[]} 冲突单元格坐标数组
   */
  getConflicts() {
    return this._currentSudoku.getConflicts();
  }

  /**
   * 检查当前棋盘状态是否已在失败路径中
   * 优化：无冲突时直接返回 false
   * @returns {{isFailed: boolean, message?: string}}
   */
  checkFailedState() {
    // 优化：只有检测到冲突后才检查失败列表
    if (!this._hasConflict) {
      return { isFailed: false };
    }

    const stateHash = this.getStateHash();
    if (this._failedStates.has(stateHash)) {
      return {
        isFailed: true,
        message: '当前棋盘状态已在失败路径中'
      };
    }
    return { isFailed: false };
  }

  /**
   * 检查当前状态是否已在失败路径中（比对哈希）
   * @returns {boolean}
   */
  isFailedState() {
    const stateHash = this.getStateHash();
    return this._failedStates.has(stateHash);
  }

  /**
   * 获取失败状态数量（用于调试）
   * @returns {number}
   */
  getFailedStatesCount() {
    return this._failedStates.size;
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
   * 获取当前探索局面的深拷贝
   * @returns {Sudoku}
   */
  getSudoku() {
    return this._currentSudoku.clone();
  }

  /**
   * 获取探索内操作次数
   * @returns {number}
   */
  getOperationCount() {
    return this._undoStack.length;
  }
}

/**
 * @param {Sudoku} sudoku
 * @returns {Exploration}
 */
export function createExploration(sudoku) {
  return new Exploration(sudoku);
}
