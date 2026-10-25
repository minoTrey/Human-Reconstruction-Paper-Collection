# One-paper workflow

1. Read the official method, conditions, date/version evidence and resource licenses once.
   Record purpose, input, method, output and limits in one bundle. Keep uncertainty explicit.
   Before final-image review, run `python tools/paper_guardrails.py terms bundle/spec.json`.
   Candidate terms must occur in both a source-backed claim and an actual rendered field.
   Internal-only candidates are reported, not used as screen expectations. Inspect omitted
   terms for missing essential reader content; never change scientific text merely to pass.
   Content, claims or candidate changes invalidate this selection at QA and commit preflight.
2. Start the independent summary image after method facts are stable. Write the bundle while
   generation runs. Do not replace scientific checks with taste-based iterations.
3. Open the final PNG. Confirm input/representation/output, identity/pose relationships,
   labels, learning/inference separation and the illustrative-example label.
   A source-backed prompt defines intended connections, not verified generated arrows.
   Compare every actual module input/output arrow with that source graph immediately after
   generation; simplify crossings without removing required relationships. Approval follows
   this inspection, never the prompt alone. Arrow semantics remain a human check.
4. Record that actual human review, then run the fast preflight:

   ```sh
   python tools/paper_guardrails.py approve bundle/spec.json --science --labels --output-form
   python tools/paper_guardrails.py preflight bundle/spec.json
   ```

   These switches attest to completed visual inspection; they must not be set blindly.
   The review is bound to image bytes and method content. It contains no private identity.
5. Run static data validation once per final revision. Use dependency keys for changed
   search/detail/figure screens at desktop and 390px. Inspect new scientific images and
   affected screens. The production focused runner and commit-preparation command invoke
   the same canonical guard before building/committing. Their proof includes guard version.
6. Commit only reviewed manifest files. Check uncertain remote outcomes before reposting.
   On Pages completion, immediately verify expected commit and changed public bytes, then
   generate fresh public screenshots. Skip the second human read only when every relevant
   screenshot equals a currently reviewed local screenshot. Failure/missing/timeout is not pass.
7. Return one completion record, including actual elapsed phases and exceptions. Keep private
   execution records outside this public repository. Use the bounded record viewer:

   ```sh
   python tools/paper_guardrails.py summary bundle/completion.json
   python -m unittest discover -s tools -p "test_*.py"
   ```

The public `paper_qa_cache.py` is the canonical existing cache/deployment implementation;
the production adapter imports it. This repository does not distribute authentication
or local account configuration. Publication uses the existing authorized publisher.

## Incident controls

| Reproduction / cause | Correction and prevention | Evidence / status |
|---|---|---|
| Automatic QA before image correction finished; a second image edit invalidated results | Final-image approval bound to PNG and method; missing/stale approval blocks QA and commit | `GuardrailTests.test_no_automated_qa_before_final_image_review`, `test_changed_image_or_method_invalidates_manual_approval`; enforced |
| Required word existed only in an internal field; final-image preflight caught it late because candidates were hand-selected before checking rendered fields | Authoring `terms` command derives screen expectations from rendered fields AND source-backed claims. Internal-only candidates are reported; missing source terms fail. QA/commit reject missing or stale selection after content/source changes. Do not alter scientific meaning to fit an expectation | `test_authoring_terms_exclude_internal_only_words`, `test_authoring_terms_reject_unbacked_candidates`, `test_term_selection_is_required_and_invalidated_by_content`; semantics remain manual |
| Whole-bundle cache key repeated unrelated search/image screens after wording edits | Separate search/detail/figure keys; changed content invalidates only dependent groups | `ReuseTests.test_text_change_invalidates_only_two_detail_groups`, `test_image_change_invalidates_detail_and_figure_only`; enforced |
| Unchanged README line endings blocked a paper commit | Compare only the reviewed manifest, but reject actual unrelated committed edits and mismatched bytes | `ScopedCommitTests` three tests; enforced |
| Large source/JSON/image output was truncated, requiring state recovery | Raw evidence stays in files; bounded summary preserves error tail. Check completion/process state before rerun | `test_console_output_is_bounded_and_tail_preserved`; summary command enforced, arbitrary tool-output discipline manual |
| Label typo, wrong mesh/hair/material or intermediate representation; repeated cosmetic edits | Inspect final image against input/method/output before QA; no aesthetic-only retry after quality pass | `test_incomplete_manual_checks_do_not_approve`; approval presence/hash enforced, image meaning remains human |
| A targeted pass/text edit changed a preserved hand or pose in another panel | Name edit regions and invariants; retain the last good image. After every edit, compare the whole output for changes to preserved people, poses, layers, labels and connections. A local edit instruction is not proof of locality | Existing hash-bound final-image approval remains mandatory; edit locality and scientific meaning require manual verification |
| Long observation gap after Pages completed | Poll existing deployment metadata; return immediately on observed success, then fresh public-file/screen verification | `test_deployment_success_returns_without_another_sleep`, `test_deployment_failure_is_not_success`; enforced |
| Public image/screenshot changed or missing but duplicate visual read was skipped | Require byte equality plus current local review proof; otherwise fresh review required | `test_public_mismatch_or_missing_capture_cannot_skip_review`; enforced |
| Test execution produced bytecode; legacy publisher auto-added it after reviewed commit | Ignore generated bytecode; publisher must reject any unreviewed staged/untracked change and push only an existing reviewed commit | `test_publisher_rejects_untracked_or_staged_files`, `test_public_repository_tracks_no_generated_bytecode`; enforced. Generated files removed from current tree; historical commits retain them |
| Broad string replacement added a guard version to both the dependency list and a scalar browser-version lookup, creating a tuple key | Edit exact syntax locations; validate real runner version-key wiring before build. Negative guard-only tests cannot substitute for the valid caller path | `test_tuple_version_lookup_rejected_before_build`, `test_valid_version_lookup_passes_without_executing_caller`; enforced by production runner before QA |

Controls were introduced test-first: absent guard produced six setup errors; the first
implementation exposed a 201-character result for a 200-character bound. The output-slice
defect was fixed without weakening the bound. Intentional invalid fixtures are rejected
by the passing suite. Scientific image correctness is not claimed to be fully automated.
