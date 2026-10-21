# Week 02 — Problem Solving by Search I

[All weeks](README.md) · [Previous](Week%2001.md) · [Next](Week%2003.md)

[2026](#2026) · [2025](#2025) · [2022](#2022) · [2019](#2019)

Screenshots appear inline. Each question has a short recap, answer, and explanation below the relevant page.

## 2026

Official solution linked from the enrolled 2026 course; checked against the live weekly assessment.

[Source](https://drive.google.com/file/d/14etz73IROgdu2NSreSdrhvH6Dh2bqPGY/view)

Jump to discussion: [Q1](#2026-q1) · [Q2](#2026-q2) · [Q3](#2026-q3) · [Q4](#2026-q4) · [Q5](#2026-q5) · [Q6](#2026-q6) · [Q7](#2026-q7) · [Q8](#2026-q8) · [Q9](#2026-q9) · [Q10](#2026-q10)

### 2026 — Page 01

![Week 02, 2026, source page 1](resources/screenshots/Week_02/2026_Week_02_Page_01.png)

#### 2026 Q1

**Question recap:** What is the main benefit of a heuristic?

**Answer:** B — Reducing the effective search space.

**Why:** A useful estimate prioritises promising states and avoids many unnecessary expansions. It does not remove goal testing or automatically guarantee optimality.

#### 2026 Q2

**Question recap:** Why do relaxed problems give admissible heuristics?

**Answer:** C — Their optimal costs are lower bounds.

**Why:** Removing restrictions cannot make the best solution more expensive. Therefore the relaxed optimum cannot exceed the original optimum.

#### 2026 Q3

**Question recap:** Are admissible heuristics optimistic?

**Answer:** A — Both statements are true, and the reason explains the assertion.

**Why:** Admissibility means $h(n)\leq h^*(n)$. The estimate never exceeds the true remaining minimum cost, which is precisely the sense in which it is optimistic.

### 2026 — Page 02

![Week 02, 2026, source page 2](resources/screenshots/Week_02/2026_Week_02_Page_02.png)

#### 2026 Q4

**Question recap:** What evaluation function does A* use?

**Answer:** C — $f(n)=g(n)+h(n)$.

**Why:** The path cost already paid is $g(n)$ and the estimated remaining cost is $h(n)$. A* chooses the frontier node with the smallest estimated total.

#### 2026 Q5

**Question recap:** When does A* give an optimal solution?

**Answer:** A — Both statements are true, with the stated explanation.

**Why:** An admissible heuristic supports optimal tree search; consistency supports graph search that closes nodes without reopening them. With reopening, admissibility can also suffice for graph search.

#### 2026 Q6

**Question recap:** Why can simulated annealing accept a worse state?

**Answer:** A — Both statements are true, and the reason explains the assertion.

**Why:** Occasional worsening moves allow escape from a local optimum. Their acceptance probability falls as temperature falls, so the search becomes more selective.

### 2026 — Page 03

![Week 02, 2026, source page 3](resources/screenshots/Week_02/2026_Week_02_Page_03.png)

#### 2026 Q7

**Question recap:** What is the displayed puzzle's Hamming distance?

**Answer:** A — 5.

**Why:** Count misplaced numbered tiles, excluding the blank. Tiles 2, 3, 4, 5, and 6 are not at their goal positions.

#### 2026 Q8

**Question recap:** What is its Manhattan distance?

**Answer:** C — 6.

**Why:** Sum each numbered tile's horizontal plus vertical displacement. The contributions are $2+1+1+1+1=6$; the blank is excluded.

#### 2026 Q9

**Question recap:** How many moves solve this particular puzzle?

**Answer:** C — 6.

**Why:** The shown solution attains the Manhattan lower bound of six moves, proving it optimal for this instance. Manhattan distance is not always equal to the actual solution length.

### 2026 — Page 04

![Week 02, 2026, source page 4](resources/screenshots/Week_02/2026_Week_02_Page_04.png)

### 2026 — Page 05

![Week 02, 2026, source page 5](resources/screenshots/Week_02/2026_Week_02_Page_05.png)

#### 2026 Q10

**Question recap:** Which of these two heuristics is more informative?

**Answer:** B — Manhattan distance.

**Why:** Every misplaced tile contributes at least one unit to Manhattan distance, so it dominates Hamming distance while remaining admissible for unit-cost moves. This generally reduces A* expansions, subject to tie behaviour.

[Back to year index](#2026) · [All weeks](README.md)

---

## 2025

Public copy of 2025 assignment solutions. Highlights are preserved; corrections and wording issues are identified below.

[Source](https://www.scribd.com/document/937061874/NPTEL)

Jump to discussion: [Q1](#2025-q1) · [Q2](#2025-q2) · [Q3](#2025-q3) · [Q4](#2025-q4) · [Q5](#2025-q5) · [Q6](#2025-q6) · [Q7](#2025-q7) · [Q8](#2025-q8) · [Q9](#2025-q9) · [Q10](#2025-q10)

### 2025 — Page 01

![Week 02, 2025, source page 3](resources/screenshots/Week_02/2025_Week_02_Page_01.jpg)

#### 2025 Q1

**Question recap:** Which conditions support A* optimality?

**Answer:** C — Both I and II.

**Why:** Admissibility suffices for tree search; consistency supports graph search without reopening closed nodes. This prevents a prematurely closed state from hiding a cheaper route.

#### 2025 Q2

**Question recap:** Which data discipline does DFS need?

**Answer:** C — LIFO.

**Why:** Push successors onto a stack and expand the most recently pushed one. FIFO would explore a level at a time instead.

#### 2025 Q3

**Question recap:** What is the complexity of general finite-domain CSP decision?

**Answer:** B — NP-complete.

**Why:** A complete assignment can be checked efficiently, but finding one may require exponential search. Particular restricted CSP families can be easier; the claim is about the general problem.

#### 2025 Q4

**Question recap:** What makes a CSP assignment a solution?

**Answer:** B — Both I and II.

**Why:** It must assign every variable and violate no constraint. A consistent partial assignment alone is not yet a complete solution.

### 2025 — Page 02

![Week 02, 2025, source page 4](resources/screenshots/Week_02/2025_Week_02_Page_02.jpg)

#### 2025 Q5

**Question recap:** Why use conflict-directed backjumping?

**Answer:** D — Statement II only.

**Why:** It records which assignments caused the conflict and jumps to a relevant earlier decision. Returning merely to the latest choice point is chronological backtracking.

#### 2025 Q6

**Question recap:** What search family includes A*?

**Answer:** C — Best-first search.

**Why:** A* prioritises frontier nodes using an evaluation score, specifically estimated total path cost. BFS and DFS use different fixed ordering disciplines.

### 2025 — Page 03

![Week 02, 2025, source page 5](resources/screenshots/Week_02/2025_Week_02_Page_03.jpg)

#### 2025 Q7

**Question recap:** Which node is expanded after A?

**Answer:** D — F, because its evaluation is lower than B's.

**Why:** Compare $f=g+h$, including the edge already travelled. The graph gives $f(F)=3+6=9$ and $f(B)=6+8=14$, so choose F.

#### 2025 Q8

**Question recap:** Which successor of I is most promising?

**Answer:** C — J.

**Why:** J has zero remaining heuristic and the lowest total evaluation among the shown alternatives. Reaching a goal through a cheap path is preferred to a larger estimated detour.

#### 2025 Q9

**Question recap:** Which successor of I is least promising?

**Answer:** A — E.

**Why:** Compare complete evaluation values for E, H, J, and G. E has the greatest estimated total cost in the displayed graph.

#### 2025 Q10

**Question recap:** What route does A* select to J?

**Answer:** D — A–F–G–I–J.

**Why:** Its edge costs are $3+1+3+3=10$. The heuristic prioritises this route, but the route's final actual cost is the sum of edge costs, not the sum of heuristic estimates.

[Back to year index](#2025) · [All weeks](README.md)

---

## 2022

Public 2022 question-and-answer webpage. Its answer key contains errors; read the checks below.

[Source](https://uniquejankari.in/fundamentals-of-artificial-intelligence-assignment-2-answers/)

Jump to discussion: [Q1](#2022-q1) · [Q2](#2022-q2) · [Q3](#2022-q3) · [Q4](#2022-q4) · [Q5](#2022-q5) · [Q6](#2022-q6) · [Q7](#2022-q7) · [Q8](#2022-q8) · [Q9](#2022-q9) · [Q10](#2022-q10)

### 2022 — Page 01

![Week 02, 2022, source page 1](resources/screenshots/Week_02/2022_Week_02_Part_01.jpg)

#### 2022 Q1

**Question recap:** Which search family includes A*?

**Answer:** C — Best-first search.

**Why:** It orders the frontier by $f(n)=g(n)+h(n)$. The priority is estimated total path cost rather than depth alone.

#### 2022 Q2

**Question recap:** Which A* optimality conditions hold?

**Answer:** D — Both conditions.

**Why:** Admissible heuristics support tree search, while consistent heuristics support graph search without reopening. Note that the option letter differs from the otherwise similar 2019 and 2025 questions.

### 2022 — Page 02

![Week 02, 2022, source page 2](resources/screenshots/Week_02/2022_Week_02_Part_02.jpg)

#### 2022 Q3

**Question recap:** Which dangers can an inadmissible heuristic cause?

**Answer:** A, B, and C in the webpage key, with a qualification.

**Why:** Overestimation can keep good solutions on the fringe and destroy the optimality guarantee. Poor ranking can also waste search; neither slowdown nor every listed behaviour occurs for every inadmissible heuristic.

#### 2022 Q4

**Question recap:** What makes a CSP solution complete and legal?

**Answer:** B — Both I and II.

**Why:** Every variable must be assigned, and every constraint must be satisfied. A non-conflicting partial assignment is not yet a solution.

### 2022 — Page 03

![Week 02, 2022, source page 3](resources/screenshots/Week_02/2022_Week_02_Part_03.jpg)

#### 2022 Q5

**Question recap:** Which arc-consistency claims should be retained?

**Answer:** A, B, C, and D under the intended introductory reading; the webpage prints the malformed key “b, c, b”.

**Why:** Arc consistency propagates binary-domain restrictions, can detect failure early, and is stronger than ordinary forward checking. Statement C is a qualitative description, not a claim that arc consistency is the strongest possible consistency notion. Do not memorise the duplicated webpage letters.

#### 2022 Q6

**Question recap:** Which CSP algorithm jumps back based on the actual conflict?

**Answer:** B — Conflict-directed backjumping.

**Why:** It records which earlier assignments caused the dead end and returns to a relevant one. This can skip decisions unrelated to the conflict.

### 2022 — Page 04

![Week 02, 2022, source page 4](resources/screenshots/Week_02/2022_Week_02_Part_04.jpg)

#### 2022 Q7

**Question recap:** What is the shown puzzle's Hamming distance?

**Answer:** 5.

**Why:** The misplaced numbered tiles are 2, 3, 4, 5, and 6. Do not include the blank when counting.

#### 2022 Q8

**Question recap:** What is its Manhattan distance?

**Answer:** 6.

**Why:** Tile 2 contributes two moves and tiles 3, 4, 5, and 6 contribute one each. The sum is $2+1+1+1+1=6$.

### 2022 — Page 05

![Week 02, 2022, source page 5](resources/screenshots/Week_02/2022_Week_02_Part_05.jpg)

#### 2022 Q9

**Question recap:** How many moves solve this puzzle?

**Answer:** 6.

**Why:** Moving the blank down, right, up, up, left, down reaches the displayed goal. This matches the Manhattan lower bound, so the six-move solution is optimal.

#### 2022 Q10

**Question recap:** How many states must be examined?

**Answer:** 5 in the webpage key; this count is unverified and underspecified.

**Why:** A six-move solution contains seven path states including start and goal, or five intermediate states. The number actually generated or expanded depends on the algorithm and tie-breaking, so “five examined states” is not a general consequence of the heuristic.

[Back to year index](#2022) · [All weeks](README.md)

---

## 2019

Official NPTEL archive with accepted answers. Any discrepancy between a printed formula and its key is identified below.

[Source](https://archive.nptel.ac.in/content/storage2/courses/downloads_new/112103280/Week_02_Assignment_2.pdf)

Jump to discussion: [Q1](#2019-q1) · [Q2](#2019-q2) · [Q3](#2019-q3) · [Q4](#2019-q4) · [Q5](#2019-q5) · [Q6](#2019-q6) · [Q7](#2019-q7) · [Q8](#2019-q8) · [Q9](#2019-q9) · [Q10](#2019-q10)

### 2019 — Page 01

![Week 02, 2019, source page 1](resources/screenshots/Week_02/2019_Week_02.png)

#### 2019 Q1

**Question recap:** What kind of heuristic comes from a relaxed problem?

**Answer:** C — Admissible.

**Why:** An easier problem cannot have a larger optimal cost than the original. Its optimal solution cost therefore provides a lower bound on the original remaining cost.

#### 2019 Q2

**Question recap:** Which statement is false of an inadmissible heuristic?

**Answer:** D in the source — That it underestimates the cost.

**Why:** Inadmissibility means the heuristic overestimates at least somewhere; it may still underestimate at other states. Read this option as the proposed defining guarantee, rather than as a claim about every individual estimate.

#### 2019 Q3

**Question recap:** Does consistency impose stronger restrictions?

**Answer:** B — Stricter constraints.

**Why:** With zero heuristic at goals, consistency implies admissibility and also requires $h(n)\leq c(n,n')+h(n')$ along edges. That additional local condition makes graph-search behaviour more reliable.

#### 2019 Q4

**Question recap:** What does a cooling schedule not determine?

**Answer:** C — Which successor state is proposed.

**Why:** The schedule controls temperature and how long it is maintained. A separate proposal mechanism chooses the candidate neighbour; temperature affects whether a worsening proposal is accepted.

#### 2019 Q5

**Question recap:** Which is not a property of basic hill climbing?

**Answer:** D — Backtracking.

**Why:** Basic hill climbing keeps moving to a better neighbour and stops when none is available. It does not maintain earlier alternatives to systematically revisit them.

#### 2019 Q6

**Question recap:** Which A* optimality conditions hold?

**Answer:** C — Both conditions.

**Why:** Admissibility supports tree search, and consistency supports graph search without reopening closed states. These are the standard sufficient conditions intended by the question.

#### 2019 Q7

**Question recap:** Which method combines aspects of BFS and DFS in the course wording?

**Answer:** C in the source — Best-first search.

**Why:** Best-first search keeps competing frontier branches while pursuing the most promising one. If a different question asks for BFS completeness with DFS memory use, iterative deepening is the standard answer; the wording here is broad.

#### 2019 Q8

**Question recap:** What does h(n) estimate?

**Answer:** A — The cost from n to a goal.

**Why:** The cost already incurred from the start is $g(n)$. A* combines both in $f(n)=g(n)+h(n)$.

#### 2019 Q9

**Question recap:** Which arc-consistency statement is incorrect?

**Answer:** A — Forward checking is substantially stronger.

**Why:** Maintaining arc consistency propagates constraints between remaining variables more extensively than ordinary forward checking. It can detect failures that forward checking misses.

#### 2019 Q10

**Question recap:** Which method jumps back using recorded conflicts?

**Answer:** C — Conflict-directed backjumping.

**Why:** The conflict set identifies decisions responsible for the dead end. The algorithm can bypass unrelated decisions instead of undoing only the most recent assignment.

[Back to year index](#2019) · [All weeks](README.md)

---
