from pathlib import Path
from collections import Counter
import json, re, hashlib, random, shutil
from bisect import bisect_right
import fitz
from source_transcriptions import TRANSCRIPTIONS

ROOT=Path(__file__).resolve().parents[2]
GAME=ROOT/'game'
TEMPLATES={}

def T(key,prompt,correct,a,b,c,context=None):
    TEMPLATES[key]=dict(prompt=prompt,choices=[correct,a,b,c],context=context)

AR=['Both statements are true, and the reason explains the assertion.','Both statements are true, but the reason does not explain the assertion.','The assertion is true, but the reason is false.','The assertion is false, but the reason is true.']
def ARQ(key,assertion,reason,index):
    options=[AR[index]]+[text for i,text in enumerate(AR) if i!=index]
    T(key,'Assertion: '+assertion+'\n\nReason: '+reason,*options)

CONTEXTS={
'puzzle':dict(title='8-puzzle instance',text='The blank is not counted as a misplaced tile. Each legal move swaps the blank with an adjacent tile.',puzzle=dict(start=[1,3,4,8,0,5,7,2,6],goal=[1,2,3,8,0,4,7,6,5])),
'or':dict(title='OR-node successors',table=dict(headers=['Successor','Edge cost','Heuristic'],rows=[['A',2,6],['B',1,8],['C',4,2]])),
'tree2026':dict(title='Game tree',text='A is MAX. Levels alternate MIN and MAX. Evaluate children from left to right.',tree=True),
'blocks':dict(title='Blocks-world knowledge base',text='Facts: on(A,B), on(B,C), on(D,E), table(C), table(E), clear(A), clear(D).\nRules:\n$on(x,y)\\rightarrow above(x,y)$\n$above(x,y)\\land above(y,z)\\rightarrow above(x,z)$\n$clear(x)\\rightarrow\\neg\\exists y\\,on(y,x)$\nThere is no closed-world assumption. The last rule rules out immediate contact above a clear block; no rule here rules out every above relation.'),
'horses':dict(title='Predicate meanings',text='$P(x)$: x is registered.\n$Q(x)$: x is a thoroughbred.\n$R(x)$: x has won a race.\nThe domain consists of horses.'),
'utility2026':dict(title='Action outcomes',text='P(success) = 0.6; P(failure) = 0.4.',table=dict(headers=['Action','Utility if success','Utility if failure'],rows=[['A1',100,-20],['A2',80,-5]])),
'mdp2026':dict(title='One-step MDP',text='Discount factor $\\gamma=0.5$. Use $Q(S,a)=\\sum_{s\u2032}P(s\u2032\\mid S,a)[R(s\u2032)+\\gamma U(s\u2032)]$.',table=dict(headers=['Successor','R','U','P under A1','P under A2'],rows=[['A',2,4,0.75,0.25],['B',0,2,0.25,0.75]])),
'data2026':dict(title='Decision-tree training data',table=dict(headers=['ID','Outlook','Wind','Play?'],rows=[[1,'Sunny','Weak','No'],[2,'Sunny','Strong','No'],[3,'Overcast','Weak','Yes'],[4,'Overcast','Strong','Yes'],[5,'Rain','Weak','Yes'],[6,'Rain','Weak','Yes'],[7,'Rain','Strong','No'],[8,'Rain','Strong','No']])),
'graph':dict(title='Relevant A* graph information',text='Start A; goal J. Relevant edges: A–B:6, A–F:3, F–G:1, G–I:3, I–J:3, I–H:2, I–E:5.\nHeuristics: h(B)=8, h(F)=6, h(G)=5, h(I)=1, h(J)=0, h(H)=3, h(E)=3.\nFor the successor comparisons, I has been reached along A–F–G–I. G is already closed; discard a worse revisit to G.'),
'bfs2023':dict(title='Directed graph',text='Successors with edge costs:\nS: D(3), E(9), P(1)\nD: B(1), C(8), E(2)\nB: A(2); C: A(2)\nE: H(1), R(9)\nH: P(4), Q(4); P: Q(15)\nQ: R(3); R: F(5)\nF: C(5), G(5)\nStart S; goal G. For BFS, use distinct nodes and a visited set; costs matter only for uniform-cost search.'),
'bayes2019':dict(title='Bayesian network',text='Directed edges: A → C ← B, C → D, C → E. No other edges are present. Assume the usual generic dependencies allowed by this graph.'),
'spam':dict(title='Printed probabilities',text='S = spam; F = contains “free”; T = contains “text”.\nP(S)=0.134, P(F)=0.0475, P(S∩F)=0.0357, P(T)=0.0701, P(T|S)=0.3855.\nUse these printed percentages. The source also gives message counts inconsistent with P(S); the explanation flags that discrepancy.'),
'review':dict(title='Exam-topic decision',text='The topic appears with probability 0.5 and does not appear with probability 0.5.',table=dict(headers=['Action','Utility if topic appears','Utility if absent'],rows=[['Review',1000,600],['Sleep',0,1500]])),
'data2025':dict(title='Ten-example training set',table=dict(headers=['Outlook','Temperature','Humidity','Wind','Play?'],rows=[['Sunny','Hot','High','Weak','No'],['Sunny','Hot','High','Strong','No'],['Overcast','Hot','High','Weak','Yes'],['Rain','Mild','High','Weak','Yes'],['Rain','Cool','Normal','Weak','Yes'],['Rain','Cool','Normal','Strong','No'],['Overcast','Cool','Normal','Strong','Yes'],['Sunny','Mild','High','Weak','No'],['Sunny','Cool','Normal','Weak','Yes'],['Rain','Mild','Normal','Weak','Yes']])),
}
CONTEXTS['mdp2026']['text']=r"Discount factor $\gamma=0.5$. Use $Q(S,a)=\sum_{s'}P(s'\mid S,a)[R(s')+\gamma U(s')]$."
CONTEXTS['graph']['image']='figures/astar-graph-2023.jpg'
CONTEXTS['graph']['imageAlt']='Original 2023 A* assignment graph. A is the start, J the goal; red node labels are heuristics and black edge labels are costs.'
CONTEXTS['graph']['caption']='A is the start and J is the goal. Red labels are heuristics; black edge labels are costs. For successor comparisons at I, use the best route A–F–G–I and discard worse revisits to already-closed G.'
CONTEXTS['graph']['collapsibleText']=True
CONTEXTS['bfs2023']['image']='figures/bfs-graph-2023.png'
CONTEXTS['bfs2023']['imageAlt']='Directed 2023 assignment graph with start S and goal G; all edge costs are printed.'
CONTEXTS['bfs2023']['caption']='Start S; goal G. Arrows give the permitted direction of travel. BFS counts edges; uniform-cost search uses the printed costs.'
CONTEXTS['bfs2023']['collapsibleText']=True

# Historical items are explicit recap adaptations. Their four options are practice
# choices, never represented as a verbatim transcription or an official key.
T('mccarthy','Who coined the term artificial intelligence?','John McCarthy','Alan Turing','Marvin Minsky','Arthur Samuel')
T('turing','What was the imitation game intended to assess?','Whether a machine can exhibit human-like intelligent conversational behaviour','The clock speed of a machine','Whether a computer can break every cipher','Whether every machine has consciousness')
T('production','What must a basic production-system problem specify?','A global database, production rules, and a control strategy','Only a goal state and a processor speed','A compiler, an operating system, and SQL','A neural network and training labels only')
T('uninformedcost','How does an uninformed production-system control strategy divide computational cost in the course model?','Low rule-selection/control cost, but high rule-application/search cost','High control cost, but low search cost','Both costs are necessarily zero','Both costs are necessarily exponential in the number of rules')
T('arrangements','How many total arrangements of eight distinct tiles and a blank exist, before restricting to one reachable parity class?','$9!=362{,}880$','$8!=40{,}320$','$9^2=81$','Infinitely many')
T('commutative','In which specialised production system does the order of applicable rules not change solution reachability?','Commutative','Decomposable','AND/OR','Non-monotonic by definition')
T('heuristicsearch','Which search uses domain knowledge to rank promising nodes?','Heuristic search','Breadth-first search ordered only by depth','Depth-first search ordered only by a stack','Uniform random search')
T('weakai','Which AI position aims at intelligent behaviour without claiming that the machine literally has a mind?','Weak AI','Strong AI','The claim that all computation is conscious','The claim that every intelligent system must be biological')
T('bfs','Which description of the BFS fringe and expansion rule is correct?','A FIFO queue, expanding the shallowest unexpanded nodes first','A LIFO stack, expanding the deepest node first','A priority queue ordered solely by a goal heuristic','A queue that always inserts new nodes at the front')
T('bidirectional','Which unqualified statement about bidirectional search is false?','It is always optimal, regardless of edge costs or stopping rules','It runs searches from the start and goal directions','Backward search needs a way to generate predecessors','The two search frontiers are used to detect a meeting')
T('aristotle','What argument structures did Aristotle use to formalise valid reasoning?','Syllogisms','Backpropagation','Production-rule compilers','Gradient descent')
T('limitedgame','What is a practical aim of search in a game tree too large to explore completely?','Choose a good move within feasible time using limited search and evaluation','Enumerate every possible terminal game before moving','Guarantee a win against every possible opponent','Avoid evaluating all non-terminal positions')
T('aostarops','What are the two main operations of AO*?','Grow the graph top-down, then revise costs and solved labels bottom-up','Grow bottom-up, then erase every heuristic','Expand every node, then perform a single BFS','Replace every AND node with a randomly selected child')
T('hobbes','Whom does George Dyson identify as a patriarch of AI in the quoted course question?','Thomas Hobbes','John McCarthy','Claude Shannon','Herbert Simon')
T('cryptanalysis','Which historical heuristic-search application is accepted in this particular course question?','Electromechanical cryptanalysis of German radio messages','A proof that all machines are conscious','A general replacement for mathematical logic','A test that measures only arithmetic speed')
T('learningelementnot','Which item is not essential to a basic production system?','A learning element','A global database','A set of rules','A control strategy')
T('representation','What is translating a problem into production-system components called?','The representation problem','The halting problem','The frame problem','The credit-assignment problem')
ARQ('uninformedAR','Uninformed control has low control-strategy cost.','At the uninformed extreme, domain knowledge always selects a correct rule.',2)
T('commutativekey','For the 2023 commutative-system assertion–reason item, which relationship does the displayed accepted feedback record?','Both statements are true, but the reason is not accepted as the explanation','Both statements are true and the reason is accepted as the explanation','The assertion is true and the reason false','The assertion is false and the reason true')
T('bfslevel','Which distinct nodes are reached in exactly the second BFS layer from S?','Q, R, H, C, and B','D, E, and P only','F and G only','A and G only','bfs2023')
T('bfspath','Which listed BFS solution path reaches G using the fewest edges?','S–E–R–F–G','S–D–E–H–Q–R–F–G','S–P–Q–R–F–G','S–D–C–A–G','bfs2023')
T('ucs23','What is the uniform-cost solution cost from S to G?','23','25','28','30','bfs2023')
T('gps','Which Newell–Simon program was developed in 1957 to pursue general problem solving?','General Problem Solver','The Imitation Game','Deep Blue','ELIZA')
T('rational','What does the “think rationally” dimension of AI emphasise?','Formalising valid inference','Copying human errors exactly','Acting without any internal model','Producing only human-like body movements')
T('control','What chooses production rules and tracks attempted rule sequences?','The control strategy','The goal state alone','The compiler cache','The learning rate')
ARQ('informedAR','Informed control can have a higher rule-selection cost.','It evaluates domain knowledge to select promising rules.',0)
T('bestfirstwording','Which search family does the course describe broadly as combining aspects of BFS and DFS through preferential node selection?','Best-first search','Pure breadth-first search only','Pure depth-first search only','Random restart with no evaluation function')
T('dfs','What fringe discipline is used by depth-first search?','LIFO stack','FIFO queue','Increasing path cost only','Increasing heuristic only')
T('searchcriteria','Which pair contains two standard criteria for evaluating a search strategy?','Completeness and space complexity','File extension and display resolution','Compiler language and monitor size','Training labels and network width only')

T('relaxed','A heuristic is the exact optimal cost of a relaxed problem with fewer restrictions. What property does that normally give?','Admissibility: it does not overestimate the original remaining optimal cost','It must overestimate the remaining cost','It eliminates the need for a goal test','It is guaranteed to be more expensive to compute than the original problem')
T('inadmissiblefalse','Which blanket claim about an inadmissible heuristic is false?','It always underestimates the remaining optimal cost','It may overestimate the remaining optimal cost','It can destroy the usual A* optimality guarantee','Its effect on explored-node count depends on the problem')
T('consistency','How does consistency compare with admissibility under the standard nonnegative-cost assumptions?','Consistency imposes a stronger condition','Consistency is strictly weaker','The two definitions are identical on every graph','A consistent heuristic must overestimate')
T('cooling','Which item is not specified by a simulated-annealing cooling schedule?','Which successor state is proposed','The initial temperature','How temperature decreases','When the temperature schedule stops')
T('hill','Which item is not a property of basic hill climbing?','Backtracking through a maintained search tree','Moving to a locally preferred successor','Susceptibility to local optima','Use of an evaluation function')
T('astaroptimal','Which conditions give the standard A* optimality guarantees?','Admissibility for tree search; consistency for graph search without reopening','Admissibility is unnecessary in tree search','Any heuristic gives an optimal graph-search result','Greedily minimising h alone always gives the cheapest path')
T('hdefinition','What does the heuristic h(n) estimate in standard A*?','The remaining cost from n to a goal','The cost already paid from the start to n','The number of all possible goal states','The processor time consumed by the search so far')
T('arcincorrect','Which claim comparing arc consistency and forward checking is incorrect?','Forward checking is substantially stronger than arc consistency','Arc consistency checks support for values across constrained arcs','Unsupported values can be removed from domains','Constraint propagation can reduce later search')
T('backjump','Which method uses the actual conflict set to jump back to a relevant earlier variable?','Conflict-directed backjumping','Chronological backtracking only','Breadth-first search','Random successor selection')
T('astarfamily','A* belongs to which search family?','Best-first search','Pure depth-first search','Uninformed breadth-first search only','Random sampling without priorities')
T('inadmissiblerisk','Which statement about an inadmissible heuristic is justified?','Overestimation can lose optimality; explored-node count is not determined by admissibility alone','It always expands more nodes than every admissible heuristic','It always gives an optimal solution','It is defined by always underestimating every path')
T('csp','When is a CSP assignment a solution?','Every variable is assigned and every constraint is satisfied','Every variable is assigned even if constraints fail','Some variables are assigned without any conflict','The first variable has a legal value')
T('arcproperties','Which is a valid description of arc-consistency propagation?','Remove values with no supporting value across a constrained arc; this need not solve the CSP','It is stronger to skip all checks between unassigned variables','Every arc-consistent CSP is guaranteed to have a solution','It changes the original constraints until any assignment is accepted')
T('hamming','For this puzzle, what is the Hamming distance, excluding the blank?','5','7','6','4','puzzle')
T('manhattan','For this puzzle, what is the sum of tile Manhattan distances, excluding the blank?','6','5','7','4','puzzle')
T('puzzlemoves','What is the shortest legal solution length for this puzzle?','6 moves','5 moves','7 moves','4 moves','puzzle')
T('puzzleexpansions','For standard A* using Manhattan distance here, excluding expansion of the goal itself, how many non-goal states are expanded on the solution trace?','6','5','7','4','puzzle')
T('heuristicgain','What is the principal practical gain from a useful heuristic?','Exploring less of the search space before finding a solution','Eliminating the goal test','Generating every state before expanding one','Guaranteeing an optimal result for every possible heuristic')
T('admissiblestatements','Which statement correctly combines the admissibility properties used in this question?','An admissible heuristic is optimistic, never overestimates, and can be the zero heuristic for nonnegative costs','It must strictly underestimate at every state, including goals','It always destroys A* optimality','It is required to overestimate somewhere')
T('afterA','Immediately after A, should A* prefer B or F?','F, because its f-value is smaller','B, because its f-value is smaller','B, because h(B) is larger','Both have equal f-values','graph')
T('bestI','Among the eligible successors of I, which has the smallest A* evaluation?','J','H','E','They are all equal','graph')
T('worstI','With worse revisits to closed G discarded, which eligible successor of I has the largest f-value?','E','H','J','They are all equal','graph')
T('routeJ','Which listed route follows the A* solution discussed in the source, with edge costs 3, 1, 3, and 3?','A–F–G–I–J','A–B–J','A–F–I–J','A–I–G–J','graph')
T('greedy','Which evaluation does greedy best-first search minimise?','h(n), the estimated remaining cost','g(n), the path cost already paid','g(n)+h(n), the A* evaluation','The maximum branching factor seen so far')
T('manhattanbetter','Which of these two heuristics is at least as informative for the 8-puzzle?','Manhattan distance','Hamming distance','They are always identical','Neither can be admissible')
T('npcomplete','What is the decision complexity of a general finite-domain CSP?','NP-complete','Always linear time','Undecidable even for finite explicit domains','Always constant time')
T('backjumpwhy','Why use conflict-directed rather than purely chronological backtracking?','To skip variables not responsible for the detected conflict','To ignore the constraints','To guarantee a solution after one assignment','To remove the need for domains')

T('zerosum','What is a two-player zero-sum game?','One player’s gain is the other player’s loss','Both players always get positive rewards','Both players always make the same move','The utilities have no relationship')
T('maxbackup','What value is backed up at a MAX node in minimax?','The maximum of its child values','The minimum of its child values','The sum of its child values','The first leaf encountered, regardless of other values')
T('solutiongraph','A solution graph in an AND/OR graph is analogous to what in an ordinary search graph?','A solution path','A processor register','A training label','A random restart')
T('leaves','How many leaves are in a full tree of branching factor b and depth d?','$b^d$','$b+d$','$bd$','$d^b$')
T('alphacut','A MIN node obtains a value no greater than a MAX ancestor’s alpha. What cutoff is possible?','Alpha cutoff','Beta cutoff','No cutoff is ever possible at MIN','A change to the minimax utility function')
T('betacut','A MAX node reaches or exceeds a MIN ancestor’s beta. What cutoff is possible?','Beta cutoff','Alpha cutoff','No cutoff is possible at MAX','A guaranteed change of the root value')
T('samevalue','At the same depth with the same leaf evaluations, alpha-beta preserves what?','The minimax root value','The number of expanded leaves','The exact order in which every leaf is visited','A different, larger root value')
T('twicedepth','With ideal move ordering, alpha-beta can search approximately how much deeper than ordinary minimax for a comparable leaf budget?','About twice as deep','Exactly one level deeper for all trees','Half as deep','An unlimited depth independent of branching')
T('minimaxcombined','Which description of minimax is correct?','MAX maximises, MIN minimises, and child values are backed up under optimal opposing play','MAX and MIN both average all child values','Both players always maximise the same utility','Only the first explored branch matters')
T('alphabetaall','Which description correctly combines the standard alpha-beta properties?','It is a depth-first minimax optimisation that skips irrelevant branches and preserves the root value','It must examine every leaf','It changes the minimax decision whenever it prunes','It works only when all leaf utilities are positive')
T('root3','MAX root C has a MIN child A. A’s first MAX child has leaves 2 and 3; its other MAX child has an examined leaf 5. What lower bound reaches C from A?','3','5','2','0')
T('Bbeta','MAX node B has just examined leaf 5. Its MIN parent already has an alternative worth 3. What pruning occurs at B?','Beta pruning','Alpha pruning','No pruning because 5 is positive','Both bounds become infinity')
T('Dalpha','MIN node D gets 0 from its first child. The MAX root already has alpha 3. What pruning occurs at D?','Alpha pruning','Beta pruning','No pruning because 0 is finite','The root value must change to 0')
T('Ebeta2','MIN node E’s first MAX child has leaves 2 and 1. What beta bound is established at E?','2','3','1','0')
T('Dupper0','A MIN node D already has one child worth 0. What is the strongest stated upper bound before examining its other children?','D cannot exceed 0','D must be at least 3','D must equal the root’s alpha of 3','D is unbounded above')
T('andorrequirements','What must an AND/OR search algorithm handle?','Best-first guidance plus AND requirements, producing a solution subgraph reaching the needed goal states','Exactly one child at every AND node','Only a single ordinary path with no AND branching','All successors must be ignored at every OR node')
T('saddle','In the course matrix convention, what is an entry minimal in its row and maximal in its column called?','A saddle point','A support vector','A Skolem constant','A local Markov blanket')
T('naiveminimax','Why is naive exhaustive minimax inefficient in a large game tree?','The branching tree grows rapidly and many branches cannot affect the final choice','Every game has negative edge costs','Minimax cannot represent an opponent','MAX nodes can never be evaluated')

T('pragmatics','What does the pragmatics of a representation language specify?','How meaningful expressions are used','Only which character sequences are grammatical','Only which objects constants denote','Only how many predicate symbols exist')
T('semidecidable','Which description correctly states FOL entailment’s semidecidability?','Entailed sentences can eventually be confirmed, but a non-entailed input need not terminate with “no”','Every input is decided in a fixed finite number of steps','No entailed sentence can ever be proved','Every non-entailed sentence is immediately rejected')
T('firstorder','Why is first-order logic called first-order?','It quantifies over individuals, not over predicates or functions','It has only one predicate','It permits no quantified variables','It can express only the first statement in a proof')
T('unsat','Which clause-set property guarantees that a complete resolution procedure has a refutation?','Unsatisfiability','Satisfiability','Having only one variable','Having no constants')
T('closedground','A sentence with no free variables is ___; one with no variables at all is ___.','Closed; ground','Ground; open','Open; closed','A clause; a function')
T('domain','What is the set over which a logical variable ranges?','The domain or universe of discourse','The list of proof steps','Only the predicate symbols','The set of machine instructions')
T('plweak','Which limitation helps explain propositional logic’s weakness for relational knowledge?','It cannot directly quantify over individuals and their relations','It cannot express any Boolean combinations','It has no truth values','It cannot express negation')
T('surrogate','Why is a knowledge representation described as a surrogate?','It stands in for the world so reasoning can predict consequences without acting on the world','It is required to be a physical copy of every object','It eliminates every modelling assumption','It is merely an execution timer')
T('symbols','Which description fits the physical-symbol-system view?','Knowledge uses symbol structures and intelligent behaviour can result from manipulating them','Intelligent behaviour cannot arise from manipulating symbols','Only a biological brain can store symbols','Symbols are necessarily unmodifiable')
T('predicate','What expresses a property of an object or a relation among objects?','A predicate','A Skolem constant','A memory address','A control stack')
T('symbolsCannot','A statement says “intelligent behaviour cannot be achieved through symbol manipulation.” How does that relate to the physical-symbol-system hypothesis?','It contradicts the hypothesis','It is the hypothesis’s central positive claim','It follows from the definition of a constant','It is another name for universal instantiation')
T('dataknowledge','Which mapping of data, information, and knowledge is intended here?','Data: primitive facts; information: interpreted data; knowledge: useful relations among data','Data: interpreted data; information: useful relations; knowledge: unprocessed facts','Data: useful relations; information: raw symbols only; knowledge: processor speed','All three refer only to compiled program instructions')
T('semantics','What assigns a proposition meaning relative to an interpretation?','Semantics','Typography','Control-strategy cost','Backtracking order')
T('closedworld','What is the closed-world assumption?','Treat an unestablished ground fact as false','Assume distinct constant names necessarily denote the same object','Assume every existential holds for all objects','Assume every unproved formula is logically contradictory in FOL')
T('quantifiers','Which statement about quantifier satisfaction is correct?','A universal needs every object; an existential needs at least one and may hold for all','An existential means at least one but not all','A universal needs only one witness','Both quantifiers mean exactly one object')
T('quantifierorder','Which quantifier reordering is valid in general?','$\\forall x\\forall y P(x,y)\\equiv\\forall y\\forall x P(x,y)$','$\\forall x\\exists yP(x,y)\\equiv\\exists y\\forall xP(x,y)$ in all structures','$\\exists xP(x)\\equiv\\forall xP(x)$','$\\forall xP(x)\\equiv\\exists x\\neg P(x)$')
T('profdean','How do we express “All professors consider every dean a friend or do not know that dean”?','$\\forall x\\forall y[(Professor(x)\\land Dean(y))\\rightarrow(Friend(x,y)\\lor\\neg Know(x,y))]$','$\\forall x\\forall y[(Professor(x)\\land Dean(y))\\rightarrow(Friend(x,y)\\land Know(x,y))]$','$\\exists x\\exists y[Professor(x)\\land Dean(y)\\land Friend(x,y)]$','$\\forall x[Professor(x)\\rightarrow\\exists y\\,Know(y,x)]$')
T('criticize','With Friend(x,y) meaning “x is a friend of y,” express: for any people x and y, if x criticises y, then x is not a friend of y.','$\\forall x\\forall y[(Person(x)\\land Person(y)\\land Criticize(x,y))\\rightarrow\\neg Friend(x,y)]$','$\\forall x\\forall y[Criticize(x,y)\\rightarrow Friend(x,y)]$','$\\forall x\\forall y[\\neg Friend(x,y)\\rightarrow Criticize(x,y)]$','$\\exists x\\exists y[Criticize(x,y)\\land Friend(x,y)]$')
T('demorgan','Which claim about $\\neg(P\\land Q)$ and $\\neg P\\lor\\neg Q$ is correct?','They have identical truth tables and are logically equivalent','They are contradictory for every valuation','The equivalence sign is itself an ordinary connective in the given object-language formulas','They are equivalent only when P and Q are both true')
T('negforall','What is the negation of $\\forall x\\,P(x)$?','$\\exists x\\,\\neg P(x)$','$\\forall x\\,\\neg P(x)$','$\\exists x\\,P(x)$','$\\neg\\exists x\\,P(x)$')
ARQ('plAR','Propositional logic is a weak representation language.','Its statements are propositional variables combined using propositional connectives.',1)

T('interpretation','What maps representation-language symbols to objects, relations, and functions in a conceptualisation?','An interpretation','An execution trace','A cooling schedule','A search fringe')
T('axioms','What are the asserted foundational facts and rules of a domain called?','Axioms','Heuristic leaves','Support vectors','Percepts only')
T('skolemconstant','What can name a fresh existential witness that does not depend on any universal variable?','A Skolem constant','A universally quantified predicate','A mutex edge','A goal-stack frame')
T('clause','What is a clause in clausal logic?','A disjunction of literals','An arbitrary conjunction of implications','A single universally quantified function symbol','A list of search nodes')
T('mgu','What kind of unifier preserves the generality of resolution inference?','A most general unifier','An arbitrary ground substitution more specific than necessary','A substitution identifying every distinct constant','A replacement of predicates by truth values')
T('loyal','What does $\\forall x\\exists y\\,Loyal(x,y)$ say?','Everyone is loyal to someone, who may depend on the person','There is one person to whom everyone must be loyal','Everyone is loyal to everyone','Someone is loyal to nobody')
T('model','What is an interpretation satisfying every sentence in a theory called?','A model','A counterexample to the entire theory','A compiler','An unbound variable')
T('loves','What does the printed formula $\\exists y\\forall x\\,Loves(x,y)$ actually mean?','There is someone whom everyone loves','There is someone who loves everyone','Everyone loves exactly one person','No person is loved by everyone')
T('tautcontradiction','Let I be a distributive equivalence, $P\\lor(Q\\land R)\\leftrightarrow((P\\lor Q)\\land(P\\lor R))$. Let II be $(P\\leftrightarrow Q)\\land(Q\\leftrightarrow R)\\land\\neg(P\\leftrightarrow R)$. How are they classified?','I is a tautology; II is a contradiction','Both are tautologies','Both are contradictions','I is a contradiction; II is a tautology')
T('skolem','What does Skolemisation eliminate from a formula, preserving satisfiability in the expanded language?','Existential quantifiers','All universal quantifiers by replacing them with existential ones','Every predicate symbol','All negation without changing any formula')
T('icecream','Which existential formulation says that everyone likes ice cream?','$\\neg\\exists x\\,\\neg Likes(x,IceCream)$','$\\exists x\\,Likes(x,IceCream)$','$\\forall x\\,\\neg Likes(x,IceCream)$','$\\neg\\forall x\\,Likes(x,IceCream)$')
T('brother','Under the stated family-predicate definition, what condition defines x as a brother of y?','x is male and x is a sibling of y','x is male only','x is a sibling of y only','x is male or unrelated to y')
ARQ('prenexAR','An FOL formula can be converted to clausal form by a sequence of transformations.','Prenex normal form places quantifiers before a quantifier-free matrix.',1)
T('older','What substitution unifies Older(Father(y),y) and Older(Father(x),John)?','$\\{y\\mapsto John,\\ x\\mapsto John\\}$','$\\{y\\mapsto Father(John)\\}$','$\\{x\\mapsto y\\}$ alone, leaving y unrestricted','No substitution can unify them')
T('cannotunify','Can Q(y,G(A,B)) and Q(G(x,x),y) be syntactically unified when A and B are distinct constants?','No; matching would require both x=A and x=B','Yes, with x=A and y=G(A,B)','Yes, by replacing the constant B with A','Yes, by leaving both x and y unconstrained')
T('proofaxiom','Why do formal proofs rely on axioms?','Inference needs accepted premises from which consequences can be derived','Axioms guarantee that every imaginable statement is true','Axioms replace the need to obey inference rules','No conclusion can depend on a premise')
T('conceptualisation','What belongs to an FOL conceptualisation?','Objects, relations, and functions','Only the spelling of variable names','Only a sequence of machine instructions','Only an answer key')
T('axiomexamples','Which pair can supply axioms to an AI knowledge base?','Domain rules and asserted input facts','Only the elapsed search time and processor speed','Only the display layout and file names','Only consequences that have not been asserted or proved')
T('supportskolem','In $\\forall x\\exists y[On(x,y)\\land Pyramid(y)]$, what is the correct replacement using a Skolem function Support(x)?','Replace y by Support(x) in both On and Pyramid, then remove the existential quantifier','Replace y only in On and leave the same y free in Pyramid','Use one fixed constant for every x without justification','Replace the universal x by Support(y)')

T('abstraction','What is removing irrelevant detail from a state representation called?','Abstraction','Instantiation','Paramodulation','Backpropagation')
T('paramodulation','Which equality inference rule complements resolution?','Paramodulation','Gradient descent','Breadth-first expansion','Entropy maximisation')
T('resolutiontrace','What structure does a resolution trace linearise?','A resolution graph','A clustering dendrogram','A minimax utility table','A policy’s reward function')
T('answerextraction','How does resolution-based answer extraction obtain a witness answer?','Track substitutions or answer literals through a refutation to recover the requested binding','Ignore all substitutions and return every constant','Select the alphabetically first symbol in the clauses','Treat every universal variable as an unproved existential witness')
T('complete','What property says that a proof procedure will find a refutation when one exists, under its fair-search assumptions?','Completeness','Soundness alone','Compactness of clusters','Admissibility of a classifier')
T('subsumption','When does clause C1 subsume C2?','Some substitution s makes the literals of C1s a subset of C2','Every literal of C2 must be absent from C1 under all substitutions','C1 and C2 must have disjoint predicates','C1 must contain strictly more ground literals than C2')
T('ancestry','Which course strategy permits an original/base clause or an ancestor clause as the other resolution parent?','Ancestry-filtered form strategy','Pure breadth-first graph traversal','Arbitrary elimination of all ancestors','Random feature selection')
T('existentialbinding','In the answer-extraction item, which binding supplies the requested witness?','A binding of the existentially quantified query variable','The processor’s program counter','The name of the theorem prover executable','Every universal variable without any substitution')
T('jackdog','How do we state “Jack owns a dog”?','$\\exists x[Dog(x)\\land Owns(Jack,x)]$','$\\forall x[Dog(x)\\land Owns(Jack,x)]$','$\\exists x[Dog(x)\\rightarrow Owns(Jack,x)]$','$\\forall x[Owns(x,Jack)\\rightarrow Dog(Jack)]$')
T('doglover','How do we express that every dog owner is an animal lover?','$\\forall x[(\\exists y(Dog(y)\\land Owns(x,y)))\\rightarrow AnimalLover(x)]$','$\\exists x[AnimalLover(x)\\rightarrow\\forall y\\,Dog(y)]$','$\\forall x[AnimalLover(x)\\rightarrow\\exists y\\,Owns(y,x)]$','$\\forall x[Dog(x)\\rightarrow AnimalLover(Jack)]$')
T('nokill','Which formula says that no animal lover kills an animal?','$\\forall x\\forall y[(AnimalLover(x)\\land Animal(y))\\rightarrow\\neg Kills(x,y)]$','$\\forall x\\forall y[(AnimalLover(x)\\land Animal(y))\\rightarrow Kills(x,y)]$','$\\exists x\\exists y[AnimalLover(x)\\land Animal(y)\\land Kills(x,y)]$','$\\forall x[AnimalLover(x)\\rightarrow\\exists y\\,Kills(y,x)]$')
T('registerednot','Using the given predicates, how do we say every registered horse is not a thoroughbred?','$\\forall x[P(x)\\rightarrow\\neg Q(x)]$','$\\forall x[Q(x)\\rightarrow\\neg P(x)]$','$\\exists x[P(x)\\land Q(x)]$','$\\forall x[P(x)\\land\\neg Q(x)]$','horses')
T('registeredwon','Using the given predicates, how do we say every registered horse has won a race?','$\\forall x[P(x)\\rightarrow R(x)]$','$\\forall x[R(x)\\rightarrow P(x)]$','$\\exists x[P(x)\\land R(x)]$','$\\forall x[P(x)\\lor R(x)]$','horses')
T('wonnot','Using the given predicates, how do we say no horse that has won a race is a thoroughbred?','$\\forall x[R(x)\\rightarrow\\neg Q(x)]$','$\\forall x[Q(x)\\rightarrow R(x)]$','$\\exists x[R(x)\\land Q(x)]$','$\\forall x[R(x)\\rightarrow Q(x)]$','horses')
T('existgeneralisation','Which rule infers $\\exists xP(x)$ from P(c)?','Existential generalisation','Universal generalisation without conditions','Modus tollens','Skolemisation')
T('integer11','In the source’s negated-formula item, 11 makes p true and the composite-number predicate q false. What happens to $\\neg[(p\\rightarrow q)\\land r]$ regardless of r?','It is true','It is false','It is true only when r is true','It is not a Boolean formula')
T('forallrelated','For a nonempty domain, what follows from $\\forall x\\exists yR(x,y)$?','At least one related pair exists, and the quantifier-negated restatement is equivalent','There must be one common y related from every x','Every y must receive a relation from some x','Every pair of objects must be related')
T('curiosity','Jack owns a dog; every dog owner is an animal lover; animal lovers kill no animals. Either Jack or Curiosity killed Tuna, a cat; every cat is an animal. Who killed Tuna?','Curiosity','Jack','Both must have killed Tuna','It follows that Tuna is not an animal')

T('utilitykey','Which theory is named by the course’s repeated, loosely worded “goals and likelihoods” question?','Utility theory','Information theory','Graph theory','Formal-language theory')
T('uncertainty','What does probability represent about incomplete knowledge?','Uncertainty','A guarantee that the most likely event will occur','Only logical falsehood','Only processor speed')
T('chainindependence','In the chain A → B → C, what independence does the graph imply?','A and C are conditionally independent given B','A and C are always marginally independent','A is independent of B given no evidence','B and C are independent under every conditioning set')
T('dseparation','If nodes X and Y are d-separated by evidence E, what follows?','X and Y are conditionally independent given E','X and Y must be marginally independent without E','X and Y must have identical probabilities','E must be a common child of X and Y')
T('jointbn','A Bayesian network compactly specifies what?','A joint probability distribution','Only a list of deterministic actions','Only one conditional probability and no joint distribution','A minimax game utility')
T('bayesquery','What does Bayes’ rule allow us to compute?','Probabilities of hypotheses conditioned on evidence','A proof that every conditional probability equals its reverse','A guaranteed outcome from a nonzero probability','Only unconditional counts')
T('collider','In this graph, can observing C or one of C’s descendants activate the collider path between A and B?','Yes; the collider can become active','No; colliders can never become active','Only if every network edge is removed','Only if A and B are the same variable','bayes2019')
T('Edependent','Without observing C, is E generally independent of A, B, and D in this graph?','No; active paths through C can connect them','Yes; E is a leaf so it is independent of every other variable','Yes; all Bayesian-network variables are independent','Yes; independence follows solely from the letters of their names','bayes2019')
T('DgivenC','Given C, is D conditionally independent of A, B, and E in this graph?','Yes, by the graph’s conditional-independence structure','No, because conditioning can never block a chain','No, because D has a parent','Only if D is removed from the graph','bayes2019')
T('DEdependent','With C unobserved, can D and E be dependent in this graph?','Yes; they share the unobserved cause C','No; two leaves are always independent','No; dependence requires a direct edge','Only when every node has probability one','bayes2019')
T('uncertaincauses','Which pair can cause uncertainty in an agent’s environmental knowledge?','Incomplete understanding and incorrect understanding','Only perfect sensing and complete knowledge','Only deterministic actions and fully known outcomes','Only the absence of any possible state')
T('bnproperties','Which collection correctly describes a standard Bayesian network?','Random-variable nodes, directed conditional dependencies, and acyclic graph structure','A directed cycle is required at every node','Every node must be independent of all others unconditionally','Every variable must be a deterministic action')
T('markovbn','What is the local Markov property in a Bayesian network?','Each node is independent of its non-descendants conditional on its parents','Every node is independent of its parents','All pairs are unconditionally independent','Every observed variable must have no outgoing edges')
T('freespam','Using the printed probabilities, what is P(F|S)?','Approximately 0.266','Approximately 0.752','Approximately 0.134','Approximately 0.0357','spam')
T('spamfree','Using the printed probabilities, what is P(S|F)?','Approximately 0.752','Approximately 0.266','Approximately 0.0475','Approximately 0.134','spam')
T('spamtext','Using the printed probabilities, what is P(S|T)?','Approximately 0.737','Approximately 0.3855','Approximately 0.0701','Approximately 0.134','spam')
T('reviewEU','What is the expected utility of reviewing?','800','750','1000','1500','review')
T('sleepEU','What is the expected utility of sleeping?','750','800','1500','0','review')
T('bestEU','Which choice maximises expected utility?','Review, with expected utility 800','Sleep, with expected utility 1500','Sleep, with expected utility 800','Both actions have the same expected utility','review')
T('mdpstatements','Which set correctly describes an MDP?','States, actions, transition probabilities, and rewards support sequential decisions','Only the most recent percept is needed even when the state is not observable','Transition probabilities are irrelevant to model-based planning','A policy is necessarily one fixed action for every state')
T('policyvalue','What does a policy’s value function represent?','Expected cumulative return from a state while following that policy','Only the reward of the very next action','Only the largest reward that could ever occur','The probability of an arbitrary training label')
T('discount','For bounded rewards in an infinite-horizon task, why use a discount factor strictly below one?','To keep discounted return finite and emphasise nearer rewards','To guarantee that no reward is ever negative','To remove the need to choose actions','To make every state have identical value')
T('rainmarginal','The joint light-rain row across four wind categories is 0.05, 0.10, 0.15, 0.04. What is P(light rain)?','0.34','0.30','0.10','0.04')
T('windmarginal','The strong-wind column across the three rain categories is 0.05, 0.15, 0.10. What is P(strong wind)?','0.30','0.34','0.10','0.15')
T('heavygivenstrong','P(heavy rain ∩ strong wind)=0.10 and P(strong wind)=0.30. What is P(heavy rain | strong wind)?','Approximately 0.333','0.03','0.30','3.0')
T('somegivenlight','P(some wind ∩ light rain)=0.10 and P(light rain)=0.34. What is P(some wind | light rain)?','Approximately 0.294','0.034','0.34','3.4')

T('planningreps','Which structures does classical planning exploit internally?','States, actions, and goals','Only opaque state identifiers without action structure','Only terminal utility numbers','Only the order in which keyboard keys were pressed')
T('progression','Which planner applies currently applicable actions forward from the initial state?','Progression planning','Regression planning from goals only','Clustering','Backward chaining over a percept history only')
T('situation','Which is correct of situation calculus?','Actions and situations are objects; fluents can depend on a situation','Actions cannot be represented as objects','A fluent must have the same value in every situation','Every situation contains only one Boolean variable')
T('strips','Which description fits the intended basic STRIPS formalism?','Actions have preconditions and add/delete effects over a logical state description','Actions need no preconditions and can never change a fact','Every action outcome is necessarily a probability distribution in basic STRIPS','Goals are evaluated only by an SVM')
T('partialorder','What kind of plan leaves unrelated actions unordered?','A partial-order plan','A totally ordered plan','A fixed-length vector of class labels','A cooling schedule')
T('interleaving','What kind of planner can address the Sussman anomaly by interleaving subplans?','An interleaving planner','A planner that solves each subgoal independently and never revises it','A planner forbidden to undo any block placement','A classifier with no action representation')
T('nonlinear','What is another name for plan-space planning?','Nonlinear planning','Linear regression','Uniform-cost search only','Agglomerative clustering')
T('mutexedge','Which planning-graph edge records mutually exclusive propositions?','A mutex edge','A causal probability arc','An AND-only edge','A support-vector margin')
T('graphplan','What does GraphPlan’s planning-graph construction provide?','Reachability analysis that also delimits the later search space','A guarantee that every non-mutex goal set already has a complete plan','An explicit enumeration of every possible world history','Only a random action ordering')
T('abstrips','What kind of planner is ABSTRIPS?','Hierarchical','Purely reactive with no abstraction','Only a minimax game player','A linear classifier')
T('mutexreason','Why can two actions be mutex in a planning graph?','Their effects or preconditions conflict, or their preconditions have competing needs','They have different printed names','They share any predecessor even when there is no conflict','They occur in different source files')
T('layers','Which two kinds of layer alternate in a planning graph?','Proposition layers and action layers','Class labels and support vectors','MIN and MAX layers only','Rows and columns of a covariance matrix')
T('totalorder','In the basic state-space planning formulation used by the course, progression and regression construct what kind of plan?','A totally ordered action sequence','Only a set of unordered action names','Only a hierarchy with no primitive actions','Only an empirical probability distribution')
T('goalstack','Which planning strategy uses a stack of goals, subgoals, and proposed actions?','Goal-stack planning','Value iteration','Agglomerative clustering','Alpha-beta pruning')
T('actionmutex','Which collection contains the standard reasons for action mutex?','Inconsistent effects, interference, and competing needs','Different names, different source years, and different font sizes','Identical preconditions alone','Any two actions that can be performed together')
T('frame','What is the problem of specifying what an action leaves unchanged called?','The frame problem','The halting problem','The nearest-neighbour problem','The maximum-margin problem')
T('mutexmeaning','What does a mutex relation mean in a planning graph?','The paired actions or propositions cannot jointly hold at that graph level under the relevant exclusion criterion','Every mutex pair is logically identical','Every mutex action must be permanently deleted from the domain','The paired nodes must occur together')

T('primitivefalse','Which claim about primitive planning operators is false?','Primitive operators cannot appear in the final executable plan','Primitive operators can be directly executable','Abstract tasks may be refined to primitive operators','A final executable plan can contain primitive actions')
T('sensormodel','How can a belief network represent a sensor model?','A conditional probability table for the percept given the relevant state variables','A list of actions with no percept probabilities','A constant asserting every sensor is perfect','The agent’s policy alone')
T('downward','What is the downward-solution property of an abstraction?','Every abstract solution has a corresponding primitive-level refinement','Every abstract task has no primitive implementation','Only one primitive action can refine any abstraction','An abstract plan must be longer than every primitive plan')
T('stripslimits','Which group contains limitations of the basic STRIPS formalism discussed in the course?','Its basic representation omits richer constructs such as explicit time, uncertainty, and some quantified/disjunctive conditions','It cannot express any action precondition','It cannot express a deterministic state transition','It cannot express any goal at all')
T('htn','What does HTN planning decompose?','Abstract tasks or operators into subtasks','Only the numeric weights of a neural network','Only a Bayesian network’s probability table','Only an SVM’s training vectors')
T('transition','What does an MDP transition model specify?','$P(s_{t+1}\\mid s_t,a_t)$','$P(a_t\\mid s_t)$ alone','$R(s_t)$ alone','Only the number of possible goals')
T('valueiteration','Which description fits value iteration?','Repeatedly compute optimal state utilities with Bellman backups, then select utility-maximising actions','Fix a policy, evaluate it once, and never improve it','Choose every action uniformly forever without updating values','Only estimate the percept model')
T('policy','What is a deterministic policy in a fully observable MDP?','A mapping from states to actions','A mapping from actions to source files','A single reward number for the entire environment','A list of all impossible state transitions')
T('discounted','What return defines the usual discounted value of a policy?','Expected cumulative discounted rewards','Only the largest immediate reward','The sum of transition probabilities without rewards','The most recent percept alone')
T('ddn','Which representation can compactly describe large partially observable sequential decision problems?','Dynamic decision networks','Only an unordered list of final answers','A single propositional constant','Only a FIFO queue')
ARQ('incompleteAR','An agent can have incomplete information about its environment.','Its model can differ from the true environment; that is the definition of incomplete rather than incorrect information.',2)
T('policyiteration','Which operations describe policy iteration?','Evaluate the current policy, then improve it by choosing better actions','Only update utilities optimally without maintaining a policy','Choose one random policy and stop immediately','Replace the transition model by class labels')
ARQ('schedulingAR','Operations-research scheduling can be applied after a partial-order planner has selected actions and precedence constraints.','Scheduling can assign times and resources while respecting those constraints.',0)
ARQ('sensorAR','A sensor model can specify the probability of a percept given a world state.','A deterministic perfect sensor is a special case with a uniquely determined correct percept.',1)
T('decisiontheory','Which theory combines probabilities and utilities to select actions by maximum expected utility?','Decision theory','Syntax theory alone','Graph colouring alone','Information retrieval alone')

T('samuel','Who is associated with the early checkers-learning program?','Arthur Samuel','Vladimir Vapnik','Thomas Hobbes','Claude Shannon alone')
T('regression','What task predicts a numerical dependent variable from explanatory variables?','Regression','Classification into a fixed set of categories','Agglomerative clustering only','Logical unification')
T('cognitive','Which AI approach seeks to understand how intelligent behaviour arises?','The cognitive approach','Only the hardware clock-speed approach','Only the goal-stack approach','Only the syntactic-token approach')
T('mlstats','Which qualified comparison of ML and statistics is appropriate?','ML often emphasises prediction and computation; statistics often emphasises inference, with considerable overlap','ML can never use statistics','Statistics can never predict unseen data','The fields have entirely disjoint methods')
T('classification','Which task predicts a categorical output?','Classification','Numerical regression only','Skolemisation','Value iteration')
T('entropy','What is expected or average information content called?','Entropy','A margin','A policy','A clause')
T('hypothesis','What is the inductively learned approximation h called?','A hypothesis','A percept','An axiom that cannot be changed','A cooling schedule')
T('informationtheory','Which theory supplies entropy and information gain for attribute selection?','Information theory','Utility theory only','Situation calculus only','Game scheduling only')
T('problemgenerator','Which learning-agent component suggests exploratory actions to obtain useful experience?','The problem generator','The performance element alone acting without learning','The domain of discourse','The answer-key file')
T('performance','Which learning-agent component chooses external actions from percepts?','The performance element','The critic','A mutex edge','The Skolem function')
T('treeissues','Which are practical decision-tree learning issues?','Missing attribute values, continuous-valued attributes, and multivalued attributes','Only the font of the dataset','Only whether all labels are printed in capitals','Only whether each feature has exactly two examples')
ARQ('informationAR','Information theory can guide decision-tree attribute selection.','Entropy and information gain quantify class uncertainty and its reduction.',0)
ARQ('overfitAR','Irrelevant attributes can contribute to decision-tree overfitting.','Splits can fit accidental patterns in the finite training data.',0)
T('acquisition','In the broad learning context of the source, what does knowledge acquisition involve?','Obtaining or improving knowledge through experience, examples, or supplied information','Only replacing the CPU','Only deleting all learned hypotheses','Only changing a display font')
T('semisupervised','Which learning uses unlabelled examples alongside labelled examples?','Semisupervised learning','Pure supervised learning with no unlabelled data','Pure reinforcement learning by definition','Resolution theorem proving')
T('critic','Which learning-agent component evaluates performance and provides feedback to the learner?','The critic','The performance element','The successor function','The goal-stack planner')
T('entropy2025','What is the class entropy of this ten-example training set?','Approximately 0.971 bits','0 bits','Exactly 0.5 bits','Exactly 1.5 bits','data2025')
T('outlookgain','Which attribute has the highest information gain at the root for this training set?','Outlook','Temperature','Humidity','Wind','data2025')
T('overcast','Which Outlook branch is pure in this ten-example training set?','Overcast only','Sunny only','Rain only','Every Outlook branch','data2025')
T('pruning','What commonly helps reduce decision-tree overfitting?','Pruning','Adding splits until every irrelevant detail is memorised','Evaluating only on the training set','Discarding all test examples before reporting accuracy')

T('vapnik','Which listed researcher is associated with the development of SVMs?','Vladimir N. Vapnik','Thomas Hobbes','Arthur Samuel','Aristotle')
T('supportvectors','What are the closest training points determining a hard-margin SVM boundary called?','Support vectors','Outliers by definition','Leaf nodes','Skolem witnesses')
T('kernel','What evaluates an inner product in a feature space without explicitly constructing all transformed coordinates?','A kernel function','A FIFO queue','A goal test','A cooling schedule')
T('maxmargin','Which description fits a maximum-margin classifier?','A separating hyperplane with the largest margin to the relevant training points','A hyperplane chosen solely to minimise its printed equation length','A boundary that always passes through every training point','A classifier that ignores training labels')
T('hierarchical','Which clustering type permits nested subclusters?','Hierarchical clustering','A flat partition only','Binary classification only','Linear regression')
T('dendrogram','What is a tree showing nested hierarchical clusters called?','A dendrogram','A decision policy','A resolution trace','A confusion probability')
T('outliers','What are observations unusually distant from the main data pattern called?','Outliers','Axioms','Support functions','Percepts by definition')
T('agglomerative','Which hierarchical method starts with singleton clusters and merges them?','Agglomerative clustering','Divisive clustering from one initial cluster','Logistic regression','Universal instantiation')
T('compactness','What does intra-cluster cohesion measure?','Compactness','Isolation between clusters','The number of true positives only','The root utility of a game tree')
T('svmdotproducts','Which dot products are used in the SVM kernel formulation?','Training–training products for fitting and test–training products for prediction','Only test–test products, with no training examples','Only dot products of output class labels','No inner products are involved')
T('leastsquares','Which statement correctly combines least squares and the regression slope interpretation?','Minimise squared vertical residuals; the slope is fitted change in y per unit x','Minimise unsquared signed residual sum; slope is the prediction at x=0','Minimise the largest x-coordinate; slope is always a probability','Minimise label entropy; slope is the number of clusters')
T('clustereval','Which description of cluster evaluation is correct?','Compactness/separation are internal; comparison with known reference groups is external and can use labels','External evaluation is forbidden from using reference labels','Every clustering algorithm is necessarily a supervised classifier','Compactness is the distance between distinct clusters only')
T('scaling','Which distinction between min–max scaling and standardisation is correct?','Min–max scaling can map to [0,1]; standardisation uses (x−mean)/standard deviation','Both always make the data exactly Gaussian','Standardisation always fixes the range to [0,1]','Min–max scaling is not a preprocessing method')
T('collinearity','Does collinearity guarantee that ordinary least squares will overfit?','No; it can destabilise coefficients, but overfitting is not guaranteed','Yes; any nonzero predictor correlation makes prediction impossible','Yes; correlated predictors always give zero residuals','No; collinearity can never affect coefficient uniqueness')
ARQ('clusterAR','Clustering seeks high within-group similarity and low between-group similarity.','Clustering typically operates without supplied class labels.',1)
T('kernelbenefit','Why is the kernel trick useful?','It computes feature-space inner products implicitly and can enable nonlinear boundaries in the original input space','It guarantees separability for every arbitrary feature map','It removes the need for any training examples','It makes all classifiers linear in the original coordinates')
T('isolation','What does inter-cluster separation measure?','Isolation of distinct clusters','Cohesion within one cluster','The number of unification substitutions','The policy’s immediate reward')
T('clustering','Which description of clustering is correct?','Group similar examples together while separating dissimilar groups, typically without given class labels','Predict only a numerical dependent variable','Require one supplied class label for every example by definition','Maximise the distance between points inside every cluster')

T('mcpitts','Which early neuron model uses a binary threshold output?','The McCulloch–Pitts model','A generative adversarial network','A dynamic decision network','A graph-planning mutex node')
T('perceptron','Which single-neuron model can represent linearly separable decision functions?','The perceptron','A full recurrent network in every configuration','An arbitrary deep convolutional network only','A Bayesian network’s entire joint distribution')
T('rbm','What building blocks were stacked in the classic deep-belief-network training approach?','Restricted Boltzmann machines','Goal stacks','SVM support vectors','Resolution clauses')
T('rlcomponents','Which is the technically correct description of the policy and environment model in reinforcement learning?','A policy chooses actions; an environment model predicts next states and rewards','A policy predicts only the next state; a model specifies the agent’s next action','A reward function is a list of network layers','A model must be present in every model-free learner')
T('rewardfunction','What specifies the task’s reinforcement feedback or objective through rewards?','A reward or reinforcement function','Only the list of state names','Only a kernel feature map','Only the critic’s filename')
T('qlearning','Which method learns values for state–action pairs?','Q-learning','Pure state-value evaluation only','Agglomerative clustering','Skolemisation')
T('feedforward','Which network has forward connections through successive layers and no recurrent state loops?','A layered feed-forward network','A recurrent neural network by definition','A Bayesian collider','A goal-stack planner')
T('features','Which comparison is intended between conventional ML and deep feature learning?','Conventional pipelines often engineer features; deep learning can learn hierarchical features from data','Deep learning is prohibited from learning features','Every conventional ML method must use raw pixels with no representation choices','Deep features are necessarily fixed by hand before any training')
T('rnn','Which network passes a hidden state through successive sequence steps?','A recurrent neural network','A purely feed-forward network with no recurrent state','An SVM hyperplane','A resolution graph')
T('cnn','In a typical CNN, how do convolution and pooling contribute?','Convolution learns shared local filters; pooling can downsample feature maps','Pooling learns all convolution kernels by itself','Convolution requires a different unrelated filter at every spatial position','Every CNN must use pooling at every layer without exception')
T('gan','Which architecture trains a generator and a discriminator in competition?','A generative adversarial network','A single fixed threshold gate','A goal-stack planner','A Bayesian network with no learned parameters')
T('mitchell','Which triple appears in Mitchell’s learning definition?','Experience E, tasks T, and performance measure P','Entropy E, temperature T, and prior P only','Edges E, trees T, and processors P','Experience only, with no task or performance criterion')
T('rewardhypothesis','What does the reward hypothesis say in reinforcement learning?','Goals can be described as maximising expected cumulative reward','Every goal is achieved by maximising only the next immediate reward','No task may have negative rewards','A policy must ignore all rewards')
T('earlyperceptron','Why did early perceptron work focus heavily on single-layer models in the source’s historical account?','Training and credit assignment for hidden layers were not yet handled by a generally effective method','Single-layer perceptrons can represent every possible nonlinear function','Rosenblatt proved hidden layers unnecessary for all tasks','Backpropagation had already made all training problems trivial')
ARQ('modelAR','A policy specifies how an agent chooses actions.','An environment model predicts the agent’s next behaviour rather than the environment’s next state and reward.',2)
T('rlstatements','Which collection of reinforcement-learning component statements is defensible?','Policies choose actions, rewards define feedback, and value functions estimate return; not every method requires a model','Every learner requires a complete environment model','A model specifies the agent’s next choice rather than environmental consequences','Rewards and value functions are identical quantities at all horizons')
ARQ('depthAR','Multiple hidden layers can learn hierarchical representations.','Backpropagation can compute gradients to train multilayer models.',1)
T('deepfeatures','Which collection correctly describes typical deep feature learning?','Multiple representation levels can be learned from data and optimised for the task','Every feature must be manually fixed and cannot change','Hidden layers cannot learn representations','More layers guarantee perfect generalisation on every dataset')
T('backprop','Which description correctly combines the standard backpropagation properties?','Use the chain rule to propagate error derivatives and compute parameter gradients','It requires an environment transition model','It guarantees the global minimum of every nonconvex objective','It changes weights without any loss or gradient information')
T('deepcost','Why do many deep supervised models need substantial data and computation?','They learn many parameters and hierarchical representations, which can require extensive optimisation and examples','Depth eliminates every parameter','All deep models have a universally fixed tiny sample requirement','Training is always a single exact arithmetic operation')

MAPPINGS={
'01-2019':'mccarthy turing production uninformedcost arrangements commutative heuristicsearch weakai bfs bidirectional',
'01-2022':'aristotle turing uninformedcost limitedgame bfs bidirectional commutative production weakai aostarops',
'01-2023':'hobbes cryptanalysis learningelementnot representation uninformedAR commutativekey bfslevel bfspath bfs ucs23',
'01-2024':'aristotle gps rational control informedAR weakai heuristicsearch limitedgame aostarops bestfirstwording',
'01-2025':'hobbes cryptanalysis rational weakai uninformedAR dfs bfs commutative bidirectional searchcriteria',
'02-2019':'relaxed inadmissiblefalse consistency cooling hill astaroptimal bestfirstwording hdefinition arcincorrect backjump',
'02-2022':'astarfamily astaroptimal inadmissiblerisk csp arcproperties hdefinition hamming manhattan puzzlemoves puzzleexpansions',
'02-2023':'heuristicgain relaxed admissiblestatements astaroptimal csp astarfamily afterA bestI worstI routeJ',
'02-2024':'greedy astaroptimal csp backjump consistency hamming manhattan puzzlemoves puzzleexpansions manhattanbetter',
'02-2025':'astaroptimal dfs npcomplete csp backjumpwhy astarfamily afterA bestI worstI routeJ',
'03-2019':'zerosum maxbackup solutiongraph aostarops leaves alphacut betacut samevalue limitedgame twicedepth',
'03-2024':'limitedgame aostarops leaves minimaxcombined alphabetaall root3 Bbeta Dalpha Ebeta2 Dupper0',
'03-2025':'aostarops limitedgame andorrequirements saddle naiveminimax root3 Bbeta Dalpha Ebeta2 Dupper0',
'04-2019':'pragmatics semidecidable firstorder unsat closedground domain plweak surrogate symbols predicate',
'04-2024':'symbolsCannot dataknowledge semantics closedworld quantifiers plweak surrogate quantifierorder profdean criticize',
'04-2025':'dataknowledge symbols semidecidable semidecidable demorgan negforall plAR surrogate profdean criticize',
'05-2019':'interpretation quantifiers axioms skolemconstant clause mgu loyal model unsat loves',
'05-2024':'interpretation tautcontradiction semidecidable skolem icecream brother prenexAR older cannotunify proofaxiom',
'05-2025':'conceptualisation tautcontradiction axioms skolem axiomexamples interpretation prenexAR icecream supportskolem brother',
'06-2019':'firstorder abstraction clause paramodulation resolutiontrace answerextraction complete subsumption ancestry existentialbinding',
'06-2024':'subsumption paramodulation domain jackdog doglover nokill registerednot registeredwon wonnot existgeneralisation',
'06-2025':'semidecidable subsumption integer11 forallrelated answerextraction domain jackdog doglover nokill curiosity',
'07-2019':'utilitykey uncertainty chainindependence dseparation jointbn bayesquery collider Edependent DgivenC DEdependent',
'07-2024':'uncertaincauses bnproperties markovbn utilitykey freespam spamfree spamtext reviewEU sleepEU bestEU',
'07-2025':'markovbn utilitykey bnproperties mdpstatements policyvalue discount rainmarginal windmarginal heavygivenstrong somegivenlight',
'08-2019':'planningreps progression situation strips partialorder interleaving nonlinear mutexedge graphplan abstrips',
'08-2024':'planningreps situation strips abstrips graphplan mutexreason layers totalorder goalstack actionmutex',
'08-2025':'planningreps situation frame abstrips strips goalstack totalorder mutexmeaning actionmutex graphplan',
'09-2019':'primitivefalse sensormodel downward stripslimits htn transition valueiteration policy discounted ddn',
'09-2024':'incompleteAR utilitykey ddn stripslimits transition transition valueiteration schedulingAR policyiteration sensorAR',
'09-2025':'transition decisiontheory utilitykey stripslimits ddn valueiteration policyiteration incompleteAR schedulingAR sensorAR',
'10-2019':'samuel regression cognitive mlstats classification entropy hypothesis informationtheory problemgenerator performance',
'10-2024':'cognitive regression hypothesis mlstats treeissues informationAR overfitAR acquisition utilitykey semisupervised',
'10-2025':'cognitive critic mlstats performance hypothesis informationtheory entropy2025 outlookgain overcast pruning',
'11-2019':'vapnik supportvectors kernel maxmargin hierarchical dendrogram outliers agglomerative compactness svmdotproducts',
'11-2024':'vapnik compactness maxmargin svmdotproducts leastsquares clustereval scaling collinearity clusterAR kernelbenefit',
'11-2025':'clustering dendrogram compactness isolation supportvectors maxmargin svmdotproducts collinearity clusterAR kernelbenefit',
'12-2019':'mcpitts perceptron rbm rlcomponents rewardfunction qlearning feedforward features rnn cnn',
'12-2023':'perceptron gan features valueiteration policyiteration mitchell rewardhypothesis earlyperceptron modelAR cnn',
'12-2024':'rewardhypothesis perceptron features gan rlstatements qlearning depthAR modelAR cnn deepfeatures',
'12-2025':'rlcomponents qlearning valueiteration policyiteration backprop cnn gan deepfeatures deepcost earlyperceptron',
}
# Correct the 2022 Q6 mapping explicitly: it is the conflict-directed CSP item.
MAPPINGS['02-2022']=MAPPINGS['02-2022'].replace(' csp arcproperties hdefinition ', ' csp arcproperties backjump ')

def clean(text):
    return re.sub(r'[ \t]+',' ',text.replace('\\\'','\'').replace('\uf0d8','¬')).strip()

def read_notes():
    notes={};topics={}
    for week in range(1,13):
        text=(ROOT/f'Week {week:02d}.md').read_text(encoding='utf-8')
        topics[week]=text.splitlines()[0].split(' — ',1)[1]
        for m in re.finditer(r'^#### (\d{4}) Q(\d+)\n\n\*\*Question recap:\*\* (.*?)\n\n\*\*Answer:\*\* (.*?)\n\n\*\*Why:\*\* (.*?)(?=\n\n(?:####|###|\[Back)|\Z)',text,re.M|re.S):
            notes[(week,int(m[1]),int(m[2]))]=dict(question=m[3].strip(),answer=m[4].strip(),why=m[5].strip())
    return notes,topics

def original_2026(week):
    doc=fitz.open(ROOT/f'resources/sources/2026/2026_Week_{week:02d}_Solution.pdf')
    pages=[page.get_text() for page in doc]
    offsets=[];offset=0
    for page in pages:offsets.append(offset);offset+=len(page)+1
    text='\n'.join(pages)
    starts=list(re.finditer(r'^[ \t]*Q(\d{1,2})(?:\.[ \t]*|[ \t]+(?=[A-Za-z(]))',text,re.M))
    assert len(starts)==10,(week,len(starts))
    result=[]
    for i,m in enumerate(starts):
        block=text[m.end():starts[i+1].start() if i+1<len(starts) else len(text)]
        before,key=re.split(r'^[ \t]*Correct (?:Answer|option):',block,maxsplit=1,flags=re.I|re.M)
        labels=list(re.finditer(r'^\s*([A-E])\s*\.\s*',before,re.M))
        assert len(labels)==4,(week,i+1,len(labels),before)
        prompt=clean(re.sub(r'\s*\n\s*','\n',before[:labels[0].start()]))
        options=[]
        for j,label in enumerate(labels):
            content=before[label.end():labels[j+1].start() if j+1<4 else len(before)]
            options.append(clean(re.sub(r'\s+',' ',content)))
        correct=re.search(r'[ABCD]',key).group(0).lower()
        first=bisect_right(offsets,m.start());last=bisect_right(offsets,m.end()+len(before))
        result.append(dict(prompt=prompt,options=[dict(id=chr(97+j),text=t) for j,t in enumerate(options)],correct=[correct],sourcePages=list(range(first,last+1))))
    return result

notes,topics=read_notes()
coverage=json.loads((ROOT/'resources/metadata/coverage.json').read_text(encoding='utf-8'))
assert len(notes)==coverage['question_discussions'],len(notes)
questions=[]
special_contexts={(2,n):'puzzle' for n in range(7,11)}
special_contexts[(3,2)]='or'
special_contexts.update({(3,n):'tree2026' for n in range(6,11)})
special_contexts.update({(5,n):'blocks' for n in range(6,11)})
special_contexts.update({(6,n):'horses' for n in range(7,10)})
special_contexts[(7,10)]='utility2026'
special_contexts.update({(9,n):'mdp2026' for n in range(8,11)})
special_contexts.update({(10,n):'data2026' for n in range(6,11)})
original={w:original_2026(w) for w in range(1,13)}
for group in coverage['sets']:
    week,year=group['week'],group['year']
    mapping=MAPPINGS.get(f'{week:02d}-{year}','').split()
    if year!=2026:assert len(mapping)==10,(week,year,mapping)
    for n in range(1,11):
        source=notes[(week,year,n)]
        q=dict(id=f'w{week:02d}-{year}-q{n:02d}',week=week,year=year,number=n,type='single',mode='original' if year==2026 else 'recap',explanation=source['why'],sourceQuestion=source['question'],sourceAnswer=source['answer'],source=group['source'])
        image_records=[r for r in group['images'] if n in r['questions'] or not r['questions']]
        # Include the preceding page when a question is the first completed item
        # on a page: its stem or initial options can be on the previous page.
        for index,record in enumerate(group['images']):
            if index and record['questions'] and n==record['questions'][0]:image_records.append(group['images'][index-1])
        image_records=[r for r in group['images'] if r in image_records]
        q['images']=['source/'+r['path'].split('resources/screenshots/',1)[1] for r in image_records]
        if year==2026:
            q.update(original[week][n-1])
            image_records=[r for r in group['images'] if r['source_page'] in q['sourcePages'] or not r['questions']]
            q['images']=['source/'+r['path'].split('resources/screenshots/',1)[1] for r in image_records]
            if (week,n) in special_contexts:q['context']=special_contexts[(week,n)]
            # Flattened PDF tables are rendered as native tables instead.
            if (week,n)==(7,10):q['prompt']='A decision-maker has two possible actions, with the outcomes shown below. Which action should a rational agent choose?'
            # The printed source labels its fourth BFS option E; the live assessment uses the fourth position.
            if (week,n)==(1,9):q['note']='The source PDF labels its fourth option E. It is shown in the fourth position here.'
            letter=re.match(r'^([ABCD])\b',source['answer'])
            assert letter and letter[1].lower() in q['correct'],(q['id'],source['answer'],q['correct'])
        else:
            template=TEMPLATES[mapping[n-1]]
            q['prompt']=template['prompt']
            if template['context']:q['context']=template['context']
            choices=list(enumerate(template['choices']))
            random.Random(int(hashlib.sha256(q['id'].encode()).hexdigest()[:16],16)).shuffle(choices)
            q['options']=[dict(id=chr(97+i),text=text) for i,(_,text) in enumerate(choices)]
            q['correct']=[chr(97+i) for i,(old,_) in enumerate(choices) if old==0]
            if mapping[n-1] in ['puzzleexpansions','criticize','loves','collinearity','integer11','forallrelated','rlcomponents','symbolsCannot']:
                q['note']='Recap adapted to make the source’s assumptions or correction explicit.'
        assert len(q['options'])==4 and len({o['text'] for o in q['options']})==4,q
        questions.append(q)

previous={q['id']:q for q in json.loads((GAME/'data/source/previous-recaps.json').read_text(encoding='utf-8'))}
for q in questions:
    q['studyPage']=f'Week {q["week"]:02d}.md#{q["year"]}-q{q["number"]}'
    if q['id'] in TRANSCRIPTIONS:
        q['previous']=previous[q['id']]
        q['previous']['images']=q['images']
        q.pop('note',None)
        q.pop('context',None)
        q.update(TRANSCRIPTIONS[q['id']])
        q['transcribedFromScreenshot']=True

extras=json.loads((GAME/'data/source/additional-questions.json').read_text(encoding='utf-8'))
for q in extras:
    assert (ROOT/q['studyPage']).is_file(),q['studyPage']
    for source,target in zip(q.get('sourceFiles',[]),q['images']):
        origin=(ROOT/source).resolve();origin.relative_to((ROOT/'Found').resolve())
        destination=(GAME/target).resolve();destination.relative_to((GAME/'figures/found').resolve())
        destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(origin,destination)
found={(p.relative_to(ROOT).as_posix(),int(n)) for p in (ROOT/'Found').rglob('*.md') for n in re.findall(r'^## Q(\d+)\b',p.read_text(encoding='utf-8'),re.M)}
assert found=={(q['studyPage'],q['number']) for q in extras},'Register every reviewed Found question in data/source/additional-questions.json.'
questions+=extras
CONTEXTS['facts2022']=dict(title='Supplied knowledge-base facts',text='Rohan is male. A husband is a male spouse. Rohan is Reena’s spouse. Rohan owns a house. Every house owner is a home-builder.\n\n$Male(Rohan)$; $Spouse(Rohan,Reena)$; $\\exists h\\,[House(h)\\land Owns(Rohan,h)]$; $\\forall x\\,[(\\exists h\\,[House(h)\\land Owns(x,h)])\\rightarrow HomeBuilder(x)]$.\n\n$Spouse(x,y)$ means that x is the spouse of y. No rule transfers house ownership between spouses.')
CONTEXTS['tree2023found']=dict(title='2023 game tree',caption='Use the indicated MAX/MIN levels and left-to-right traversal.',image='figures/found/week-3-2023/Game tree.png',imageAlt='Game tree with MAX root V, MIN children P and U, and labelled terminal utilities.',collapsibleText=True,text='V is MAX with children P and U, both MIN. P has Q (MAX), R (MAX), and terminal 16. Q has terminals 4 and 13. R has S (MIN) and terminal 11. S has terminals 5 and 10. U has T (MAX) and terminal 12. T has terminals 9 and 6. Children are listed left to right.')

def revision(q):
    content={key:q.get(key) for key in ['prompt','options','correct','type']}
    return hashlib.sha256(json.dumps(content,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16]

for q in questions:
    q['revision']=revision(q)
    if 'previous' in q:q['previous']['revision']=revision(q['previous'])

short=['AI basics','Search I','Search II','Representation I','Representation II','Representation III','Uncertainty','Planning','Decision making','Learning I','Learning II','Neural networks & RL']
original_count=sum(q['mode']=='original' for q in questions)
bank=dict(schemaVersion=2,assignmentSets=coverage['assignment_sets'],additionalQuestions=len(extras),sourceMCQs=original_count,recapQuestions=len(questions)-original_count,sourceImageBase='https://raw.githubusercontent.com/kapiltrip/NPTEL-Fundamentals-of-AI/main/resources/screenshots/',weeks=[dict(number=w,title=topics[w],shortTitle=short[w-1]) for w in range(1,13)],contexts=CONTEXTS,questions=questions)
bank['extraWeeks']=[dict(number=0,title='Prerequisites: probability, matrices and vectors',shortTitle='Prerequisites')]
assert len(questions)==coverage['question_discussions']+len(extras) and len({q['id'] for q in questions})==len(questions)
assert all(count==10 for count in Counter((q['week'],q['year']) for q in questions if not q.get('additional')).values())
(GAME/'data').mkdir(exist_ok=True)
(GAME/'data/questions.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2),encoding='utf-8')
groups={}
for q in questions:groups.setdefault((q['week'],q['year']),[]).append(q)
def input_digest(path):
    content=path.read_bytes()
    if path.suffix.lower() in {'.md','.json','.py'}:content=content.replace(b'\r\n',b'\n')
    return hashlib.sha256(content).hexdigest()

audit=dict(total_questions=len(questions),full_assignment_sets=coverage['assignment_sets'],additional_questions=len(extras),source_mcqs=original_count,recap_questions=len(questions)-original_count,
    hash_format='SHA-256; text input CRLF line endings normalized to LF',
    sets=[dict(week=w,year=y,questions=[q['number'] for q in qs],complete={q['number'] for q in qs}==set(range(1,11)),collection='Found' if any(q.get('additional') for q in qs) else 'main',source_mcqs=sum(q['mode']=='original' for q in qs)) for (w,y),qs in sorted(groups.items())],
    inputs={p.relative_to(ROOT).as_posix():input_digest(p) for p in [*(ROOT.glob('Week *.md')),ROOT/'resources/metadata/coverage.json',GAME/'data/source/additional-questions.json',GAME/'data/source/previous-recaps.json',Path(__file__),Path(__file__).with_name('source_transcriptions.py'),*(ROOT/q['studyPage'] for q in extras),*(ROOT/p for q in extras for p in q.get('sourceFiles',[])),*(ROOT/'resources/sources/2026').glob('*.pdf'),*(ROOT/'resources/screenshots').rglob('*.*')]})
(GAME/'data/coverage.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(questions=len(questions),full_sets=coverage['assignment_sets'],additional_questions=len(extras),source_mcqs=original_count,recap_questions=len(questions)-original_count,templates=len(TEMPLATES),contexts=len(CONTEXTS))))
