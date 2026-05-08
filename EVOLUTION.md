# EVOLUTION.md - 设计演进文档

> Homework 2: Hint 与 Explore Mode

---

## 1. 如何实现提示功能？

提示功能通过在 `Sudoku` 领域对象中新增三个方法实现：

### 1.1 候选提示 - `getCandidates(row, col)`

```javascript
getCandidates(row, col) {
  // 遍历数字 1-9，调用 hasConflict() 检查无冲突的数字
  // 无冲突的数字加入候选数集合
}
```

**实现方式**：规则法，复用已有的 `hasConflict()` 方法。对于每个数字 1-9，如果放置后不产生冲突，则加入候选集合。

**性能**：O(9×27) = O(1)，常数时间。

### 1.2 下一步提示（裸单一候选数）- `findNakedSingles()`

```javascript
findNakedSingles() {
  // 遍历所有空格，调用 getCandidates()
  // 返回所有候选数集合大小为 1 的格子
}
```

**实现方式**：规则法，扫描全棋盘找出"唯一候选数"的格子，即可以通过直观推理得出的必然填入位置。

### 1.3 答案提示 - `getAnswer(row, col)`

```javascript
getAnswer(row, col) {
  // 通过求解器获取完整解答
  // 使用 _solutionCache 缓存结果
}
```

**实现方式**：求解器法，调用内置的回溯求解器 `_simpleSolver()`。新增 `_solutionCache` 属性缓存求解结果，当棋盘状态改变时（`guess()` 被调用）清空缓存。

---

## 2. 提示功能更属于 Sudoku 还是 Game？为什么？

**答案：更属于 `Sudoku`**。

### 理由：

1. **职责单一性**：`Sudoku` 是棋盘状态的持有者，包含 `getGrid()`、`hasConflict()`、`getConflicts()` 等棋盘级别操作。`getCandidates()`、`findNakedSingle()`、`getAnswer()` 都是在已有棋盘状态上的计算，不依赖游戏会话状态。

2. **复用性**：提示功能可以在任何有 `Sudoku` 实例的上下文中使用，不需要 `Game` 上下文。

3. **接口清晰**：`Game` 负责游戏会话管理（历史、操作路由），`Sudoku` 负责棋盘状态和规则验证。这个边界清晰。

### 协作方式：

```
Game (协调层)
    └─> Sudoku (棋盘状态与提示计算)
```

`Game` 可以在此基础上提供更高层的提示服务（如限制提示次数），但核心提示逻辑属于 `Sudoku`。

---

## 3. 如何实现探索模式？

### 3.1 设计决策：Game 创建临时子会话

采用 **Game 创建临时子会话** 方案：

```
Game
    └─> Exploration (探索会话)
            └─> Sudoku (独立副本)
```

当用户进入探索模式时，`Game` 创建一个 `Exploration` 对象。`Exploration` 持有独立的 `Sudoku` 实例和 History 栈。

### 3.2 新增对象：Exploration

```javascript
class Exploration {
  _parentSudoku;    // 父局面（进入探索时的主局面快照）
  _currentSudoku;   // 当前探索局面（独立副本）
  _undoStack = [];  // 探索内撤销栈
  _redoStack = [];  // 探索内重做栈
  _failedStates;    // 失败路径集合（Set<stateHash>）
  _hasConflict;     // 是否存在未解决的冲突
}
```

### 3.3 状态流转

```
[正常游戏] -- enterExplore() --> [探索模式]
[探索模式] -- guess/undo/redo --> [探索模式]
[探索模式] -- commitExplore() --> [正常游戏（合并结果）]
[探索模式] -- abandonExplore() --> [正常游戏（恢复原状态）]
```

### 3.4 冲突检测与失败路径记忆

- **冲突检测**：复用 `Sudoku.getConflicts()` 方法
- **失败路径记忆**：使用状态哈希字符串存储失败状态（`Set<string>`）
- 每次探索导致冲突时，记录当前状态哈希
- 通过哈希快速判断当前状态是否已在失败路径中

---

## 4. 主局面与探索局面的关系是什么？

### 4.1 核心关系：复制对象（深拷贝）

```
主局面 (Game._currentSudoku)
    │
    └──> 进入探索时，深拷贝一份给 Exploration._currentSudoku
              │
              └──> 探索期间独立修改，互不影响
                        │
                        └──> 提交：Exploration._currentSudoku → Game._currentSudoku
                        └──> 放弃：丢弃 Exploration._currentSudoku，恢复 Game._currentSudoku
```

### 4.2 关键设计点

1. **深拷贝**：使用 `Sudoku.clone()` 创建独立副本，避免引用污染
2. **状态隔离**：探索期间的修改不会影响主局面，直到明确提交
3. **父局面保存**：`Exploration._parentSudoku` 保存进入探索前的主局面快照，用于放弃时恢复
4. **提交时合并**：将探索结果替换当前主局面，同时将进入探索前的局面推入主 undoStack（用于回退到探索前的状态）

### 4.3 引用污染问题

通过深拷贝完全避免了引用污染问题。每次操作都创建新的 Sudoku 实例，而不是共享可变状态。

---

## 5. history 结构在本次作业中是否发生了变化？

### 5.1 主 History 结构

**保持不变**（线性 Undo/Redo 栈）：

```javascript
class Game {
  _undoStack = [];  // Undo 栈
  _redoStack = [];  // Redo 栈
}
```

### 5.2 新增：探索内 History

```javascript
class Exploration {
  _undoStack = [];  // 探索内撤销栈
  _redoStack = [];  // 探索内重做栈
}
```

### 5.3 演进行为

| 动作 | 主 History | 探索 History |
|------|-----------|--------------|
| 进入探索 | 不变 | 新建空栈 |
| 探索中 guess | 不变 | 推入 undoStack |
| 探索中 undo | 不变 | 从 undoStack 弹出 |
| 提交探索 | 将进入探索前的局面推入 undoStack | 清空 |
| 放弃探索 | 不变 | 清空 |

### 5.4 树状分支

**未引入树状分支**，仍使用线性栈。但探索内操作可以产生分支（探索内 undo 后可以重做，也可以执行不同的 guess）。

---

## 6. Homework 1 中的哪些设计，在 Homework 2 中暴露出了局限？

### 6.1 深拷贝实现的重要性

Homework 1 的 `Sudoku.clone()` 是浅拷贝风险。在探索模式中，需要完整的深拷贝来保证状态隔离。

**验证**：已正确实现 `clone()` 方法：

```javascript
clone() {
  return new Sudoku({
    grid: this._grid.map(row => [...row]),
    fixed: this._fixed.map(row => [...row])
  });
}
```

### 6.2 对象职责边界的模糊

Homework 1 中 `Game` 和 `Sudoku` 的边界在探索模式下变得更加清晰。如果提示功能放在 `Game` 中实现，会导致职责混乱。

### 6.3 序列化接口的完整性

`Sudoku.toJSON()` 和 `Game.toJSON()` 的设计在探索模式中仍然有效。探索会话不参与序列化（游戏保存时不应保留未提交的探索状态）。

---

## 7. 如果重做一次 Homework 1，你会如何修改原设计？

### 7.1 显式设计状态机

```javascript
// Game 可以引入状态枚举
class Game {
  static State = {
    NORMAL: 'normal',
    EXPLORING: 'exploring'
  };
  
  _state = Game.State.NORMAL;
}
```

这样 `guess()`、`undo()`、`redo()` 的路由逻辑可以基于状态分发（State Pattern）。

### 7.2 考虑引入 Strategy 模式

对于不同的游戏模式（正常、探索），可以抽象出统一的操作接口：

```javascript
class GameStrategy {
  guess() { throw new Error('Not implemented'); }
  undo() { throw new Error('Not implemented'); }
  redo() { throw new Error('Not implemented'); }
}

class NormalStrategy extends GameStrategy { ... }
class ExploreStrategy extends GameStrategy { ... }
```

### 7.3 抽象 History 接口

```javascript
class HistoryManager {
  push(snapshot) { ... }
  undo() { ... }
  redo() { ... }
  canUndo() { ... }
  canRedo() { ... }
}
```

这样 `Game` 和 `Exploration` 可以共享同一个 HistoryManager 接口。

### 7.4 统一的对象工厂

```javascript
// 而不是散落在各处的 createXxx 函数
class SudokuFactory {
  static createFromGrid(grid) { ... }
  static createFromJSON(json) { ... }
  static createEmpty() { ... }
}
```

---

## 8. 课堂讨论问题准备

### Q1: 为什么"提示"和"探索"会推动原有对象设计发生变化？

提示功能需要棋盘级别的计算能力（候选数、求解），这强化了 `Sudoku` 的职责边界。探索模式引入了"状态切换"概念，需要 `Game` 管理多状态。这两个功能都是 Homework 1 边界设计的自然延伸。

### Q2: 你的探索模式更接近"状态切换"还是"分支会话"？

**更接近"状态切换"**。从 `Game` 的视角看，是状态在"正常游戏"和"探索模式"之间切换。但 `Exploration` 对象内部维护了独立的 History，形成了类似"分支"的效果。

### Q3: 你的设计最脆弱的地方在哪里？

- **深拷贝性能**：每次操作都创建新的 Sudoku 实例，空间开销较大
- **探索嵌套**：当前不支持嵌套探索（但作业也不要求）
- **History 接口**：如果将来引入更复杂的分支管理，当前线性栈可能需要重构

### Q4: 你的 history 结构是否还能继续扩展？

**可以扩展**。当前结构支持：
- 在 `Exploration` 中支持树状分支（需要引入"分支点"概念）
- 探索结果合并策略（当前是直接替换，可以扩展为选择合并）

### Q5: 如果将来迁移到新的响应式机制，你的设计中哪些部分最容易迁移，哪些最难？

**最容易迁移**：`Sudoku`（核心状态持有者）、`Exploration`（独立逻辑）
**最难迁移**：`Game` 中的操作路由逻辑（与 UI 层耦合度较高）

---

## 9. 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     UI Layer (Svelte)                   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Game                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ _currentSudoku: Sudoku                          │   │
│  │ _undoStack: Sudoku[]                            │   │
│  │ _redoStack: Sudoku[]                            │   │
│  │ _exploration: Exploration | null                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Methods:                                               │
│  - guess(move) / undo() / redo()                       │
│  - enterExplore() / commitExplore() / abandonExplore() │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────────┐  ┌─────────────────────────────┐
│   Sudoku            │  │   Exploration               │
│                     │  │                             │
│  - _grid            │  │  - _parentSudoku: Sudoku    │
│  - _fixed           │  │  - _currentSudoku: Sudoku  │
│  - _solutionCache   │  │  - _undoStack: Sudoku[]    │
│                     │  │  - _redoStack: Sudoku[]    │
│  Methods:           │  │  - _failedStates: Set       │
│  - getCandidates()  │  │                             │
│  - findNakedSingles()│  │  Methods:                   │
│  - getAnswer()       │  │  - guess() / undo() / redo│
│  - hasConflict()     │  │  - commit() / abandon()   │
│  - getConflicts()    │  │  - isFailedState()        │
└─────────────────────┘  └─────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│   Move (值对象，不变)                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 10. 关于 UI 的说明

### 10.1 作业要求

根据作业要求第九节"限制与说明"：
> 本次作业不要求：
> - Svelte 5 升级

第59-64行明确要求：
> 提示功能必须通过你的领域对象接口提供，而不是仅在 UI 组件中临时拼接。

**结论**：本次作业只需实现 `src` 目录下的领域对象接口，**不修改 UI 层**。

### 10.2 接口提供情况

Hint 和 Explore 功能通过 `src/node_modules/@sudoku/stores/gameStore.js` 对外暴露：

| 接口 | 方法 | 所属对象 |
|------|------|----------|
| 候选提示 | `gameStore.applyHint(pos)` → `Sudoku.getCandidates()` | Sudoku |
| 下一步提示 | `Sudoku.findNakedSingles()` | Sudoku |
| 答案提示 | `gameStore.applyHint(pos)` → `Sudoku.getAnswer()` | Sudoku |
| 进入探索 | `gameStore.enterExplore()` → `Game.enterExplore()` | Game |
| 提交探索 | `gameStore.commitExplore()` → `Game.commitExplore()` | Game |
| 放弃探索 | `gameStore.leaveExplore()` → `Game.abandonExplore()` | Game |

UI 层（`src/components/`）无需修改，可直接调用上述接口使用功能。

---

## 11. 文件变更摘要

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/domain/Sudoku.js` | 修改 | 新增 `getCandidates()`、`findNakedSingles()`、`getAnswer()`、`_solutionCache` |
| `src/domain/Game.js` | 修改 | 新增探索模式状态管理（`_exploration`、`enterExplore`、`commitExplore`、`abandonExplore`）|
| `src/domain/Exploration.js` | 新增 | 探索会话对象，管理独立状态和分支历史 |
| `src/domain/index.js` | 修改 | 导出 Exploration 类 |
| `src/node_modules/@sudoku/stores/gameStore.js` | 修改 | 新增 `applyHint()`、`enterExplore()`、`commitExplore()`、`leaveExplore()` |
| `tests/hw2/*.test.js` | 新增 | Homework 2 单元测试 |
| `EVOLUTION.md` | 修改 | 添加 UI 说明和接口清单 |
