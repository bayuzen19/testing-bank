---
name: bank-local-engineering
description: Improve local-model coding through scoped repository context, executable acceptance criteria, regression checks and reproducible comparisons with Copilot.
---
# Local engineering

Use the project's existing stack and read the target function, callers, schema and
tests. Write a short task contract: behavior, boundary cases, files in scope and the
command that proves success. Implement one coherent change at a time. A small model
needs accurate context more than a long persona prompt.

For fixes, reproduce the failure first; do not change acceptance tests to make a patch
pass. Review auth/ownership, state transitions, concurrent requests and money rounding.
Run targeted tests, typecheck and lint, then the relevant integration checks. Keep raw
logs, model name/digest, elapsed time, attempts and resulting diff.

In a repository containing scripts/bank, run `python scripts/bank/benchmark.py` for
review smoke tests and `python scripts/bank/coding_benchmark.py` for sandboxed code
generation. These small fixtures are diagnostics, not a claim of Copilot parity.
Use docs/BENCHMARK.md for a fair comparison: same starting revision, task, context,
acceptance tests, tool access, time budget and repetitions. Never send bank source to
Copilot without approval; use synthetic fixtures for the initial comparison.

Inference must remain local. Do not auto-download a new model or fall back to a hosted
agent. Stop on unavailable inference and retain the task state. Report measured
correctness, false positives and latency separately; do not select a model on size alone.

Runtime compatibility comes before ranking. Hermes 0.18.2 rejected Qwen 2.5 14B's
32,768 context window and Gemma's 16k runtime setting. This PoC uses Gemma 4 26B
with a 65,536 runtime window. Verify installed digest, advertised context AND runtime
context. Do not inflate a model's advertised limit or fall back to hosted inference.

The 2026-09-24 browser evaluation exposed a specific failure mode: repeated ambiguous
patches broke JSX and exhausted 25 turns. After two failed edits to the same region,
read the complete component and use a coherent replacement, or split it at existing
component boundaries. Do not retry the same ambiguous patch. Keep the tested public
interface unchanged. For new UI, separately prove API integration, browser journeys,
session restoration, network retry, mobile layout and production CSP; build alone is
not acceptance. Privacy actions must perform the request, never show a success alert
as a placeholder.

Independent tests are immutable acceptance evidence. Preserve initial failed output,
feedback, each repaired candidate and verification logs. Attribute evaluator-written
tests, backend, styles and DevOps separately from agent-generated modules. A repair
given the exact defect is assisted success, not zero-shot autonomous performance.
The current small evaluation does not establish Copilot parity or production readiness.
