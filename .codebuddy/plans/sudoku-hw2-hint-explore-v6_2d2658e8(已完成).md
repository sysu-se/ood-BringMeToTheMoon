---
name: sudoku-hw2-hint-explore-v5
overview:为数独实现提示(Hint)和探索(Explore)功能。提示包含cell候选数、全棋盘唯一候选数扫描、求解器答案；探索模式使用独立子会话
tickets:
  - id: implement-hint-methods
    content: 在 Sudoku.js 中实现 getCandidates(row, col)、findNakedSingle() 和 getAnswer(row, col) 方法，新增 _solutionCache 属性
    status: completed
  - id: create-exploration-class
    content: 创建 Exploration.js 探索会话对象，实现独立状态管理、分支历史和失败路径记忆
    status: completed
  - id: integrate-explore-game
    content: 修改 Game.js，集成探索模式状态管理，修改 guess/undo/redo 路由逻辑
    status: completed
  - id: update-domain-export
    content: 更新 domain/index.js，新增导出 Exploration 类
    status: completed
  - id: write-hw2-tests
    content: 编写 Homework 2 单元测试（tests/hw2/ 目录，覆盖提示功能和探索模式）
    status: completed
  - id: create-evolution-doc
    content: 撰写 EVOLUTION.md 设计演进文档，回答作业要求的所有设计问题
    status: completed
artifacts:
  - id: src-domain-Sudoku.js
    name: src/domain/Sudoku.js
    description: 新增提示方法 getCandidates(), findNakedSingles(), getAnswer(), _solutionCache
    status: completed
  - id: src-domain-Exploration.js
    name: src/domain/Exploration.js
    description: 探索会话领域对象
    status: completed
  - id: src-domain-Game.js
    name: src/domain/Game.js
    description: 新增探索模式状态管理
    status: completed
  - id: src-domain-index.js
    name: src/domain/index.js
    description: 导出 Exploration 类
    status: completed
  - id: tests-hw2
    name: tests/hw2/*.test.js
    description: Homework 2 单元测试（65个测试用例）
    status: completed
  - id: EVOLUTION.md
    name: EVOLUTION.md
    description: 设计演进文档
    status: completed
metrics:
  testFiles: 8
  totalTests: 80
  passedTests: 80
  failedTests: 0
---

# Homework 2 - Hint 与 Explore Mode

## 任务完成状态

| 任务 | 状态 | 交付物 |
|------|------|--------|
| 实现提示方法 | ✅ 完成 | `Sudoku.js` - getCandidates(), findNakedSingles(), getAnswer() |
| 创建探索会话 | ✅ 完成 | `Exploration.js` |
| 集成到Game | ✅ 完成 | `Game.js` - enterExplore(), commitExplore(), abandonExplore() |
| 更新导出 | ✅ 完成 | `domain/index.js` |
| 编写测试 | ✅ 完成 | `tests/hw2/` - 65个测试 |
| 撰写文档 | ✅ 完成 | `EVOLUTION.md` |

## 测试结果

```
Test Files: 8 passed (3 hw2 + 5 hw1)
Tests: 80 passed / 0 failed
```
