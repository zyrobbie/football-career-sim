#!/usr/bin/env python3
"""Combine four disjoint captures, preserving actual sample counts and audits."""
import collections
import hashlib
import json
import pathlib
import sys
base = pathlib.Path(sys.argv[1])
reference = pathlib.Path(sys.argv[2])
runs, fixtures, sources = [], [], []
for index in range(4):
    source = base / f'shard-{index}/results.json'
    content = json.loads(source.read_text())
    assert len(content['runs']) == 48
    runs.extend(content['runs'])
    fixtures.extend(json.loads((base / f'shard-{index}/fixtures.json').read_text())['fixtures'])
    sources.append({'path': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
counts = collections.Counter(row['group'] for row in runs)
assert dict(counts) == {'OFF':48, 'ON_FREE':48, 'ON_FIXED_BODY':48, 'ON_SITUATIONAL':48}
assert len(runs) == 192 and len(fixtures) == 48
assert len({row['scenario']['seed'] for row in runs}) == 48
initial = collections.defaultdict(set)
reference_runs = json.loads(reference.read_text())['runs']
for row in runs:
    initial[row['scenario']['seed']].add(row['initialBusinessSHA256'])
    assert row['final']['phase'] == 'CAREER_RETIRED'
    root = row['final']['entertainmentV3']
    assert root['stories']['activeChain'] is None
    assert all(period['status'] != 'PENDING' for arrangement in root['arrangements'] for period in arrangement['periods'])
    assert all(arrangement['refundEuro'] <= arrangement['priceEuro'] for arrangement in root['arrangements'])
    assert len(root['ledger']) == len({entry['id'] for entry in root['ledger']})
    if row['group'] == 'OFF':
        expected = reference_runs[row['scenario']['seed']]
        assert row['steps'] == expected['steps']
        assert row['initialBusinessSHA256'] == expected['initialBusinessSHA256']
        assert row['finalBusinessSHA256'] == expected['finalBusinessSHA256']
    for chain in root['stories']['closedChains']:
        if chain['reason'] == 'COMPLETED':
            assert 1 <= chain['closedAtWindowIndex'] - chain['firstWindowIndex'] <= 3
assert all(len(values) == 1 for values in initial.values())
runs.sort(key=lambda row:(row['scenario']['index'], row['group']))
paid = [window for row in runs for window in row['windows'] if window.get('preparationAudit') is not None]
metadata = {'generatedAt':'2026-10-23', 'kind':'192 main adult careers, four disjoint deterministic 12-seed processes', 'uniqueStarts':48, 'mainRuns':192, 'groups':dict(counts), 'sameInitialBusinessFixtureAcrossFourGroups':True, 'allRetired':True, 'allOriginalOFFProjectionsMatched':True, 'baselineReferenceSHA256':hashlib.sha256(reference.read_bytes()).hexdigest(), 'sources':sources, 'subjectiveFunEstablished':False,
            'paidPreparationWindowAudits':len(paid), 'paidKeyMomentPreparationAudits':sum(window['preparationAudit']['keyMomentPreparedChecked'] for window in paid), 'reportPeriodReceipts':sum(len(window.get('arrangementReceipts',[])) for row in runs for window in row['windows']), 'allPaidAuditsDirectAttributesAndPotentialsUnchanged':all(window['preparationAudit']['attributesUnchanged'] and window['preparationAudit']['potentialsUnchanged'] for window in paid)}
for name, content in [('long-results.json',{'metadata':metadata,'runs':runs}), ('long-summary.json',{'metadata':metadata,'runs':[{key:value for key,value in row.items() if key not in ['windows','steps','final']} for row in runs]}), ('long-fixtures.json',{'metadata':metadata,'fixtures':fixtures})]:
    destination = base / name
    if destination.exists():
        raise SystemExit(f'Refusing to overwrite existing capture: {destination}')
    destination.write_text(json.dumps(content,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(metadata,ensure_ascii=False))
