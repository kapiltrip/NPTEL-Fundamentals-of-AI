# Week 03 — Problem Solving by Search II

[All weeks](README.md) · [Previous](Week%2002.md) · [Next](Week%2004.md)

[2026](#2026) · [2025](#2025) · [2024](#2024) · [2019](#2019)

Screenshots appear inline. Each question has a short recap, answer, and explanation below the relevant page.

## 2026

Official solution linked from the enrolled 2026 course; checked against the live weekly assessment.

[Source](https://drive.google.com/file/d/1pNTM6NNwJrFKqgFYSNJdcIUmByIOg_0d/view)

Jump to discussion: [Q1](#2026-q1) · [Q2](#2026-q2) · [Q3](#2026-q3) · [Q4](#2026-q4) · [Q5](#2026-q5) · [Q6](#2026-q6) · [Q7](#2026-q7) · [Q8](#2026-q8) · [Q9](#2026-q9) · [Q10](#2026-q10)

### 2026 — Page 01

![Week 03, 2026, source page 1](resources/screenshots/Week_03/2026/2026_Week_03_Page_01.png)

#### 2026 Q1

**Question recap:** Which claim about AO* is false?

**Answer:** D — It always expands every graph node.

**Why:** AO* follows the most promising partial solution graph and updates costs backward. It can prove a solution without exploring irrelevant alternatives.

#### 2026 Q2

**Question recap:** Which successor does the shown OR node choose?

**Answer:** C — Node C.

**Why:** Compare edge cost plus remaining heuristic: A costs $2+6=8$, B costs $1+8=9$, and C costs $4+2=6$. The smallest estimate wins.

### 2026 — Page 02

![Week 03, 2026, source page 2](resources/screenshots/Week_03/2026/2026_Week_03_Page_02.png)

#### 2026 Q3

**Question recap:** What opponent assumption does minimax make?

**Answer:** B — The opponent plays optimally.

**Why:** MAX chooses its best move while assuming MIN chooses the move worst for MAX. This makes minimax an adversarial decision rule.

#### 2026 Q4

**Question recap:** Which chess-search statements hold?

**Answer:** B — I, II, and IV.

**Why:** Exhaustive search is impractical, so depth-limited search backs up heuristic evaluations. Alpha-beta pruning preserves the minimax result at the same search depth; statement III is false.

#### 2026 Q5

**Question recap:** What is required to search an AND/OR graph?

**Answer:** A — Both I and II.

**Why:** An OR choice needs one successful alternative; an AND choice needs all required subproblems solved. The solution therefore branches into a solution subgraph.

### 2026 — Page 03

![Week 03, 2026, source page 3](resources/screenshots/Week_03/2026/2026_Week_03_Page_03.png)

#### 2026 Q6

**Question recap:** What are the root bounds after evaluating B?

**Answer:** B — $\alpha=8,\;\beta=+\infty$.

**Why:** B backs up value 8. Since the root is MAX, its best established lower bound becomes 8; no finite upper bound has been imposed on the root.

#### 2026 Q7

**Question recap:** Where does the first alpha-beta cutoff occur?

**Answer:** B — At E.

**Why:** B already has an alternative worth 8. Once its MAX child E reaches 10, E cannot improve B's MIN choice, so E's remaining leaf is skipped.

### 2026 — Page 04

![Week 03, 2026, source page 4](resources/screenshots/Week_03/2026/2026_Week_03_Page_04.png)

#### 2026 Q8

**Question recap:** Which leaf value is not examined?

**Answer:** B — 7.

**Why:** The cutoff at E occurs before its third leaf, whose value is 7. Pruning that leaf does not change the backed-up minimax decision.

#### 2026 Q9

**Question recap:** What bound does B have after D but before E?

**Answer:** B — $\beta(B)=8$.

**Why:** B is MIN, so its first completed child gives an upper bound of 8. This is B's local bound; the root has not yet finished evaluating B.

#### 2026 Q10

**Question recap:** What happens with worse move ordering?

**Answer:** A — More nodes are likely to be evaluated.

**Why:** Good moves establish useful bounds early. Poor ordering delays those bounds and reduces pruning, while leaving the final minimax value unchanged.

[Back to year index](#2026) · [All weeks](README.md)

---

## 2025

Public copy of 2025 assignment solutions. Highlights are preserved; corrections and wording issues are identified below.

[Source](https://www.scribd.com/document/937061874/NPTEL)

Jump to discussion: [Q1](#2025-q1) · [Q2](#2025-q2) · [Q3](#2025-q3) · [Q4](#2025-q4) · [Q5](#2025-q5) · [Q6](#2025-q6) · [Q7](#2025-q7) · [Q8](#2025-q8) · [Q9](#2025-q9) · [Q10](#2025-q10)

### 2025 — Page 01

![Week 03, 2025, source page 6](resources/screenshots/Week_03/2025/2025_Week_03_Page_01.jpg)

#### 2025 Q1

**Question recap:** What are AO*'s two main operations?

**Answer:** A — Grow top-down, revise costs and solved labels bottom-up.

**Why:** Expansion adds promising subproblems. Their updated costs and solved status are then propagated to ancestors.

#### 2025 Q2

**Question recap:** What is practical in very large game trees?

**Answer:** A — Both statements.

**Why:** Exhaustive terminal search is usually impossible. A limited search estimates which first move is best and can be repeated after the next position is observed.

#### 2025 Q3

**Question recap:** What does AND/OR search require?

**Answer:** A — Both I and II.

**Why:** Best-first guidance must account for grouped AND successors. A solution may require several terminal subgoals rather than a single simple path.

#### 2025 Q4

**Question recap:** What is an entry minimal in its row and maximal in its column?

**Answer:** C — A saddle point.

**Why:** Under the stated payoff convention, it is simultaneously a best response for both opposing players. It provides a pure-strategy equilibrium in the matrix game.

### 2025 — Page 02

![Week 03, 2025, source page 7](resources/screenshots/Week_03/2025/2025_Week_03_Page_02.jpg)

#### 2025 Q5

**Question recap:** Why is the naive minimax procedure inefficient?

**Answer:** A — Both statements, with the stated explanation.

**Why:** The question refers to a version that constructs the search tree separately from evaluating positions. Evaluating during depth-first search enables early bounds and pruning; inefficiency is not an unavoidable implementation property of all minimax programs.

#### 2025 Q6

**Question recap:** What alpha value reaches root C from its left branch?

**Answer:** B — 3.

**Why:** The first MAX child of MIN node A returns $\max(2,3)=3$. A now has upper bound 3. Its other MAX child B sees 5 and is cut off because it cannot improve A's minimum. A therefore returns 3, establishing root C's lower bound $\alpha(C)=3$. Keep A's beta separate from C's alpha even though both temporarily equal 3.

#### 2025 Q7

**Question recap:** What kind of cutoff occurs at B?

**Answer:** B — Beta pruning.

**Why:** B is MAX and reaches a value at least as large as its MIN ancestor's current upper bound. That ancestor will select its cheaper alternative, making B's remaining leaf irrelevant.

### 2025 — Page 03

![Week 03, 2025, source page 8](resources/screenshots/Week_03/2025/2025_Week_03_Page_03.jpg)

#### 2025 Q8

**Question recap:** What kind of cutoff occurs at D?

**Answer:** A — Alpha pruning.

**Why:** D is MIN and obtains 0 from its first evaluated child. The root MAX already has 3, so the remaining children of D cannot make that branch attractive.

#### 2025 Q9

**Question recap:** What beta bound is obtained at E?

**Answer:** D — 2.

**Why:** E is MIN. Its first MAX child returns $\max(2,1)=2$, setting $\beta(E)=2$. Root C already has $\alpha(C)=3$, so $2\leq3$ permits pruning E's remaining branch. The root bound 3 is not E's beta; a public 2024 video makes precisely that substitution error on the repeated tree.

#### 2025 Q10

**Question recap:** Why can D's unexplored branch be skipped?

**Answer:** C — D cannot exceed 0.

**Why:** A MIN node with one child already worth 0 must return at most 0, regardless of later children. The root already has a better alternative worth 3.

[Back to year index](#2025) · [All weeks](README.md)

---

## 2024

Question screenshots captured from MY SWAYAM’s public 2024 assignment video, linked to course noc24_ge47. The uploader’s unsubmitted choices, annotations, and occasional overlay text are preserved. They are not an official answer key; corrections and ambiguous wording are discussed below.

[Source](https://www.youtube.com/watch?v=WuPKscWbJ9c&t=25s)

Jump to discussion: [Q1](#2024-q1) · [Q2](#2024-q2) · [Q3](#2024-q3) · [Q4](#2024-q4) · [Q5](#2024-q5) · [Q6](#2024-q6) · [Q7](#2024-q7) · [Q8](#2024-q8) · [Q9](#2024-q9) · [Q10](#2024-q10)

### 2024 — Page 01

![Week 03, 2024, source page 0:25](resources/screenshots/Week_03/2024/2024_Week_03_Frame_025.jpg)

[Source video at 0:25](https://www.youtube.com/watch?v=WuPKscWbJ9c&t=25s)

#### 2024 Q1

**Question recap:** What can limited game-tree search usefully provide?

**Answer:** A — Both I and II.

**Why:** A bounded search estimates the best next move by backing up evaluations from its frontier. This avoids the impossible requirement of exploring an entire complex game to termination. Its result depends on search depth and the quality of the evaluation function.

#### 2024 Q2

**Question recap:** Which two operations define AO*?

**Answer:** A — Top-down expansion and bottom-up revision with solved labels.

**Why:** Grow the current promising solution graph, then revise its ancestors' costs and solved status. An OR node needs one successful alternative; an AND choice needs every required child. The solution can therefore branch, unlike a single ordinary search path.

### 2024 — Page 02

![Week 03, 2024, source page 0:50](resources/screenshots/Week_03/2024/2024_Week_03_Frame_050.jpg)

[Source video at 0:50](https://www.youtube.com/watch?v=WuPKscWbJ9c&t=50s)

#### 2024 Q3

**Question recap:** How many leaves does a full depth-d, branching-b tree contain?

**Answer:** A — $b^d$.

**Why:** Depth zero has one node; each additional level multiplies the count by b. This is the number at the last level, rather than the total number of nodes. The full node count is $1+b+\cdots+b^d$ when all those levels are present.

#### 2024 Q4

**Question recap:** Which minimax descriptions are correct?

**Answer:** A, B, C, and D.

**Why:** MAX takes the largest child value and MIN the smallest, propagating evaluations toward the root. This identifies a move under optimal opposing play. If the leaves are heuristic cutoffs, the result is the minimax value of that evaluated tree; it is not a proof of the entire game's true outcome.

### 2024 — Page 03

![Week 03, 2024, source page 1:20](resources/screenshots/Week_03/2024/2024_Week_03_Frame_080.jpg)

[Source video at 1:20](https://www.youtube.com/watch?v=WuPKscWbJ9c&t=80s)

#### 2024 Q5

**Question recap:** Which alpha-beta statements are correct?

**Answer:** A, B, C, and D.

**Why:** Alpha-beta is a depth-first minimax optimisation that omits branches unable to change the backed-up decision. It preserves the same root value at the same depth and evaluation function. The video selects only D, but A–C also describe the standard algorithm correctly.

### 2024 — Page 04

![Week 03, 2024, source page 1:45](resources/screenshots/Week_03/2024/2024_Week_03_Frame_105.jpg)

[Source video at 1:45](https://www.youtube.com/watch?v=WuPKscWbJ9c&t=105s)

This diagram supports Q6–Q10; the question frames and worked answers follow.

### 2024 — Page 05

![Week 03, 2024, source page 1:50](resources/screenshots/Week_03/2024/2024_Week_03_Frame_110.jpg)

[Source video at 1:50](https://www.youtube.com/watch?v=WuPKscWbJ9c&t=110s)

#### 2024 Q6

**Question recap:** What alpha value reaches root C from the left branch?

**Answer:** B — 3.

**Why:** The first MAX child of A returns $\max(2,3)=3$. A is MIN; its other child B already reaches at least 5, so that branch is cut off and A returns 3. Root C is MAX and now has lower bound $\alpha(C)=3$.

#### 2024 Q7

**Question recap:** What cutoff occurs at B?

**Answer:** B — Beta pruning.

**Why:** A, the MIN parent, already has an alternative worth 3. When MAX node B sees its first leaf 5, $\alpha(B)\geq\beta(A)=3$. A will not prefer B, so B's remaining leaf can be skipped.

#### 2024 Q8

**Question recap:** What cutoff occurs at D?

**Answer:** A — Alpha pruning.

**Why:** D is MIN and its first MAX child returns 0. Root C already has an alternative worth 3, so $\beta(D)=0\leq\alpha(C)=3$. Any other child could only keep or lower D's minimum; the unexplored branch cannot improve the root's choice.

### 2024 — Page 06

![Week 03, 2024, source page 2:20](resources/screenshots/Week_03/2024/2024_Week_03_Frame_140.jpg)

[Source video at 2:20](https://www.youtube.com/watch?v=WuPKscWbJ9c&t=140s)

#### 2024 Q9

**Question recap:** What beta bound is established at E?

**Answer:** D — 2; the public video later selects B — 3.

**Why:** E is MIN and its first MAX child has leaves 2 and 1. That child returns $\max(2,1)=2$, so $\beta(E)=2$. The root's alpha of 3 is a different bound and must not be substituted for E's beta. Since $2\leq3$, E's remaining branch is pruned.

#### 2024 Q10

**Question recap:** What upper bound justifies pruning D's remaining branch?

**Answer:** C — 0; the public video selects B — 3.

**Why:** D is MIN and already has a child valued 0, hence its eventual result cannot exceed 0. The root's existing 3 explains why that upper bound is insufficient. The root bound and the local bound at D are different quantities.

[Back to year index](#2024) · [All weeks](README.md)

---

## 2019

Official NPTEL archive with accepted answers. Any discrepancy between a printed formula and its key is identified below.

[Source](https://archive.nptel.ac.in/content/storage2/courses/downloads_new/112103280/Week_03_Assignment_3.pdf)

Jump to discussion: [Q1](#2019-q1) · [Q2](#2019-q2) · [Q3](#2019-q3) · [Q4](#2019-q4) · [Q5](#2019-q5) · [Q6](#2019-q6) · [Q7](#2019-q7) · [Q8](#2019-q8) · [Q9](#2019-q9) · [Q10](#2019-q10)

### 2019 — Page 01

![Week 03, 2019, source page 1](resources/screenshots/Week_03/2019/2019_Week_03.png)

#### 2019 Q1

**Question recap:** What is a zero-sum game?

**Answer:** B — One player's gain is the other's loss.

**Why:** The total payoff across players is zero under the chosen convention. Their objectives are directly opposed.

#### 2019 Q2

**Question recap:** What value does a MAX node back up?

**Answer:** A — The maximum of its children's values.

**Why:** MAX chooses its most favourable available move. MIN nodes instead back up their smallest child value.

#### 2019 Q3

**Question recap:** What is an AND/OR solution graph analogous to?

**Answer:** A — A path in an ordinary graph.

**Why:** It specifies the selected solution structure. AND arcs require several subsolutions, so this analogue may branch instead of forming one linear path.

#### 2019 Q4

**Question recap:** What are AO*'s two operations?

**Answer:** A — Top-down growth and bottom-up cost revision with solved labelling.

**Why:** Expand the current promising partial solution, then propagate its consequences to ancestors. Both operations are needed to update which partial solution is best.

#### 2019 Q5

**Question recap:** How many leaves are in a full b-branching depth-d tree?

**Answer:** A — $b^d$.

**Why:** Each level multiplies the number of nodes by b. This exponential growth explains why deep exhaustive game search rapidly becomes impractical.

#### 2019 Q6

**Question recap:** What cutoff occurs at a MIN node below an adequate MAX alternative?

**Answer:** A — Alpha cutoff.

**Why:** If the MIN node's upper bound is no greater than an ancestor MAX node's alpha, the ancestor will reject that branch. Equality is also sufficient in the usual algorithm.

#### 2019 Q7

**Question recap:** What cutoff occurs at a MAX node above a MIN ancestor's bound?

**Answer:** B — Beta cutoff.

**Why:** Once the MAX node's lower bound reaches or exceeds the ancestor's beta, that MIN ancestor has an alternative at least as good for it. Further expansion cannot change its choice.

#### 2019 Q8

**Question recap:** Which root value does alpha-beta preserve?

**Answer:** B — The minimax value.

**Why:** Pruning removes branches that cannot affect the backed-up decision. It reduces or preserves computation without changing the result at the same depth and evaluation function.

#### 2019 Q9

**Question recap:** What is the aim in a complex game with limited search?

**Answer:** A — Both statements.

**Why:** Estimate a good first move from a manageable part of the tree. The agent can search again after a move rather than solving the entire game to termination.

#### 2019 Q10

**Question recap:** How much deeper can ideal alpha-beta search reach?

**Answer:** B — About twice as deep for a comparable leaf budget.

**Why:** Ideal ordering reduces the leaf count from roughly $b^d$ to $b^{d/2}$. Real gains depend on move ordering and the game tree.

[Back to year index](#2019) · [All weeks](README.md)

---
