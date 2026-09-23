/* global React, Sidebar, VideoCard, FilterBar, VIDEOS, QUEUE, hexA, fa, DirectionA, DirectionB, DirectionC, PlusIcon, UserPlusIcon, ChevronDown, ChevronRight, LayersIcon, LogOutIcon, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle */
const { useState, useMemo } = React;

/* compact In-Queue rail (grouped) reused as backdrop context */
function QueueGroupCompact({ event, items, defaultOpen }){
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={{ background:"#1A1A1A", border:"1px solid #27272a", borderRadius:12, overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 12px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left" }}>
        <span style={{ color:"#71717a", display:"flex" }}>{open ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12.5, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{event}</div>
          <div style={{ fontSize:10, color:"#71717a", marginTop:2 }}>{items.length} rounds awaiting pickup</div>
        </div>
        <span style={{ padding:"1px 7px", fontSize:10.5, fontWeight:700, borderRadius:999, background:fa("#f59e0b",0.12), color:"#f59e0b", border:`1px solid ${fa("#f59e0b",0.24)}` }}>{items.length}</span>
      </button>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, padding:"0 12px 11px 34px" }}>
        {items.map(q=><span key={q.id} style={{ padding:"1.5px 6px", fontSize:9.5, fontWeight:700, borderRadius:5, background:"rgba(255,255,255,0.05)", color:"#a1a1aa", border:"1px solid rgba(255,255,255,0.08)" }}>R{q.round}</span>)}
      </div>
    </div>
  );
}

function Rail({ direction }){
  const groups = useMemo(()=>{ const m={}; QUEUE.forEach(q=>{(m[q.event]=m[q.event]||[]).push(q);}); return Object.entries(m); },[]);
  return (
    <div style={{ flex:"0 1 340px", maxWidth:360, minWidth:300, display:"flex", flexDirection:"column", gap:22 }}>
      {/* Upload (unchanged) */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:16, background:"#3B82F6", borderRadius:16, border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 10px 30px rgba(59,130,246,0.18)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><PlusIcon size={20} color="#fff"/></div>
          <div style={{ display:"flex", flexDirection:"column", gap:2, lineHeight:1.25 }}>
            <span style={{ fontSize:14, fontWeight:600, color:"#fff", whiteSpace:"nowrap" }}>Upload Video</span>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.65)", whiteSpace:"nowrap" }}>Add new footage</span>
          </div>
        </div>
        <div style={{ width:32, height:32, borderRadius:8, background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.55)", flexShrink:0 }}><PlusIcon size={14} color="currentColor"/></div>
      </div>

      {/* In Queue */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <h3 style={{ margin:0, fontSize:18, fontWeight:500, color:"#fff", letterSpacing:"-0.01em" }}>In Queue</h3>
          <span style={{ padding:"2px 9px", fontSize:12, fontWeight:600, borderRadius:999, background:fa("#f59e0b",0.10), color:"#f59e0b", border:`1px solid ${fa("#f59e0b",0.20)}` }}>{QUEUE.length}</span>
          <span style={{ marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"#71717a" }}><LayersIcon size={13}/>{groups.length} events</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {groups.map(([ev,items],i)=><QueueGroupCompact key={ev} event={ev} items={items} defaultOpen={i===0} />)}
        </div>
        <p style={{ fontSize:11, color:"#71717a", marginTop:14, textAlign:"center" }}>Videos waiting to be picked up by team members</p>
      </div>

      {/* ★ FEEDBACK lives in the rail whitespace for directions A & B */}
      {direction==="A" && <DirectionA/>}
      {direction==="B" && <DirectionB/>}
      {direction==="C" && (
        <div style={{ marginTop:2, padding:"14px 16px", borderRadius:14, border:"1px dashed #2a2a2e", textAlign:"center" }}>
          <div style={{ fontSize:11.5, color:"#52525b", lineHeight:1.5 }}>Feedback lives in the floating button,<br/>bottom-right of every screen →</div>
        </div>
      )}
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "direction": "A"
}/*EDITMODE-END*/;

function App(){
  const [t,setTweak]=useTweaks(TWEAK_DEFAULTS);
  const [statusFilter,setStatusFilter]=useState("All");
  const [assignee,setAssignee]=useState(null);
  const assigned = VIDEOS.filter(v=>v.assignee);
  const filtered = assigned.filter(v=>{
    if(statusFilter==="Unassigned") return false;
    if(assignee && v.assignee!==assignee) return false;
    return true;
  });

  return (
    <div style={{ display:"flex", height:"100vh", background:"#0e0e0e" }}>
      <Sidebar/>
      <main className="cscroll" style={{ flex:1, height:"100vh", overflowY:"auto", padding:"24px 40px 60px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:20, marginBottom:32 }}>
          <span style={{ fontSize:14, color:"#d4d4d8", padding:"6px 12px", borderRadius:8, border:"1px solid #27272a", background:"#161616" }}>syd@boxraw.com</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:14, color:"#a1a1aa" }}><LogOutIcon size={16}/>Logout</span>
        </div>
        <div style={{ display:"flex", gap:36, maxWidth:1320, margin:"0 auto", alignItems:"flex-start" }}>
          <div style={{ flex:"1 1 auto", minWidth:0 }}>
            <h2 style={{ margin:"0 0 22px", fontSize:28, fontWeight:500, color:"#fff", letterSpacing:"-0.02em" }}>Explore Projects</h2>
            <FilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter} assignee={assignee} setAssignee={setAssignee} count={filtered.length} />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(230px, 1fr))", gap:24 }}>
              {filtered.map(v=><VideoCard key={v.id} v={v} dedup={true} />)}
            </div>
          </div>
          <Rail direction={t.direction} />
        </div>
      </main>

      {t.direction==="C" && <DirectionC/>}

      <TweaksPanel>
        <TweakSection label="Feedback UI" />
        <TweakRadio label="Direction" value={t.direction}
          options={["A","B","C"]} onChange={v=>setTweak("direction", v)} />
        <div style={{ padding:"4px 2px 2px", fontSize:11, color:"#8a8a93", lineHeight:1.55 }}>
          <b style={{color:"#c7c7cf"}}>A</b> — inline rail card (passive)<br/>
          <b style={{color:"#c7c7cf"}}>B</b> — collapsed prompt, expands<br/>
          <b style={{color:"#c7c7cf"}}>C</b> — floating pill → modal
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
