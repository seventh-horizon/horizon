#!/usr/bin/env python3
import sys,json
# Usage: horizon_ref.py phi NODE_A NODE_B [--norm]
if len(sys.argv)<4: print("usage: horizon_ref.py phi A B [--norm]",file=sys.stderr); sys.exit(2)
a,b=sys.argv[2],sys.argv[3]
seed=(sum(map(ord,(a+"|"+b)))%101)/10.0
out={"phi":seed}
if "--norm" in sys.argv: out["phi_norm"]=seed/max(1.0,len(a)+len(b))
print(json.dumps(out,ensure_ascii=True))
