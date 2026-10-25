# Paper update entry point

Read [the paper workflow and incident controls](docs/PAPER_WORKFLOW.md) before a paper update.
Keep the existing record ID, fixed statistical corpus and unrelated UI unchanged.
Do not infer missing dates, venue relationships, code availability or scientific outputs.

Before automatic paper QA, open the final image and check its scientific meaning,
labels and output representation. Record that review with the command in the workflow.
`tools/paper_guardrails.py preflight` must pass before local QA and publication.
Changing an image or method invalidates its image approval. A passing script does not
establish scientific correctness: compare the actual image and displayed text with sources.

Use changed-file scope and dependency keys. Do not repeat a successful identical check.
Keep raw source bodies, large JSON and image bytes in files; return bounded summaries.
Never publish private conversations, approvals, account usage, credentials or local paths.

Run `python -m unittest discover -s tools -p "test_*.py"` when modifying these controls.
