"""Source wording checked against the saved screenshots, 23 October 2026.

Obvious spelling and spacing errors are normalised. Source letters are retained.
These are public course copies; a source transcription is not an official key.
"""
TRANSCRIPTIONS = {}


def Q(week, year, number, prompt, choices, correct, context=None, note=None):
    item = dict(prompt=prompt, options=[dict(id=chr(97+i), text=text) for i, text in enumerate(choices)],
                correct=list(correct), type='multiple' if len(correct)>1 else 'single', mode='original')
    if context:
        item['context'] = context
    if note:
        item['note'] = note
    TRANSCRIPTIONS[f'w{week:02d}-{year}-q{number:02d}'] = item


AR = ['Both A and R are true, and R is the correct explanation for A.',
      'Both A and R are true, but R is not the correct explanation for A.',
      'A is true, but R is false.', 'A is false, but R is true.']

Q(1,2025,1,'George B. Dyson refers to ______ as the patriarch of artificial intelligence in his book, “Darwin Among the Machines: The Evolution of Global Intelligence”.',
  ['John McCarthy','Thomas Hobbes','Alan Turing','Herbert Simon'],'b')
Q(1,2025,2,'Heuristic searching, which is now a central idea of AI, was employed to design ______.',
  ['The Logic Theorist, considered by many to be the first AI program.','Machines with minds, in the full and literal sense.','Electromechanical machines to read thousands of German radio intercepts.','A simple test that could be used to prove that machines could think.'],'c',
  note='This historical item is scored using the course copy’s intended answer; its wording is imprecise. See the explanation after answering.')
Q(1,2025,3,'Of the different dimensions of Artificial Intelligence, “Think Rationally” is to:',
  ['Model human cognition.','Formalise the inference process.','Do the right thing.','Exhibit human behaviour.'],'b')
Q(1,2025,4,'______ aims at building machines that act intelligently, without taking a position on whether or not the machines actually are intelligent.',
  ['Weak AI','Strong AI','Connectionist AI','Symbolic AI'],'a')
Q(1,2025,5,'Assertion A: An AI production system with uninformed control has low control-strategy cost.\n\nReason R: At the uninformed extreme, the control strategy is guided by problem knowledge great enough to select a correct rule every time.',AR,'c')
Q(1,2025,6,'Fringe nodes wait in a sequence to be explored. The fringe for Depth-First Search is a ______ data structure.',
  ['Unordered','FIFO','LIFO','Queue'],'c')
Q(1,2025,7,'Fringe nodes wait in a sequence to be explored. The fringe for Breadth-First Search is a ______ data structure.',
  ['Unordered','FIFO','LIFO','Stack'],'b')
Q(1,2025,8,'The order in which a set of applicable rules is applied to a database is unimportant for a ______ production system.',
  ['Decomposable','Commutative','Specialised','AND/OR'],'b')
Q(1,2025,9,'Bidirectional search runs two simultaneous searches. Which of the following statements is false?',
  ['It requires the ability to generate predecessor states.','Bidirectional search is always optimal.','Stop when the frontiers intersect.','It works well only when there are unique start and goal states.'],'b')
Q(1,2025,10,'Identify the criteria on which search strategies are evaluated. Select every correct option.',
  ['Completeness','Consistency','Space complexity','Admissibility'],'ac')

Q(2,2025,1,'A* generates an optimal solution under which conditions?\n\nI. h(n) is admissible and the search space is a tree.\nII. h(n) is consistent and the search space is a graph.',
  ['A* never generates an optimal solution.','I only','Both I and II','II only'],'c')
Q(2,2025,2,'The fringe for Depth-First Search is a ______ data structure.',
  ['Unordered','FIFO','LIFO','Queue'],'c')
Q(2,2025,3,'Solving a constraint satisfaction problem on a finite domain is a/an ______ problem with respect to the domain size.',
  ['P-complete','NP-complete','NP-hard','Domain-dependent'],'b',note='Use the standard decision formulation: does a satisfying assignment exist?')
Q(2,2025,4,'A CSP solution is a complete assignment satisfying all constraints. Which statements are true?\n\nI. An assignment violating no constraint is consistent or legal.\nII. A complete assignment mentions every variable.',
  ['Neither I nor II','Both I and II','I only','II only'],'b')
Q(2,2025,5,'Conflict-directed backjumping is better than simple backjumping because:\n\nI. When a partial solution cannot be extended, the algorithm backtracks to the latest choice point.\nII. When a contradiction occurs, remember the minimum set of variables from the conflict set responsible for the problem.',
  ['Neither I nor II','Both I and II','I only','II only'],'d')
Q(2,2025,6,'The A* search algorithm is based on:',
  ['Breadth-First Search','Depth-First Search','Best-First Search','Hill climbing'],'c',context='graph')
Q(2,2025,7,'Starting with A, both B and F can be reached. Which node does A* consider next, and why?',
  ['Node F; f(F) > f(B).','Node B; f(B) > f(F).','Node B; f(B) < f(G).','Node F; f(F) < f(B).'],'d',context='graph',note='Use the A* evaluation f(n)=g(n)+h(n). The printed comparison with G in option C is retained.')
Q(2,2025,8,'Which successor of I along the most-effective path has the least evaluation f(n)?',
  ['Node E','Node H','Node J','Node G'],'c',context='graph')
Q(2,2025,9,'Which successor of I along the most-effective path is least promising?',
  ['Node E','Node H','Node J','Node G'],'a',context='graph',note='Use graph search: G is already closed, and a worse revisit to G is discarded.')
Q(2,2025,10,'What is the most cost-effective path from start A to goal J using A*?',
  ['A–F–H–I–J','A–B–D–E–J','A–B–C–E–J','A–F–G–I–J'],'d',context='graph')

Q(1,2023,1,'George B. Dyson refers to ______ as the patriarch of artificial intelligence in “Darwin Among the Machines: The Evolution of Global Intelligence”.',
  ['John McCarthy','Thomas Hobbes','Alan Turing','Herbert Simon'],'b')
Q(1,2023,2,'Heuristic searching, which is now a central idea of AI, was employed to design:',
  ['The Logic Theorist, considered by many to be the first AI program.','Machines with minds, in the full and literal sense.','Electromechanical machines to read thousands of German radio intercepts.','A simple test that could be used to prove that machines could think.'],'c',
  note='Scored using the accepted answer displayed in this source. The historical wording is imprecise.')
Q(1,2023,3,'Production systems are cognitive architectures in which knowledge is represented as rules. Which is not an essential component of a basic AI production system?',
  ['Global database','Set of rules','Learning element','Control strategy'],'c')
Q(1,2023,4,'Transforming a problem statement into the components of a production system is called the ______ in AI.',
  ['Mapping problem','Translation problem','Representation problem','Generation problem'],'c')
Q(1,2023,5,'Assertion A: An AI production system with uninformed control has low control-strategy cost.\n\nReason R: At the uninformed extreme, the control strategy is guided by problem knowledge great enough to select a correct rule every time.',AR,'c')
Q(1,2023,6,'Assertion A: An irrevocable control regime can always be used in a commutative production system.\n\nReason R: Applying an inappropriate rule in a commutative production system delays, but never prevents, termination.',AR,'b',
  note='The displayed 2023 accepted answer is used for this assertion–reason relationship. The explanation distinguishes the course key from the underlying idea.')
Q(1,2023,7,'Mark the nodes expanded in the second BFS level, two steps from the start S.',
  ['Q, R, E, C, B','Q, R, H, C, B','Q, H, E, C, B','Q, R, H, E, B'],'b',context='bfs2023',note='Count distinct states in the BFS layer, excluding states already reached at a shallower depth.')
Q(1,2023,8,'For Breadth-First Search of this graph, which solution path is found?',
  ['S–E–H–Q–R–F–G','S–D–E–R–F–G','S–E–R–F–G','S–P–Q–R–F–G'],'c',context='bfs2023')
Q(1,2023,9,'Which statements are correct for Breadth-First Search? Select every correct option.',
  ['The fringe is a FIFO queue.','The fringe is a LIFO queue.','Expand the shallowest unexpanded node first.','New nodes are added to the front of the OPEN list.'],'ac')
Q(1,2023,10,'Uniform-cost search uses a priority queue ordered by the path cost so far. Find the solution cost from S to G.',
  ['24','28','23','29'],'c',context='bfs2023')
