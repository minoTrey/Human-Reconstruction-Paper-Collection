import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


class GuardrailTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'summary.png').write_bytes(b'final image')
        self.spec = {'metadata': {'id': 'paper-1', 'figures': [{'input_file': 'summary.png'}]},
                     'content': {'summary': 'RGB to Gaussian', 'fields': {}, 'steps': []},
                     'claims': {'method': {'value': 'Gaussian', 'sources': [0]}},
                     'qa': {'required_text': ['Gaussian'], 'term_claim_refs': {'Gaussian': 'method'}}}
        self.spec['content']['sources'] = [{'url': 'https://example.org/paper'}]
        path = Path(__file__).with_name('paper_guardrails.py')
        loader = importlib.util.spec_from_file_location('guard', path)
        self.guard = importlib.util.module_from_spec(loader)
        loader.loader.exec_module(self.guard)

    def approve(self):
        self.guard.select_terms(self.spec)
        review = self.guard.approval(self.spec, self.root, science=True, labels=True, output_form=True)
        (self.root / 'image-review.json').write_text(json.dumps(review), encoding='utf8')

    def test_no_automated_qa_before_final_image_review(self):
        self.assertIn('image_review_missing', [e['code'] for e in self.guard.preflight(self.spec, self.root)])

    def test_approved_image_and_source_terms_pass(self):
        self.approve()
        self.assertEqual([], self.guard.preflight(self.spec, self.root))

    def test_changed_image_or_method_invalidates_manual_approval(self):
        self.approve()
        (self.root / 'summary.png').write_bytes(b'edited image')
        self.assertIn('image_review_stale', [e['code'] for e in self.guard.preflight(self.spec, self.root)])
        self.approve()
        self.spec['content']['steps'] = [{'title': 'changed', 'text': 'new method'}]
        self.assertIn('image_review_stale', [e['code'] for e in self.guard.preflight(self.spec, self.root)])

    def test_changed_source_graph_invalidates_manual_approval(self):
        self.spec['diagram'] = {'source_graph_file': 'method-graph.json', 'claim_refs': ['method']}
        graph = self.root / 'method-graph.json'
        graph.write_text('{"inference":["RGB -> features -> Gaussian"]}', encoding='utf8')
        self.approve()
        graph.write_text('{"inference":["RGB -> Gaussian"]}', encoding='utf8')
        self.assertIn('image_review_stale', [e['code'] for e in self.guard.preflight(self.spec, self.root)])

    def test_changed_diagram_contract_invalidates_manual_approval(self):
        self.spec['diagram'] = {'claim_refs': ['method'], 'forbidden': ['input-output bypass']}
        self.approve()
        self.spec['diagram']['forbidden'].append('cached parameters sampled')
        self.assertIn('image_review_stale', [e['code'] for e in self.guard.preflight(self.spec, self.root)])

    def test_missing_graph_cannot_be_approved(self):
        self.spec['diagram'] = {'source_graph_file': 'missing.json'}
        with self.assertRaises(FileNotFoundError):
            self.approve()

    def test_unrelated_work_note_does_not_invalidate_image_review(self):
        self.spec['diagram'] = {'source_graph_file': 'method-graph.json'}
        (self.root / 'method-graph.json').write_text('{"inference":["RGB -> Gaussian"]}', encoding='utf8')
        self.approve()
        (self.root / 'working-note.txt').write_text('unrelated timing note', encoding='utf8')
        self.assertEqual([], self.guard.preflight(self.spec, self.root))

    def test_visibility_and_source_errors_are_aggregated(self):
        self.approve()
        self.spec['qa']['required_text'] += ['internal-only', 'unbound']
        self.spec['content']['fields']['optimization'] = 'internal-only'
        self.spec['qa']['term_claim_refs']['internal-only'] = 'missing-claim'
        errors = self.guard.preflight(self.spec, self.root)
        self.assertGreaterEqual(sum(e['code'] == 'visible_term' for e in errors), 2)
        self.assertIn('term_source', [e['code'] for e in errors])

    def test_incomplete_manual_checks_do_not_approve(self):
        with self.assertRaises(ValueError):
            self.guard.approval(self.spec, self.root, science=True, labels=False, output_form=True)

    def test_authoring_terms_exclude_internal_only_words(self):
        self.spec['content']['fields']['optimization'] = 'StyleGAN2'
        self.spec['claims']['training'] = {'value': 'StyleGAN2', 'sources': [0]}
        self.spec['qa']['term_candidates'] = {'Gaussian': 'method', 'StyleGAN2': 'training'}
        omitted = self.guard.select_terms(self.spec)
        self.assertEqual(['StyleGAN2'], omitted)
        self.assertEqual(['Gaussian'], self.spec['qa']['required_text'])

    def test_authoring_terms_reject_unbacked_candidates(self):
        self.spec['qa']['term_candidates'] = {'Gaussian': 'missing-claim'}
        with self.assertRaisesRegex(ValueError, 'source'):
            self.guard.select_terms(self.spec)

    def test_term_selection_is_required_and_invalidated_by_content(self):
        self.approve()
        self.spec['qa'].pop('term_selection')
        self.assertIn('term_selection_stale', [e['code'] for e in self.guard.preflight(self.spec, self.root)])
        self.guard.select_terms(self.spec)
        self.assertEqual([], self.guard.preflight(self.spec, self.root))
        self.spec['content']['summary'] += ' changed'
        self.assertIn('term_selection_stale', [e['code'] for e in self.guard.preflight(self.spec, self.root)])

    def test_console_output_is_bounded_and_tail_preserved(self):
        value = 'x' * 10000 + 'FAILED'
        result = self.guard.bounded(value, 200)
        self.assertLessEqual(len(result), 200)
        self.assertTrue(result.endswith('FAILED'))

    def test_tuple_version_lookup_rejected_before_build(self):
        broken = "versions={n:n for n in ['browser','guard']}\nselected=versions['browser','guard']"
        with self.assertRaisesRegex(ValueError, 'scalar'):
            self.guard.assert_runner_wiring(broken)

    def test_valid_version_lookup_passes_without_executing_caller(self):
        valid = "versions={n:n for n in ['browser','guard']}\nselected=versions['browser']"
        self.guard.assert_runner_wiring(valid)


if __name__ == '__main__':
    unittest.main(verbosity=2)
