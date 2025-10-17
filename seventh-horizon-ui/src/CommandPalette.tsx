import { useEffect, useMemo, useRef, useState } from 'react';

// ... (props and types remain the same) ...

// ✅ FIX: Changed from "export default function" to "export function"
export function CommandPalette({
  open, onClose, runs, tags, applyFilter
}:{
  open: boolean;
  onClose: () => void;
  runs: string[];
  tags: string[];
  applyFilter: (f:{ tag?: string; runId?: string }) => void;
}){
  const [q, setQ] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const results: { kind: 'run' | 'tag' | 'hint'; text: string }[] = useMemo(()=>{
    const qq = q.trim().toLowerCase();
    if(!qq) return [{ kind:'hint', text:'Type to search runs and tags' }];
    const runMatches = runs.filter(r => r.toLowerCase().includes(qq)).slice(0, 8).map(r => ({ kind:'run' as const, text:r }));
    const tagMatches = tags.filter(t => t.toLowerCase().includes(qq)).slice(0, 8).map(t => ({ kind:'tag' as const, text:t }));
    const out = [...runMatches, ...tagMatches];
    return out.length ? out : [{ kind:'hint', text:'No matches' }];
  }, [q, runs, tags]);

  useEffect(()=>{ if(open){ setQ(''); setSelectedIndex(0); setTimeout(()=> inputRef.current?.focus(), 50); }}, [open]);

  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if(e.key === 'Escape' && open){ e.preventDefault(); onClose(); }
      if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); onClose(); }
      if(e.key === 'Enter' && open){
        const target = results[selectedIndex];
        if(target && (target.kind === 'run' || target.kind === 'tag')){
          if(target.kind === 'run') applyFilter({ runId:target.text });
          else applyFilter({ tag:target.text });
          onClose();
        }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(results.length - 1, i + 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(0, i - 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [open, results, selectedIndex, onClose, applyFilter]);

  if(!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} aria-modal role="dialog">
      <div className="modal" style={{width: 640}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{opacity:.7, width:36, textAlign:'center'}}>⌘K</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Find a run id or tag…"
            className="input"
            style={{flex: 1}}
          />
          <button className="pill" onClick={onClose}>Close</button>
        </div>
        <div ref={resultsRef} style={{marginTop:10, maxHeight:260, overflow:'auto'}}>
          {results.map((r,i)=>(
            <div
              key={i}
              className={`menu-item ${selectedIndex === i ? 'active' : ''}`}
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
