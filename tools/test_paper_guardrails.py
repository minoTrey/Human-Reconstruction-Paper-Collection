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

    def test_console_output_is_bounded_and_tail_preserved(self):
        value = 'x' * 10000 + 'FAILED'
        result = self.guard.bounded(value, 200)
        self.assertLessEqual(len(result), 200)
        self.assertTrue(result.endswith('FAILED'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
