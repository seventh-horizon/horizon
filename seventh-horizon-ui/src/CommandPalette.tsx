import { useEffect, useMemo, useRef, useState } from 'react';

export type CmdResult = { kind: 'run' | 'tag'; text: string } | { kind: 'hint'; text: string };

export default function CommandPalette({
  open, onClose, runs, tags, applyFilter
}:{
  open: boolean;
  onClose: () => void;
  runs: string[];
  tags: string[];
  applyFilter: (f:{ tag?: string; runId?: string }) => void;
}){
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const results: CmdResult[] = useMemo(()=>{
    const qq = q.trim().toLowerCase();
    if(!qq) return [{ kind:'hint', text:'Type to search runs and tags' }];
    const runMatches = runs.filter(r => r.toLowerCase().includes(qq)).slice(0, 8).map(r => ({ kind:'run', text:r })) as CmdResult[];
    const tagMatches = tags.filter(t => t.toLowerCase().includes(qq)).slice(0, 8).map(t => ({ kind:'tag', text:t })) as CmdResult[];
    const out = [...runMatches, ...tagMatches];
    return out.length ? out : [{ kind:'hint', text:'No matches' }];
  }, [q, runs, tags]);

  useEffect(()=>{ if(open){ setQ(''); setTimeout(()=> inputRef.current?.focus(), 0); }}, [open]);

  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if(e.key === 'Escape' && open){ e.preventDefault(); onClose(); }
      if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); onClose(); } // toggle handled in App
      if(e.key === 'Enter' && open){
        const first = results.find(r => r.kind === 'run' || r.kind === 'tag');
        if(first){
          if(first.kind === 'run') applyFilter({ runId:first.text });
          else applyFilter({ tag:first.text });
          onClose();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [open, results, onClose, applyFilter]);

  if(!open) return null;

  return (
    <div style={overlay} onClick={onClose} aria-modal role="dialog">
      <div style={panel} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{opacity:.7, width:36, textAlign:'center'}}>⌘K</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Find a run id or tag…"
            style={input}
          />
          <button onClick={onClose}>Close</button>
        </div>
        <div style={{marginTop:10, maxHeight:260, overflow:'auto'}}>
          {results.map((r,i)=>(
            <div
              key={i}
              style={row}
              onClick={()=>{
                if(r.kind === 'run') applyFilter({ runId:r.text });
                if(r.kind === 'tag') applyFilter({ tag:r.text });
                onClose();
              }}
            >
              <span style={{opacity:.6, width:44, display:'inline-block'}}>
                {r.kind === 'run' ? 'Run' : r.kind === 'tag' ? 'Tag' : ''}
              </span>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const overlay:React.CSSProperties = {
  position:'fixed', inset:0, zIndex:9998, background:'rgba(0,0,0,.45)',
  display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:80
};
const panel:React.CSSProperties = {
  width:640, background:'var(--bg-1)', color:'var(--fg-0)',
  borderRadius:14, boxShadow:'var(--shadow-2)', padding:12
};
const input:React.CSSProperties = {
  flex:1, padding:'8px 10px', borderRadius:10,
  border:'1px solid color-mix(in oklab, var(--fg-1) 18%, transparent)',
  background:'var(--bg-0)', color:'var(--fg-0)'
};
const row:React.CSSProperties = {
  padding:'8px 6px', borderRadius:10, cursor:'pointer'
};