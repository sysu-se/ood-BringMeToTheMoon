/**
 * @fileoverview Homework 2 - 探索模式测试
 * @module tests/hw2/02-exploration.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Exploration } from '../../src/domain/Exploration.js';
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

describe('Exploration - 基本功能', () => {
  let exploration;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    exploration = new Exploration(sudoku);
  });

  it('应该正确创建探索会话', () => {
    expect(exploration).toBeDefined();
    expect(exploration.getSudoku()).toBeDefined();
  });

  it('应该保存父局面的深拷贝', () => {
    const parent = exploration._parentSudoku;
    expect(parent).toBeDefined();
    expect(parent instanceof Sudoku).toBe(true);
    
    // 父局面应该与原棋盘相同
    const parentGrid = parent.getGrid();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(parentGrid[r][c]).toBe(TEST_GRID[r][c]);
      }
    }
  });

  it('应该独立于原始棋盘', () => {
    const exploreGrid = exploration.getSudoku();
    exploreGrid._grid[0][0] = 999; // 故意修改探索棋盘
    
    // 原始棋盘不应受影响
    expect(sudoku.getValue(0, 0)).toBe(5);
  });
});

describe('Exploration - guess 操作', () => {
  let exploration;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    exploration = new Exploration(sudoku);
  });

  it('应该执行成功的guess操作', () => {
    const result = exploration.guess(0, 2, 4);
    expect(result.success).toBe(true);
    expect(result.hasConflict).toBe(false);
    expect(exploration.getSudoku().getValue(0, 2)).toBe(4);
  });

  it('应该检测到冲突', () => {
    // 位置 (0, 0) 已有值 5，尝试填入相同值应该冲突
    const result = exploration.guess(0, 2, 5);
    expect(result.success).toBe(true);
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it('冲突时不应允许新的guess操作', () => {
    exploration.guess(0, 2, 5); // 造成冲突
    const result = exploration.guess(0, 3, 6);
    expect(result.success).toBe(false);
    expect(result.message).toContain('请先解决当前冲突');
  });

  it('undo后应解除冲突限制', () => {
    exploration.guess(0, 2, 5); // 造成冲突
    exploration.undo(); // 撤销操作
    const result = exploration.guess(0, 3, 6);
    expect(result.success).toBe(true);
    expect(result.hasConflict).toBe(false);
  });
});

describe('Exploration - undo/redo', () => {
  let exploration;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    exploration = new Exploration(sudoku);
  });

  it('应该正确撤销操作', () => {
    exploration.guess(0, 2, 4);
    expect(exploration.getSudoku().getValue(0, 2)).toBe(4);
    
    exploration.undo();
    expect(exploration.getSudoku().getValue(0, 2)).toBe(0); // 恢复为空
  });

  it('应该正确重做操作', () => {
    exploration.guess(0, 2, 4);
    exploration.undo();
    exploration.redo();
    expect(exploration.getSudoku().getValue(0, 2)).toBe(4);
  });

  it('undo后应可以重新执行不同的guess', () => {
    exploration.guess(0, 2, 4);
    exploration.undo();
    const result = exploration.guess(0, 2, 6);
    expect(result.success).toBe(true);
    expect(exploration.getSudoku().getValue(0, 2)).toBe(6);
  });

  it('新的guess操作应清空redo栈', () => {
    exploration.guess(0, 2, 4);
    exploration.undo();
    exploration.guess(0, 3, 6); // 新的guess
    const result = exploration.redo();
    expect(result.success).toBe(false); // redo应该失败
  });

  it('无操作时undo应返回失败', () => {
    const result = exploration.undo();
    expect(result.success).toBe(false);
  });

  it('无操作时redo应返回失败', () => {
    const result = exploration.redo();
    expect(result.success).toBe(false);
  });
});

describe('Exploration - 失败路径记忆（记忆错误功能）', () => {
  let exploration;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    exploration = new Exploration(sudoku);
  });

  it('冲突后应记录失败状态', () => {
    exploration.guess(0, 2, 5); // 造成冲突
    expect(exploration.getFailedStatesCount()).toBe(1);
  });

  it('undo后冲突解决，失败状态应保留', () => {
    exploration.guess(0, 2, 5); // 造成冲突
    const failedCount = exploration.getFailedStatesCount();
    exploration.undo(); // 撤销后冲突解决
    expect(exploration.getFailedStatesCount()).toBe(failedCount);
  });

  it('undo后应允许执行不同的guess', () => {
    exploration.guess(0, 2, 5); // 造成冲突
    exploration.undo();
    const result = exploration.guess(0, 2, 4); // 正确答案
    expect(result.success).toBe(true);
    expect(result.hasConflict).toBe(false);
  });

  it('checkFailedState应在冲突时检查失败列表', () => {
    exploration.guess(0, 2, 5); // 造成冲突
    expect(exploration._hasConflict).toBe(true);
    const check = exploration.checkFailedState();
    expect(check.isFailed).toBe(true);
  });

  it('无冲突时checkFailedState应直接返回false（优化）', () => {
    exploration.guess(0, 2, 4); // 不造成冲突
    expect(exploration._hasConflict).toBe(false);
    const check = exploration.checkFailedState();
    expect(check.isFailed).toBe(false);
  });
});

describe('Exploration - abandon', () => {
  let exploration;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    exploration = new Exploration(sudoku);
  });

  it('abandon应返回父局面', () => {
    exploration.guess(0, 2, 4);
    exploration.guess(0, 3, 6);
    const parent = exploration.abandon();
    
    expect(parent instanceof Sudoku).toBe(true);
    expect(parent.getValue(0, 2)).toBe(0); // 恢复为空
    expect(parent.getValue(0, 3)).toBe(0);
  });

  it('abandon后_failedStates应清除', () => {
    exploration.guess(0, 2, 5); // 造成冲突
    exploration.abandon();
    expect(exploration.getFailedStatesCount()).toBe(0);
  });

  it('abandon后_leftExploreMode应为true', () => {
    exploration.abandon();
    expect(exploration._leftExploreMode).toBe(true);
  });
});

describe('Exploration - commit', () => {
  let exploration;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    exploration = new Exploration(sudoku);
  });

  it('commit应返回当前局面', () => {
    exploration.guess(0, 2, 4);
    exploration.guess(0, 3, 6);
    const committed = exploration.commit();
    
    expect(committed instanceof Sudoku).toBe(true);
    expect(committed.getValue(0, 2)).toBe(4);
    expect(committed.getValue(0, 3)).toBe(6);
  });

  it('commit后_failedStates应清除', () => {
    exploration.guess(0, 2, 5); // 造成冲突
    exploration.commit();
    expect(exploration.getFailedStatesCount()).toBe(0);
  });

  it('commit后_leftExploreMode应为true', () => {
    exploration.commit();
    expect(exploration._leftExploreMode).toBe(true);
  });
});

describe('Exploration - getStateHash', () => {
  let exploration;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    exploration = new Exploration(sudoku);
  });

  it('应返回81字符的哈希字符串', () => {
    const hash = exploration.getStateHash();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(81);
  });

  it('相同棋盘状态应产生相同哈希', () => {
    const hash1 = exploration.getStateHash();
    exploration.guess(0, 2, 4);
    const hash2 = exploration.getStateHash();
    expect(hash1).not.toBe(hash2);
    
    exploration.undo();
    const hash3 = exploration.getStateHash();
    expect(hash1).toBe(hash3);
  });
});

describe('Exploration - 离开探索模式后清除失败列表', () => {
  let exploration;
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
    exploration = new Exploration(sudoku);
  });

  it('abandon后第一次guess应清除失败列表', () => {
    exploration.guess(0, 2, 5); // 造成冲突，记录失败状态
    expect(exploration.getFailedStatesCount()).toBe(1);
    
    exploration.abandon(); // 标记 _leftExploreMode = true
    exploration.guess(0, 2, 4); // 清除失败列表
    
    expect(exploration.getFailedStatesCount()).toBe(0);
  });

  it('commit后第一次guess应清除失败列表', () => {
    exploration.guess(0, 2, 5); // 造成冲突，记录失败状态
    expect(exploration.getFailedStatesCount()).toBe(1);
    
    exploration.commit(); // 标记 _leftExploreMode = true
    exploration.guess(0, 2, 4); // 清除失败列表
    
    expect(exploration.getFailedStatesCount()).toBe(0);
  });
});
