#!/usr/bin/env python3
"""Generate a separate original-code reference runner, never rewrite baseline src."""
import argparse
import pathlib
import re
parser=argparse.ArgumentParser()
parser.add_argument('--repo',default='.')
parser.add_argument('--baseline',required=True,help='Read-only git-archive tree of original commit37411e3')
parser.add_argument('--out',required=True,help='New output directory inside the candidate checkout')
args=parser.parse_args()
repo=pathlib.Path(args.repo).resolve();baseline=pathlib.Path(args.baseline).resolve();out=pathlib.Path(args.out).resolve()
assert out.is_relative_to(repo), 'Use a new output directory inside the candidate checkout for dependency resolution.'
source=repo/'src/store/gameStore.v3Balance.test.ts'
assert 'SAVE_VERSION = 13' in (baseline/'src/models/game.ts').read_text()
def replace(match):
    target=(source.parent/match.group(1)).resolve()
    original=baseline/target.relative_to(repo)
    if pathlib.Path(str(original)+'.ts').exists():target=original
    return "'"+str(target)+"'"
out.mkdir(parents=True,exist_ok=False)
runner=out/'baseline-reference.reference.ts'
runner.write_text(re.sub(r"'((?:\.\.?/)[^']+)'",replace,source.read_text()))
(out/'baseline-vitest.config.mts').write_text("import { defineConfig } from 'vitest/config'\nexport default defineConfig({test:{environment:'node',include:['baseline-reference.reference.ts']}})\n")
print(f'FUNV3_BASELINE=1 FUNV3_CAPTURE=1 FUNV3_SUITE=long FUNV3_CAPTURE_DIR={out}/capture {repo}/node_modules/.bin/vitest run --root {out} --config {out}/baseline-vitest.config.mts')
