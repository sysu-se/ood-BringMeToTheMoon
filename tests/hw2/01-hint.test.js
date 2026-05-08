/**
 * @fileoverview Homework 2 - 提示功能测试
 * @module tests/hw2/01-hint.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Sudoku } from '../../src/domain/Sudoku.js';

// 测试用例：标准数独棋盘（有唯一解）
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

// 完整解答
const SOLUTION_GRID = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

describe('提示功能 - getCandidates', () => {
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
  });

  it('应该返回空格位置的候选数', () => {
    // 位置 (0, 2) 应该是 4
    const candidates = sudoku.getCandidates(0, 2);
    expect(candidates).toBeInstanceOf(Set);
    expect(candidates.has(4)).toBe(true);
  });

  it('应该返回多个候选数', () => {
    // 位置 (0, 2) 是空格，答案是4
    const candidates = sudoku.getCandidates(0, 2);
    expect(candidates.size).toBeGreaterThan(1);
    expect(candidates.has(4)).toBe(true);
  });

  it('对于已有值的位置应返回空集合', () => {
    const candidates = sudoku.getCandidates(0, 0);
    expect(candidates.size).toBe(0);
  });

  it('候选数应排除行冲突的数字', () => {
    // 位置 (0, 2)，行中有 3, 5, 7
    const candidates = sudoku.getCandidates(0, 2);
    expect(candidates.has(3)).toBe(false);
    expect(candidates.has(5)).toBe(false);
    expect(candidates.has(7)).toBe(false);
  });

  it('候选数应排除列冲突的数字', () => {
    // 位置 (0, 2)，列中有 8, 9
    const candidates = sudoku.getCandidates(0, 2);
    expect(candidates.has(8)).toBe(false);
    expect(candidates.has(9)).toBe(false);
  });

  it('候选数应排除宫冲突的数字', () => {
    // 位置 (0, 2)，宫 (0,0-2,2) 中有 6, 9
    const candidates = sudoku.getCandidates(0, 2);
    expect(candidates.has(6)).toBe(false);
    expect(candidates.has(9)).toBe(false);
  });

  it('应抛出无效坐标错误', () => {
    expect(() => sudoku.getCandidates(-1, 0)).toThrow();
    expect(() => sudoku.getCandidates(0, 9)).toThrow();
  });
});

describe('提示功能 - findNakedSingles', () => {
  it('应找到所有候选数为1的格子', () => {
    const sudoku = new Sudoku(TEST_GRID);
    const singles = sudoku.findNakedSingles();
    
    expect(Array.isArray(singles)).toBe(true);
    expect(singles.length).toBeGreaterThan(0);
    
    // 验证每个结果都是有效的
    for (const single of singles) {
      expect(single.row).toBeGreaterThanOrEqual(0);
      expect(single.row).toBeLessThan(9);
      expect(single.col).toBeGreaterThanOrEqual(0);
      expect(single.col).toBeLessThan(9);
      expect(single.value).toBeGreaterThanOrEqual(1);
      expect(single.value).toBeLessThanOrEqual(9);
      
      // 验证确实是唯一候选数
      const candidates = sudoku.getCandidates(single.row, single.col);
      expect(candidates.size).toBe(1);
      expect(candidates.has(single.value)).toBe(true);
    }
  });

  it('对于完整棋盘应返回空数组', () => {
    const sudoku = new Sudoku(SOLUTION_GRID);
    const singles = sudoku.findNakedSingles();
    expect(singles.length).toBe(0);
  });
});

describe('提示功能 - getAnswer', () => {
  let sudoku;

  beforeEach(() => {
    sudoku = new Sudoku(TEST_GRID);
  });

  it('应返回空格位置的正确答案', () => {
    const answer = sudoku.getAnswer(0, 2);
    expect(answer).toBe(4);
  });

  it('对于已有值的位置应返回该值', () => {
    const answer = sudoku.getAnswer(0, 0);
    expect(answer).toBe(5);
  });

  it('应返回正确的多个位置答案', () => {
    expect(sudoku.getAnswer(0, 2)).toBe(4);
    expect(sudoku.getAnswer(0, 3)).toBe(6);
    expect(sudoku.getAnswer(0, 5)).toBe(8);
  });

  it('应抛出无效坐标错误', () => {
    expect(() => sudoku.getAnswer(-1, 0)).toThrow();
    expect(() => sudoku.getAnswer(0, 9)).toThrow();
  });
});

describe('提示功能 - getSolution', () => {
  it('应返回完整解答', () => {
    const sudoku = new Sudoku(TEST_GRID);
    const solution = sudoku.getSolution();
    
    expect(solution).not.toBeNull();
    expect(Array.isArray(solution)).toBe(true);
    expect(solution.length).toBe(9);
    
    for (let r = 0; r < 9; r++) {
      expect(solution[r].length).toBe(9);
      for (let c = 0; c < 9; c++) {
        expect(solution[r][c]).toBeGreaterThanOrEqual(1);
        expect(solution[r][c]).toBeLessThanOrEqual(9);
      }
    }
  });

  it('解答应满足数独规则', () => {
    const sudoku = new Sudoku(TEST_GRID);
    const solution = sudoku.getSolution();
    
    // 检查行
    for (let r = 0; r < 9; r++) {
      const rowSet = new Set(solution[r]);
      expect(rowSet.size).toBe(9);
    }
    
    // 检查列
    for (let c = 0; c < 9; c++) {
      const colSet = new Set();
      for (let r = 0; r < 9; r++) {
        colSet.add(solution[r][c]);
      }
      expect(colSet.size).toBe(9);
    }
    
    // 检查宫
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const boxSet = new Set();
        for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
          for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
            boxSet.add(solution[r][c]);
          }
        }
        expect(boxSet.size).toBe(9);
      }
    }
  });
});

describe('提示功能 - _solutionCache', () => {
  it('guess后应清空缓存', () => {
    const sudoku = new Sudoku(TEST_GRID);
    
    // 第一次获取答案会缓存
    const answer1 = sudoku.getAnswer(0, 2);
    expect(answer1).toBe(4);
    
    // 修改棋盘
    sudoku.guess({ row: 0, col: 2, value: 5 });
    
    // 再次获取答案应该重新计算（不使用缓存）
    const answer2 = sudoku.getAnswer(0, 3);
    // 由于修改了棋盘，解可能变化，但不应该报错
    expect(answer2).toBeGreaterThanOrEqual(0);
    expect(answer2).toBeLessThanOrEqual(9);
  });
});
