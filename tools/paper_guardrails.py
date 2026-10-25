"""Fast publication preflight. Human scientific review is explicit, never inferred."""
import argparse
import ast
import hashlib
import json
from pathlib import Path
import subprocess

POLICY_VERSION = 1
VISIBLE_FIELDS = ('input', 'output', 'conditions', 'evaluation', 'limitations')


def assert_runner_wiring(source):
    """Check actual caller wiring without starting a build/browser or importing it."""
    tree = ast.parse(source)
    declaration = next(n.value for n in ast.walk(tree) if isinstance(n, ast.Assign)
                       and any(isinstance(t, ast.Name) and t.id == 'versions' for t in n.targets))
    keys = {n.value for n in declaration.generators[0].iter.elts}
    for node in ast.walk(tree):
        if isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name) and node.value.id == 'versions':
            if not isinstance(node.slice, ast.Constant) or node.slice.value not in keys:
                raise ValueError('Invalid runner version lookup: expected one declared scalar key')


def bounded(value, limit=2000):
    value = str(value)
    if len(value) <= limit:
        return value
    marker = '\n[output abbreviated; full evidence stays in file]\n'
    return value[:max(0, limit - len(marker) - limit // 3)] + marker + value[-(limit // 3):]


def visible_text(spec):
    c = spec['content']
    return ' '.join([c['summary'], *[c.get('fields', {}).get(k, '') for k in VISIBLE_FIELDS],
                     *[s['title'] + ' ' + s['text'] for s in c.get('steps', [])]])


def image_binding(spec, root):
    assets = {f['input_file']: hashlib.sha256((Path(root) / f['input_file']).read_bytes()).hexdigest()
              for f in spec['metadata'].get('figures', [])}
    method = {k: spec['content'].get(k) for k in ('summary', 'fields', 'steps')}
    return {'assets': assets, 'method_sha256': hashlib.sha256(
        json.dumps(method, ensure_ascii=False, sort_keys=True).encode('utf8')).hexdigest()}


def approval(spec, root, *, science=False, labels=False, output_form=False):
    if not all((science, labels, output_form)):
        raise ValueError('Inspect actual final image: scientific meaning, labels, output form are mandatory')
    return {'policy': POLICY_VERSION, 'binding': image_binding(spec, root),
            'human_science_checked': True, 'human_labels_checked': True, 'human_output_form_checked': True}


def preflight(spec, root):
    errors = []
    def error(code, at, detail):
        errors.append({'code': code, 'at': at, 'detail': detail})
    visible = visible_text(spec)
    claims = spec.get('claims', {})
    sources = spec['content'].get('sources', [])
    for term in spec.get('qa', {}).get('required_text', []):
        if term not in visible:
            error('visible_term', term, 'Expected term absent from rendered fields; inspect content/source before changing expectation')
        claim = claims.get(spec.get('qa', {}).get('term_claim_refs', {}).get(term), {})
        refs = claim.get('sources', [])
        if not refs or any(not isinstance(i, int) or i < 0 or i >= len(sources) or not sources[i].get('url') for i in refs):
            error('term_source', term, 'Missing source-backed claim reference; semantic correctness still requires human review')
    try:
        review = json.loads((Path(root) / 'image-review.json').read_text('utf8'))
        if review.get('policy') != POLICY_VERSION or not all(review.get(k) is True for k in (
                'human_science_checked', 'human_labels_checked', 'human_output_form_checked')):
            error('image_review_incomplete', 'image-review', 'All human checks required')
        if review.get('binding') != image_binding(spec, root):
            error('image_review_stale', 'image-review', 'Image or method changed after final image review')
    except FileNotFoundError:
        error('image_review_missing', 'image-review', 'Inspect final image before automated QA, then record approval')
    except (ValueError, OSError, KeyError) as exc:
        error('image_review_invalid', 'image-review', type(exc).__name__)
    return errors


def enforce(spec, root):
    errors = preflight(spec, root)
    if errors:
        raise ValueError(bounded(json.dumps({'status': 'blocked', 'errors': errors}, ensure_ascii=False)))


def verify_commit(site, preview, baseline, commit, changed):
    def git(*args):
        return subprocess.check_output(['git', '-C', str(site), *args])
    actual = set(git('diff', '--name-only', baseline, commit).decode().splitlines())
    if actual != set(changed):
        raise ValueError('Commit scope differs from reviewed manifest: ' + str(actual))
    for name in changed:
        if git('show', commit + ':' + name) != (Path(preview) / name).read_bytes():
            raise ValueError('Committed artifact differs from reviewed preview: ' + name)


def require_clean_publication(site):
    status = subprocess.check_output(['git', '-C', str(site), 'status', '--porcelain', '--untracked-files=normal'])
    if status.strip():
        raise ValueError('Unreviewed working-tree changes: commit reviewed scope before publication; never auto-add files')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('preflight', 'approve', 'summary'))
    parser.add_argument('path')
    parser.add_argument('--science', action='store_true')
    parser.add_argument('--labels', action='store_true')
    parser.add_argument('--output-form', action='store_true')
    args = parser.parse_args()
    path = Path(args.path)
    value = json.loads(path.read_text('utf8'))
    if args.action == 'summary':
        print(bounded(json.dumps({k: value.get(k) for k in ('id', 'status', 'prepared_commit', 'run_counts', 'run_seconds')}, ensure_ascii=False)))
        return
    if args.action == 'approve':
        review = approval(value, path.parent, science=args.science, labels=args.labels, output_form=args.output_form)
        (path.parent / 'image-review.json').write_text(json.dumps(review, indent=2) + '\n', encoding='utf8')
    enforce(value, path.parent)
    print(json.dumps({'status': 'passed', 'policy': POLICY_VERSION, 'id': value['metadata']['id']}))


if __name__ == '__main__':
    main()
