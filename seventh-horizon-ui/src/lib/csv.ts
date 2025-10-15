export const CANONICAL = ['RunID','UTC','Tags','CWD','GitBranch','GitCommit','Python'] as const;
export type CanonicalHeader = typeof CANONICAL[number];

const ALIAS: Record<CanonicalHeader, string[]> = {
  RunID:     ['runid','run_id','id','run','session'],
  UTC:       ['utc','timestamp','time','datetime','ts','date','created_at'],
  Tags:      ['tags','label','labels','kv','meta','metadata'],
  CWD:       ['cwd','cwd_path','workdir','working_dir','pwd','path'],
  GitBranch: ['gitbranch','branch'],
  GitCommit: ['gitcommit','commit','sha','git_sha'],
  Python:    ['python','python_version','py','runtime'],
};

export async function loadText(path: string){
  const r = await fetch(path, { cache:'no-store' });
  if(!r.ok) throw new Error(`Fetch failed: ${r.status} ${r.statusText}`);
  return r.text();
}

export function parseCSV(text: string){
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if(!lines.length) return { header: [] as string[], rows: [] as string[][], issues: ['Empty CSV'] };

  const rawHeader = lines.shift()!.split(',').map(s=>s.trim());
  const lower = rawHeader.map(h=>h.toLowerCase());

  const idxFor = (names: string[]) => {
    for(const n of names){ const i = lower.indexOf(n.toLowerCase()); if(i !== -1) return i; }
    return -1;
  };

  const indexMap = CANONICAL.map(c => {
    const i = idxFor([c, ...(ALIAS[c] || [])]);
    return i === -1 ? -1 : i;
  });

  const issues:string[] = [];
  CANONICAL.forEach((c, i) => { if(indexMap[i] === -1) issues.push(`Missing "${c}" (synthesizing empty column)`); });

  const rows = lines.map(line => {
    const cells = line.split(',');
    return CANONICAL.map((_, i) => indexMap[i] === -1 ? '' : (cells[indexMap[i]] ?? ''));
  });

  return { header: [...CANONICAL], rows, issues };
}

export function uniqueRunIds(rows: string[][], headerIdx: Record<string,number>){
  const set = new Set<string>();
  for(const r of rows){ const v = r[headerIdx['RunID']]; if(v) set.add(v); }
  return Array.from(set).sort();
}

export function uniqueTags(rows: string[][], headerIdx: Record<string,number>){
  const set = new Set<string>();
  const tIdx = headerIdx['Tags'];
  if(tIdx == null) return [];
  for(const r of rows){
    const raw = String(r[tIdx] || '');
    raw.split(/[,\s]+/).filter(Boolean).forEach(tok => set.add(tok));
  }
  return Array.from(set).sort();
}
