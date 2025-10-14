#!/usr/bin/env python3
import sys,re,json
DATA=sys.stdin.read()
def anyof(*ws): return any(re.search(r'\b'+re.escape(w)+r'\b',DATA,re.I) for w in ws)
# Honor explicit markers if present
if re.search(r'(?m)^#\s*path:\s+\S+',DATA): print(json.dumps({"mode":"explicit"})); sys.exit(0)
target="misc"
if anyof("kubebuilder","observatoryrun","controller-runtime","CRD","webhook"): target="observatory-operator"
elif anyof("ansible","awx","playbook"): target="observatory-operator-lite"
elif anyof("VEL_MANIFEST.schema.json","vel_validator","VEL"): target="vel"
elif anyof("repro_auditor.py","repro ledger","deterministic") and "python" in DATA.lower(): target="repro-pack"
elif anyof("governance_hash.sh","pin_actions.sh","audit_action_pins.sh","heartbeat","ascii-lint"): target="scripts"
elif anyof("workflow_dispatch:","uses: actions/checkout","on: push","jobs:"): target=".github/workflows"
elif anyof("Next.js","page.tsx","app/observer","timeline","public/field"): target="app/observer"
elif anyof("phi_matrix","kappa","plot_field.py","compute_field.py","make_snapshot.py"): target="tools"
print(json.dumps({"mode":"heuristic","target":target}))
