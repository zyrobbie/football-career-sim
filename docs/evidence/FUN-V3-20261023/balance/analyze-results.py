#!/usr/bin/env python3
"""Summarize finite V3 captures without changing selection policy or pass criteria."""
import collections
import hashlib
import json
import pathlib
import sys

long_path, cash_path, destination = map(pathlib.Path, sys.argv[1:4])
long = json.loads(long_path.read_text())
cash = json.loads(cash_path.read_text())
fields = ['windows', 'lowStateAtPlanWindows', 'purchaseCount', 'actualGain', 'livingCityMoves', 'cityEligibleWindows', 'recoveryWindows', 'averageFitness', 'averageMorale', 'averageForm', 'minutes', 'appearances', 'starts', 'goals', 'assists', 'injuryWindows', 'injuryWeeks', 'peakOverall', 'finalOverall', 'honors', 'paymentEuro', 'refundEuro', 'balanceEuro', 'salaryDueEuro', 'salaryActualEuro', 'salaryCapLossEuro', 'capLossGain', 'eventCount']

def aggregate(rows):
    out = {'careers': len(rows)}
    for field in fields:
        values = [r['metrics'][field] for r in rows]
        out[field] = {'total': sum(values), 'mean': sum(values) / len(values) if values else 0, 'min': min(values) if values else 0, 'max': max(values) if values else 0}
    for field in ['categoryCounts', 'tierCounts', 'eventCategories', 'eventIds', 'storyClosures']:
        counts = collections.Counter()
        for row in rows:
            counts.update(row['metrics'][field])
        out[field] = dict(sorted(counts.items()))
    out['reachedV3Nodes'] = sorted({node for row in rows for node in row['metrics']['reachedV3Nodes']})
    out['publicStoreActions'] = {'total':sum(r['actionCount'] for r in rows),'min':min((r['actionCount'] for r in rows),default=0),'max':max((r['actionCount'] for r in rows),default=0)}
    out['retirementFinalWindowDistribution'] = dict(sorted(collections.Counter(str(r['maxWindowIndex']) for r in rows).items()))
    out['plannedGain'] = sum(w['plannedGain'] for r in rows for w in r['windows'])
    out['finalAttributesMean'] = {k:sum(r['final']['player']['attributes'][k] for r in rows)/len(rows) for k in rows[0]['final']['player']['attributes']} if rows else {}
    out['attributeDeclineFromAdultPeakMean'] = {k:sum(max(w['attributes'][k] for w in r['windows'])-r['final']['player']['attributes'][k] for r in rows)/len(rows) for k in rows[0]['final']['player']['attributes']} if rows else {}
    out['consecutiveSameEvent'] = sum(r['metrics']['consecutiveSameEvent'] for r in rows)
    out['consecutiveSameEventCategory'] = sum(r['metrics']['consecutiveSameEventCategory'] for r in rows)
    return out

groups = sorted({r['group'] for r in long['runs']})
by_seed = {}
for row in long['runs']:
    by_seed.setdefault(row['scenario']['seed'], {})[row['group']] = row
paired = []
for base_group in ['OFF', 'ON_FREE']:
    for group in groups:
        if group == base_group or group == 'OFF':
            continue
        cases = [(seed, rows[base_group], rows[group]) for seed, rows in by_seed.items() if base_group in rows and group in rows]
        metrics = {}
        for field in fields:
            base_total = sum(a['metrics'][field] for _, a, _ in cases)
            comparison_total = sum(b['metrics'][field] for _, _, b in cases)
            percent = (comparison_total - base_total) / abs(base_total) * 100 if base_total else None
            flags = []
            zero_changes = []
            for seed, a, b in cases:
                av, bv = a['metrics'][field], b['metrics'][field]
                delta = bv - av
                if av and abs(delta / av) > .1:
                    flags.append({'seed': seed, 'base': av, 'comparison': bv, 'delta': delta, 'percent': delta / abs(av) * 100})
                elif not av and bv:
                    zero_changes.append({'seed': seed, 'base': av, 'comparison': bv, 'delta': delta})
            metrics[field] = {'baseTotal': base_total, 'comparisonTotal': comparison_total, 'delta': comparison_total - base_total, 'aggregatePercent': percent, 'aggregateOver10Percent': percent is not None and abs(percent) > 10, 'pairsOver10Percent': flags, 'zeroBaseNonzeroPairs': zero_changes}
        paired.append({'baseline': base_group, 'comparison': group, 'pairs': len(cases), 'metrics': metrics})

cash_rows = {}
for row in cash['runs']:
    salary = row['windows'][0]['annualSalaryEuro']
    cash_rows.setdefault(salary, {}).setdefault(row['group'], []).append(row)
cash_summary = []
for salary, arms in sorted(cash_rows.items()):
    row = {'annualSalaryEuro': salary, 'arms': {}}
    for arm, rows in sorted(arms.items()):
        ratios = [w['nextSalaryToSpendRatio'] for r in rows for w in r['windows'] if w['nextSalaryToSpendRatio'] is not None]
        row['arms'][arm] = {**aggregate(rows), 'nextSalaryToSpendRatio': {'count': len(ratios), 'min': min(ratios) if ratios else None, 'max': max(ratios) if ratios else None, 'mean': sum(ratios)/len(ratios) if ratios else None}}
    cash_summary.append(row)

category_flags = []
for group in groups:
    counts = aggregate([r for r in long['runs'] if r['group'] == group])['categoryCounts']
    total = sum(counts.values())
    for category, number in counts.items():
        if total and number / total > .7:
            category_flags.append({'group': group, 'category': category, 'count': number, 'purchases': total, 'share': number/total, 'policyConstrainsCategory': group == 'ON_FIXED_BODY'})

out = {'kind': 'finite observations, not subjective-fun acceptance or statistical significance',
       'sources': [{'path': str(p), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in [long_path, cash_path]],
       'sampleCounts': {'longUniqueStarts': len(by_seed), 'longMainRuns': len(long['runs']), 'cashUniqueStarts': len({r['scenario']['seed'] for r in cash['runs']}), 'cashMainRuns': len(cash['runs'])},
       'groups': {group: aggregate([r for r in long['runs'] if r['group'] == group]) for group in groups},
       'pairedComparisons': paired, 'categoryOver70PercentFlags': category_flags, 'cashByIncome': cash_summary}
destination.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'sampleCounts':out['sampleCounts'],'categoryFlags':category_flags,'aggregateOver10Percent':[{ 'base':p['baseline'],'comparison':p['comparison'],'metrics':[f for f,v in p['metrics'].items() if v['aggregateOver10Percent']]} for p in paired]},ensure_ascii=False))
