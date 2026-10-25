import copy
import json
from pathlib import Path
import tempfile
import unittest
from paper_qa_cache import group_keys, compare_captures, wait_for_deployment


class ReuseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'data').mkdir()
        (self.root / 'data/reader.json').write_text('[]')
        (self.root / 'index.html').write_text('fixed UI')
        (self.root / 'assets/papers/p').mkdir(parents=True)
        (self.root / 'assets/papers/p/summary.png').write_bytes(b'original')
        self.spec = {'metadata': {'id': 'p', 'slug': 'p', 'row_patch': {}, 'regions': [],
                     'resources': [], 'figures': [{'asset_name': 'summary.png'}]},
                     'content': {'summary': 'same', 'fields': {'input': 'original'}, 'steps': []},
                     'qa': {'queries': ['p'], 'required_text': [], 'resource_labels': []}}

    def test_text_change_invalidates_only_two_detail_groups(self):
        before = group_keys(self.spec, self.root, 'v1')
        self.spec['content']['fields']['input'] = 'new input'
        after = group_keys(self.spec, self.root, 'v1')
        self.assertEqual({'1180:detail', '390:detail'}, {k for k in before if before[k] != after[k]})

    def test_image_change_invalidates_detail_and_figure_only(self):
        before = group_keys(self.spec, self.root, 'v1')
        (self.root / 'assets/papers/p/summary.png').write_bytes(b'changed')
        after = group_keys(self.spec, self.root, 'v1')
        self.assertEqual({'1180:detail', '390:detail', '1180:figure', '390:figure'},
                         {k for k in before if before[k] != after[k]})

    def test_public_mismatch_or_missing_capture_cannot_skip_review(self):
        local = self.root / 'local'; public = self.root / 'public'
        local.mkdir(); public.mkdir()
        (local / 'image.png').write_bytes(b'same')
        (public / 'image.png').write_bytes(b'wrong')
        self.assertFalse(compare_captures(local, public, ['image.png'], reviewed=True)['second_identical_visual_review_skipped'])
        (public / 'image.png').write_bytes(b'same')
        self.assertTrue(compare_captures(local, public, ['image.png'], reviewed=True)['second_identical_visual_review_skipped'])
        self.assertFalse(compare_captures(local, public, ['missing.png'], reviewed=True)['second_identical_visual_review_skipped'])

    def test_deployment_success_returns_without_another_sleep(self):
        sleeps = []
        result = wait_for_deployment('expected', lambda: [{'head_sha': 'expected', 'status': 'completed',
                    'conclusion': 'success', 'updated_at': '2026-01-01T00:00:00Z'}], sleep=sleeps.append)
        self.assertEqual('passed', result['status'])
        self.assertEqual([], sleeps)

    def test_deployment_failure_is_not_success(self):
        result = wait_for_deployment('expected', lambda: [{'head_sha': 'expected', 'status': 'completed',
                    'conclusion': 'failure'}])
        self.assertEqual('failed', result['status'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
