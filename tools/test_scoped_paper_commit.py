import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest


class ScopedCommitTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.site=self.root/'site';self.preview=self.root/'preview'
        self.site.mkdir();self.preview.mkdir()
        self.git('init','-q');self.git('config','user.name','Test');self.git('config','user.email','test@local.invalid');self.git('config','core.autocrlf','false')
        (self.site/'README.md').write_bytes(b'unchanged\n');(self.site/'paper.json').write_bytes(b'old')
        self.git('add','.');self.git('commit','-qm','base');self.base=self.git('rev-parse','HEAD')
        (self.site/'paper.json').write_bytes(b'new');(self.preview/'paper.json').write_bytes(b'new');(self.preview/'README.md').write_bytes(b'unchanged\r\n')
        self.git('add','paper.json');self.git('commit','-qm','paper');self.head=self.git('rev-parse','HEAD')

    def git(self,*args):
        return subprocess.check_output(['git','-C',str(self.site),*args],text=True).strip()

    def guard(self):
        path=Path(__file__).with_name('paper_guardrails.py')
        self.assertTrue(path.exists(),'Missing scoped commit guard')
        spec=importlib.util.spec_from_file_location('prepare',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        return module.verify_commit

    def test_unmodified_readme_line_endings_do_not_block(self):
        self.guard()(self.site,self.preview,self.base,self.head,['paper.json'])

    def test_unrelated_committed_change_rejected(self):
        (self.site/'README.md').write_bytes(b'real unrelated edit');self.git('add','README.md');self.git('commit','-qm','unexpected')
        with self.assertRaisesRegex(ValueError,'scope'):
            self.guard()(self.site,self.preview,self.base,self.git('rev-parse','HEAD'),['paper.json'])

    def test_changed_asset_byte_mismatch_rejected(self):
        (self.preview/'paper.json').write_bytes(b'wrong')
        with self.assertRaisesRegex(ValueError,'artifact'):
            self.guard()(self.site,self.preview,self.base,self.head,['paper.json'])

    def test_publisher_rejects_untracked_or_staged_files(self):
        path=Path(__file__).with_name('paper_guardrails.py')
        spec=importlib.util.spec_from_file_location('guard',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        module.require_clean_publication(self.site)
        (self.site/'unexpected.pyc').write_bytes(b'unreviewed')
        with self.assertRaisesRegex(ValueError,'Unreviewed'):
            module.require_clean_publication(self.site)
        self.git('add','unexpected.pyc')
        with self.assertRaisesRegex(ValueError,'Unreviewed'):
            module.require_clean_publication(self.site)

    def test_public_repository_tracks_no_generated_bytecode(self):
        root=Path(__file__).resolve().parents[1]
        tracked=subprocess.check_output(['git','-C',str(root),'ls-files'],text=True).splitlines()
        self.assertEqual([], [n for n in tracked if '__pycache__' in n or n.endswith(('.pyc','.pyo'))])


if __name__=='__main__':unittest.main(verbosity=2)
