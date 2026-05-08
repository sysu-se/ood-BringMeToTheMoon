---
name: sudoku-hw2-hint-explore
overview: 为数独游戏实现提示(Hint)和探索(Explore)功能，涉及Sudoku/Game对象演进、历史机制扩展
todos:
  - id: implement-hint-methods
    content: 在 Sudoku.js 中实现 getCandidates() 和 findNextMove() 方法
    status: pending
  - id: create-exploration-class
    content: 创建 Exploration.js 探索会话对象
    status: pending
  - id: integrate-explore-game
    content: 在 Game.js 中集成探索模式状态管理
    status: pending
    dependencies:
      - implement-hint-methods
      - create-exploration-class
  - id: write-hw2-tests
    content: 编写 Homework 2 单元测试
    status: pending
    dependencies:
      - implement-hint-methods
      - create-exploration-class
      - integrate-explore-game
  - id: update-domain-export
    content: 更新 domain/index.js 导出 Exploration
    status: pending
    dependencies:
      - create-exploration-class
  - id: create-evolution-doc
    content: 撰写 EVOLUTION.md 设计演进文档
    status: pending
    dependencies:
      - implement-hint-methods
      - create-exploration-class
      - integrate-explore-game
---

## 产品概述

为数独游戏 Homework 2 作业实现两个核心功能：提示（Hint）和探索（Explore）模式，在 Homework 1 已有的 Sudoku/Game 对象模型基础上进行功能演进。

## 核心功能

### A. 提示功能（Hint）

1. **候选提示**

- 提示指定格子所有可能的候选数字（排除同行/列/宫已有的数字）
- 返回结果为 Set<number> 格式

2. **下一步提示**

- 自动找到当前棋盘唯一候选数的位置
- 返回 `{row, col, value}` 或 `null`（无确定解）

### B. 探索模式（Explore）

1. **进入探索**：从当前主局面创建独立探索会话
2. **探索内操作**：在探索会话中进行填数、撤销、重做
3. **提交探索**：将探索结果合并到主局面，进入主历史
4. **放弃探索**：丢弃探索会话，恢复到探索前的主局面
5. **冲突检测**：在探索过程中检测数独规则冲突
6. **失败路径记忆**：记录探索失败的棋盘状态，避免重复探索

## 设计要求

- 提示功能属于 Sudoku（候选数计算）+ Game（协调呈现）
- 探索模式本质：Game 进入探索状态，创建独立子历史栈
- 主局面与探索局面关系：独立深拷贝，探索提交时合并
- history 演进：探索过程拥有独立 history，提交后进入主 history

## 交付物

- 代码修改：`Sudoku.js`、`Game.js`、新增 `Exploration.js`
- 文档：`EVOLUTION.md`（回答设计问题）
- 测试：`tests/hw2/`（可选加分项）

## 技术栈

- **前端框架**：Svelte 3.59.2 + TypeScript（原生 JS）
- **样式**：Tailwind CSS 2.2.19
- **构建工具**：Rollup
- **测试框架**：Vitest 1.4.0
- **数独求解器**：@mattflow/sudoku-solver 2.2.0（用于提示功能验证）

## 实现方案

### 1. 提示功能实现

**Sudoku.js 新增方法：**

```javascript
// 候选提示：获取指定位置所有可能的候选值
getCandidates(row, col) → Set<number>

// 下一步提示：找到唯一候选数的格子
findNextMove() → {row, col, value} | null
```

**设计决策**：候选数计算是纯棋盘逻辑，属于 Sudoku；提示的触发和呈现由 Game/UI 协调。

### 2. 探索模式实现

**新增 Exploration.js（探索会话）：**

```javascript
class Exploration {
  _parentSudoku;    // 父局面（进入探索时的主局面快照）
  _currentSudoku;   // 当前探索局面
  _undoStack;       // 探索内撤销栈
  _redoStack;       // 探索内重做栈
  _failedStates;    // 失败路径集合（Set<string> 棋盘哈希）
  
  // 核心操作
  guess(move);
  undo();
  redo();
  commit() → Sudoku;    // 提交：返回合并后的局面
  abandon() → Sudoku;   // 放弃：返回父局面
  hasConflict() → boolean;
  isFailedState() → boolean;
}
```

**Game.js 新增状态和方法：**

```javascript
class Game {
  _exploration;     // 当前探索会话（null 表示不在探索中）
  
  // 探索相关
  enterExplore() → boolean;   // 进入探索
  commitExplore() → boolean;  // 提交探索
  abandonExplore() → void;    // 放弃探索
  isExploring() → boolean;   // 是否在探索中
  
  // 探索状态下的 guess/undo/redo 路由到 Exploration
}
```

### 3. 状态流转设计

```
[正常游戏] --enterExplore()--> [探索模式]
                                    |
              +---------------------+---------------------+
              |                     |                     |
         guess/undo              commit               abandon
              |                     |                     |
              v                     v                     v
         [探索中]              [正常游戏]             [正常游戏]
                                                    (恢复原状态)
```

### 4. 冲突检测与失败记忆

- `Sudoku.hasConflict()` 已实现（检测行/列/宫冲突）
- `Exploration._failedStates`：使用棋盘状态哈希（9x9 grid 转字符串）标记失败路径
- 进入探索时检查当前状态是否已失败过

### 5. History 演进

- **主 history**：保持线性 Undo/Redo 栈不变
- **探索 history**：Exploration 内部独立栈
- **提交时**：Exploration 的最终局面作为新 Move 推入主 history
- **放弃时**：主 history 不变（因为 Exploration 入口已入栈）

## 目录结构

```
project-root/
├── src/domain/
│   ├── Sudoku.js        # [MODIFY] 新增 getCandidates(), findNextMove()
│   ├── Game.js          # [MODIFY] 新增探索模式状态管理
│   ├── Exploration.js    # [NEW] 探索会话对象
│   └── index.js         # [MODIFY] 导出 Exploration
├── EVOLUTION.md         # [NEW] 设计演进文档
└── tests/hw2/           # [NEW] Homework 2 测试
    ├── 01-hint.test.js
    ├── 02-explore-basic.test.js
    └── 03-explore-commit-abandon.test.js
```

## 实现顺序

1. **Sudoku.js**：实现 `getCandidates()` 和 `findNextMove()`
2. **Exploration.js**：创建探索会话核心逻辑
3. **Game.js**：集成探索模式，修改 `guess()`/`undo()`/`redo()` 路由逻辑
4. **单元测试**：为新功能编写测试
5. **EVOLUTION.md**：撰写设计文档
6. **UI 集成**：在 Svelte 组件中添加 Hint/Explore 按钮

# Agent Extensions

本任务不需要使用 Agent Extensions，现有技术栈和代码模式足以完成实现。