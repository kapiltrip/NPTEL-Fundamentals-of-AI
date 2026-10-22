# Repeated questions and wording traps

[All weeks](../README.md) · [Sources and verification](README.md)

Repetition is common in this assignment collection: definitions, assertion–reason pairs, and even worked diagrams recur. The examples below link to the actual screenshots and discussions. Some are close repeats; others reuse the concept with different wording. The collection has 510 question instances, including duplicates, rather than 510 distinct questions. No percentage of exact repeats has been calculated.

| Week | Repeated question or pattern | Compare the collected instances | What to remember |
|---|---|---|---|
| 1 | Rule order in a production system | [2019 Q6](../Week%2001.md#2019-q6) · [2025 Q8](../Week%2001.md#2025-q8) · [2026 Q6](../Week%2001.md#2026-q6) | Commutativity makes rule order unimportant. |
| 2 | The same 8-puzzle start and goal | [2022 Q7–Q9](../Week%2002.md#2022-q7) · [2024 Q6–Q8](../Week%2002.md#2024-q6) · [2026 Q7–Q9](../Week%2002.md#2026-q7) | Hamming 5; Manhattan 6; shortest route 6 moves. A path has 7 states. Expansion counts require a stated convention. |
| 3 | The same alpha-beta tree and node bounds | [2024 Q6–Q10](../Week%2003.md#2024-q6) · [2025 Q6–Q10](../Week%2003.md#2025-q6) | Root alpha becomes 3; E’s beta is 2; D’s upper bound is 0. The public video confuses the bounds. |
| 4 | Knowledge representation as a surrogate | [2019 Q8](../Week%2004.md#2019-q8) · [2024 Q7](../Week%2004.md#2024-q7) · [2025 Q8](../Week%2004.md#2025-q8) · [2026 Q2](../Week%2004.md#2026-q2) | A representation stands in for the world so reasoning can replace some physical action. |
| 5 | Existential witnesses and Skolemisation | [2019 Q4](../Week%2005.md#2019-q4) · [2024 Q4](../Week%2005.md#2024-q4) · [2025 Q4](../Week%2005.md#2025-q4) | Independent witnesses use fresh constants; witnesses dependent on universal variables use functions. This is a repeated concept, with different question forms. |
| 6 | Clause subsumption | [2019 Q8](../Week%2006.md#2019-q8) · [2024 Q1](../Week%2006.md#2024-q1) · [2025 Q2](../Week%2006.md#2025-q2) · [2026 Q3](../Week%2006.md#2026-q3) | A substitution must make the first clause a subset of the second. The answer letter changes. |
| 7 | Goals, desirability, and likelihood | [2019 Q1](../Week%2007.md#2019-q1) · [2024 Q4](../Week%2007.md#2024-q4) · [2025 Q2](../Week%2007.md#2025-q2) | The repeated course key says utility theory. The discussions distinguish utility from decision theory’s combination of utilities and probabilities. |
| 8 | STRIPS and ABSTRIPS | [2019 Q4/Q10](../Week%2008.md#2019-q4) · [2024 Q3/Q4](../Week%2008.md#2024-q3) · [2025 Q4/Q5](../Week%2008.md#2025-q4) · [2026 Q2/Q3](../Week%2008.md#2026-q2) | STRIPS uses preconditions and effects; ABSTRIPS is hierarchical. |
| 9 | Value iteration versus policy iteration | [2024 Q7/Q9](../Week%2009.md#2024-q7) · [2025 Q6/Q7](../Week%2009.md#2025-q6) · [2026 Q1/Q7](../Week%2009.md#2026-q1) | Value iteration backs up values. Policy iteration alternates policy evaluation and improvement. The 2026 questions rephrase these operations. |
| 10 | The cognitive approach to AI | [2019 Q3](../Week%2010.md#2019-q3) · [2024 Q1](../Week%2010.md#2024-q1) · [2025 Q1](../Week%2010.md#2025-q1) · [2026 Q1](../Week%2010.md#2026-q1) | It studies how intelligence arises; the engineering approach emphasises building effective systems. |
| 11 | The maximum-margin classifier | [2019 Q4](../Week%2011.md#2019-q4) · [2024 Q3](../Week%2011.md#2024-q3) · [2025 Q6](../Week%2011.md#2025-q6) · [2026 Q2](../Week%2011.md#2026-q2) | Select the separating hyperplane with the greatest margin from the nearest training points. |
| 12 | State–action values and Q-learning | [2019 Q6](../Week%2012.md#2019-q6) · [2024 Q6](../Week%2012.md#2024-q6) · [2025 Q2](../Week%2012.md#2025-q2) · [2026 Q4](../Week%2012.md#2026-q4) | Q-learning estimates action values. The 2026 question asks about off-policy learning rather than the same fill-in-the-blank. |

## Similar questions whose answers change

- **Read the negation:** [2024 Week 4 Q1](../Week%2004.md#2024-q1) says intelligent behaviour **cannot** be achieved by symbol manipulation, making C false. [2025 Week 4 Q2](../Week%2004.md#2025-q2) says **can**, making C true. The selections are A/D versus A/C/D.
- **Recalculate changed data:** [2025 Week 10 Q7–Q8](../Week%2010.md#2025-q7) uses ten examples with six Yes and four No labels: entropy is about 0.971 bits. [2026 Week 10 Q6/Q8](../Week%2010.md#2026-q6) uses a different eight-example dataset. Its entropy is one bit. Both choose Outlook for the best split, but that agreement does not make their numbers interchangeable.
- **Keep component definitions separate:** [2024 Week 12 Q8](../Week%2012.md#2024-q8) falsely says a model predicts the agent’s next behaviour. [2025 Week 12 Q1](../Week%2012.md#2025-q1) preserves the same faulty idea in a source-key statement. An environment model predicts environmental outcomes; a policy chooses actions.
- **Check public selections:** The repeated [alpha-beta tree](../Week%2003.md#2024-q6) and [2024 expected-utility table](../Week%2007.md#2024-q8) include wrong choices in the video. The worked calculations underneath identify the corrections.

For quick revision, learn the answer’s meaning and reproduce the short calculation or counterexample. Then compare the next year’s version before memorising a letter. These examples support prioritising repeated assignment topics; they do not establish how often questions repeat in the final exam, because an authenticated final-exam paper was not found.
