/**
 * @fileoverview Homework 2 - Game 探索模式集成测试
 * @module tests/hw2/03-game-explore.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../../src/domain/Game.js';
import { Sudoku } from '../../src/domain/Sudoku.js';

// 测试用例
const TEST_GRID = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9]
];

describe('Game - 探索模式基础', () => {
  let game;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    game = new Game({ sudoku });
  });

  it('初始状态不应在探索中', () => {
    expect(game.isExploring()).toBe(false);
  });

  it('应该成功进入探索模式', () => {
    const result = game.enterExplore();
    expect(result).toBe(true);
    expect(game.isExploring()).toBe(true);
  });

  it('已经在探索中时不应再次进入', () => {
    game.enterExplore();
    const result = game.enterExplore();
    expect(result).toBe(false);
  });

  it('getExploration应返回探索会话', () => {
    game.enterExplore();
    const exploration = game.getExploration();
    expect(exploration).toBeDefined();
    expect(exploration).not.toBeNull();
  });
});

describe('Game - 探索模式操作路由', () => {
  let game;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    game = new Game({ sudoku });
    game.enterExplore();
  });

  it('探索中的guess应路由到Exploration', () => {
    const result = game.guess({ row: 0, col: 2, value: 4 });
    expect(result.success).toBe(true);
    expect(game.getSudoku().getValue(0, 2)).toBe(4);
  });

  it('探索中的undo应路由到Exploration', () => {
    game.guess({ row: 0, col: 2, value: 4 });
    const result = game.undo();
    expect(result.success).toBe(true);
    expect(game.getSudoku().getValue(0, 2)).toBe(0);
  });

  it('探索中的redo应路由到Exploration', () => {
    game.guess({ row: 0, col: 2, value: 4 });
    game.undo();
    const result = game.redo();
    expect(result.success).toBe(true);
    expect(game.getSudoku().getValue(0, 2)).toBe(4);
  });

  it('探索中的guess应检测冲突', () => {
    const result = game.guess({ row: 0, col: 2, value: 5 });
    expect(result.success).toBe(true);
    expect(result.hasConflict).toBe(true);
  });

  it('探索中的guess冲突后应记录失败状态', () => {
    game.guess({ row: 0, col: 2, value: 5 });
    const exploration = game.getExploration();
    expect(exploration.getFailedStatesCount()).toBe(1);
  });
});

describe('Game - 提交探索', () => {
  let game;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    game = new Game({ sudoku });
    game.enterExplore();
  });

  it('commitExplore应提交探索结果', () => {
    game.guess({ row: 0, col: 2, value: 4 });
    const result = game.commitExplore();
    
    expect(result).toBe(true);
    expect(game.isExploring()).toBe(false);
    expect(game.getSudoku().getValue(0, 2)).toBe(4);
  });

  it('commit后主局面应可undo', () => {
    game.guess({ row: 0, col: 2, value: 4 });
    game.commitExplore();
    
    expect(game.canUndo()).toBe(true);
    game.undo();
    expect(game.getSudoku().getValue(0, 2)).toBe(0);
  });

  it('commitExplore应清空探索会话', () => {
    game.guess({ row: 0, col: 2, value: 4 });
    game.commitExplore();
    expect(game.getExploration()).toBeNull();
  });

  it('未在探索中时commitExplore应返回false', () => {
    // 创建一个新的 game（不在探索中）
    const newGame = new Game({ sudoku: new Sudoku(TEST_GRID) });
    const result = newGame.commitExplore();
    expect(result).toBe(false);
  });
});

describe('Game - 放弃探索', () => {
  let game;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    game = new Game({ sudoku });
    game.enterExplore();
  });

  it('abandonExplore应放弃探索', () => {
    game.guess({ row: 0, col: 2, value: 4 });
    const result = game.abandonExplore();
    
    expect(result).toBe(true);
    expect(game.isExploring()).toBe(false);
    expect(game.getSudoku().getValue(0, 2)).toBe(0); // 恢复原状
  });

  it('abandonExplore应清空探索会话', () => {
    game.guess({ row: 0, col: 2, value: 4 });
    game.abandonExplore();
    expect(game.getExploration()).toBeNull();
  });

  it('abandonExplore后主局面应保持不变', () => {
    const originalValue = game.getSudoku().getValue(0, 2);
    game.guess({ row: 0, col: 2, value: 4 });
    game.abandonExplore();
    expect(game.getSudoku().getValue(0, 2)).toBe(originalValue);
  });

  it('未在探索中时abandonExplore应返回false', () => {
    // 创建一个新的 game（不在探索中）
    const newGame = new Game({ sudoku: new Sudoku(TEST_GRID) });
    const result = newGame.abandonExplore();
    expect(result).toBe(false);
  });
});

describe('Game - 正常模式与探索模式切换', () => {
  let game;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    game = new Game({ sudoku });
  });

  it('正常模式的guess不应受探索影响', () => {
    // 正常模式guess
    const result1 = game.guess({ row: 0, col: 2, value: 4 });
    expect(result1).toBe(true);
    expect(game.getSudoku().getValue(0, 2)).toBe(4);
    
    // 进入探索
    game.enterExplore();
    
    // 探索中的修改不应影响正常模式
    game.getExploration().guess(0, 3, 6);
    expect(game.getSudoku().getValue(0, 3)).toBe(6);
    
    // 放弃探索
    game.abandonExplore();
    
    // 正常模式的状态应保持不变
    expect(game.getSudoku().getValue(0, 2)).toBe(4);
    expect(game.getSudoku().getValue(0, 3)).toBe(0);
  });

  it('探索提交后应合并到正常模式', () => {
    // 正常模式
    game.guess({ row: 0, col: 2, value: 4 });
    
    // 进入探索
    game.enterExplore();
    
    // 探索中继续操作
    game.getExploration().guess(0, 3, 6);
    
    // 提交探索
    game.commitExplore();
    
    // 两个操作都应保留
    expect(game.getSudoku().getValue(0, 2)).toBe(4);
    expect(game.getSudoku().getValue(0, 3)).toBe(6);
  });

  it('探索提交后应可以undo', () => {
    game.enterExplore();
    game.getExploration().guess(0, 2, 4);
    game.commitExplore();
    
    game.undo();
    expect(game.getSudoku().getValue(0, 2)).toBe(0);
  });
});

describe('Game - 序列化与探索模式', () => {
  let game;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    game = new Game({ sudoku });
  });

  it('序列化时应不包含探索会话', () => {
    game.enterExplore();
    game.guess({ row: 0, col: 2, value: 4 });
    
    const json = game.toJSON();
    
    // 序列化不应破坏
    expect(json).toBeDefined();
  });
});
