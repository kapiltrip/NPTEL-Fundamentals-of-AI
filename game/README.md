# AI Practice

[Quiz](https://kapil-ai-weekly-practice.dreamysnipe514.chatgpt.site/#/revise/all) · [Bypass answer cards](https://kapil-ai-weekly-practice.dreamysnipe514.chatgpt.site/#/cards/all) · [Local app](http://127.0.0.1:8765/game/)

Run `python game/server.py` from the repository, then open [the local app](http://127.0.0.1:8765/game/). On Windows, `game/start.ps1` starts it quietly in the background.

The app opens straight into **random flash revision**. Answer one question, see red/green feedback and an explanation, then advance automatically. The default shuffle covers all weeks of 2026 first, followed by older questions. **Mix all years** shuffles the entire bank together. Answered questions do not repeat within a shuffle; skipped questions return at the end.

All **549 entries** are included: 53 full assignment sets and 19 reviewed additions from `Found`, including the Week 0 prerequisites. **164 MCQs** retain source wording and choices, including all 120 from 2026; **385** use labelled recap wording and practice choices. Source wording does not make an unofficial answer key official. Corrections and source notes accompany the feedback.

Turn on **Bypass · show answers** for quick revision: each card immediately shows its correct answer and explanation, then advances without a selection. All 549 cards are covered once per full shuffle. Cards keep a separate “shown” count and never add correct answers to your quiz score. Switching modes starts a fresh shuffle and preserves scored results.

Use **Pause & read**, choose a 1/2/3/6/12-second reading time under **Settings**, or move on immediately with **Next**. On a phone, Previous, Pause/Resume, and Next stay at the bottom. In quiz mode the last explanation stays available beside the next question. Opening settings, a source, or a diagram pauses automatic movement. Your place, shuffle, and scores survive a reload. Starting another shuffle keeps earlier results. Select-all questions use **Check answer**. Keys: **1–4** answer, **N** next, **P** previous, **A** pause/resume, **S** save.

The hosted links work away from this computer; sign into the same ChatGPT account if asked. Progress is stored separately in each phone or browser. The local loopback address is for this computer.

**Browse by week** keeps the week/year view with **Unanswered**, **Missed**, **Saved**, and **Continue**. Old recap attempts preserve their original wording and score when source choices become available; **Try original wording** starts the new version. The flash pool also offers missed and saved questions.

The app works without an internet connection once these files are present. The local server listens only on `127.0.0.1`; it serves the app and question screenshots. It does not expose private build files.

[Study weeks](../README.md) · [Source catalog](../resources/sources/Catalog.md)

App files stay here. `data/` contains the bank and coverage audit; `data/source/` holds reviewed additions and migration copies; `figures/` holds diagrams; `vendor/` holds offline maths; `tools/` and `tests/` hold maintenance code. Local logs, test dependencies, and deployment copies stay in ignored `.local/`.

To rebuild, install `tools/requirements-build.txt`, then run `python game/tools/build_bank.py`. Run `node --test game/tests/quiz.test.mjs`; the full DOM test is `node game/tests/ui.test.mjs` with `happy-dom@20.0.2` installed under `game/.local/node_modules`. Neither test opens a browser.
