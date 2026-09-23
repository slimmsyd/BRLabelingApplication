/* global React, VideoIcon, UserPlusIcon, PlusIcon, MoreIcon, ChevronDown, ChevronRight, LayersIcon, LogOutIcon, hexA, QUEUE, Sidebar, VideoCard, FilterBar, VIDEOS, useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakRadio */
const { useState, useMemo } = React;

/* ---------- queue thumbnail + assign btn (shared) ---------- */
function QueueThumb({ q, size=64 }){
  return (
    <div style={{ width:size+24, height:size, borderRadius:8, background:`linear-gradient(135deg, ${q.hue}, #07090d 80%)`, position:"relative", flexShrink:0, border:"1px solid rgba(255,255,255,0.1)", overflow:"hidden" }}>
      <span style={{ position:"absolute", top:4, right:4, padding:"1px 5px", background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", borderRadius:4, fontSize:8, fontWeight:700, color:"#fff", border:"1px solid rgba(255,255,255,0.1)" }}>R{q.round}</span>
    </div>
  );
}
function AssignBtn({ small }){
  return (
    <button onClick={e=>{e.preventDefault();}} style={{
      display:"inline-flex", alignItems:"center", gap:5, padding: small?"5px 9px":"6px 11px", background:"#3B82F6",
      color:"#fff", fontSize:10, fontWeight:700, borderRadius:8, border:"none", cursor:"pointer", whiteSpace:"nowrap",
    }}
    onMouseEnter={e=>e.currentTarget.style.background="#2f6fd6"}
    onMouseLeave={e=>e.currentTarget.style.background="#3B82F6"}>
      <UserPlusIcon size={12}/>ASSIGN
    </button>
  );
}

/* ---------- FLAT queue row (original look) ---------- */
function QueueRowFlat({ q }){
  const [hover,setHover]=useState(false);
  return (
    <div style={{ position:"relative" }} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <a href="#" onClick={e=>e.preventDefault()} style={{ textDecoration:"none", display:"block", background:"#1E1E1E", border:`1px solid ${hover?"rgba(161,161,170,0.5)":"#27272a"}`, borderRadius:12, padding:12, transition:"border-color 150ms" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
          <QueueThumb q={q}/>
          <div style={{ flex:1, minWidth:0, paddingTop:2, paddingRight:64 }}>
            <h4 style={{ margin:0, fontSize:13, fontWeight:500, color: hover?"#3B82F6":"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", transition:"color 150ms" }}>{q.title}</h4>
            <p style={{ margin:"2px 0 0", fontSize:11, color:"#a1a1aa", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{q.boxer1} vs {q.boxer2}</p>
            <div style={{ marginTop:8 }}>
              <span style={{ padding:"2px 8px", fontSize:10, fontWeight:600, borderRadius:5, background:hexA("#f59e0b",0.10), color:"#f59e0b", border:`1px solid ${hexA("#f59e0b",0.20)}`, textTransform:"uppercase", letterSpacing:"0.03em" }}>AWAITING PICKUP</span>
            </div>
          </div>
        </div>
      </a>
      <div style={{ position:"absolute", top:10, right:10, display:"flex", gap:6 }}>
        <AssignBtn small/>
        <button onClick={e=>e.preventDefault()} style={{ width:28, height:28, borderRadius:8, background:hexA("#1E1E1E",0.9), border:"1px solid #27272a", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#a1a1aa" }}><MoreIcon size={14}/></button>
      </div>
    </div>
  );
}

/* ---------- GROUPED queue (by event, collapsible) ---------- */
function QueueGroup({ event, items, defaultOpen }){
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={{ background:"#1A1A1A", border:"1px solid #27272a", borderRadius:12, overflow:"hidden" }}>
      {/* group header */}
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"12px 12px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left" }}>
        <span style={{ color:"#71717a", display:"flex" }}>{open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{event}</div>
          <div style={{ fontSize:10.5, color:"#71717a", marginTop:2 }}>{items.length} rounds awaiting pickup</div>
        </div>
        <span style={{ padding:"2px 8px", fontSize:11, fontWeight:700, borderRadius:999, background:hexA("#f59e0b",0.12), color:"#f59e0b", border:`1px solid ${hexA("#f59e0b",0.24)}` }}>{items.length}</span>
      </button>
      {/* collapsed strip: round chips preview */}
      {!open && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, padding:"0 14px 12px 38px" }}>
          {items.map(q=>(
            <span key={q.id} style={{ padding:"2px 7px", fontSize:10, fontWeight:700, borderRadius:6, background:"rgba(255,255,255,0.05)", color:"#a1a1aa", border:"1px solid rgba(255,255,255,0.08)" }}>R{q.round}</span>
          ))}
        </div>
      )}
      {/* expanded: rows */}
      {open && (
        <div style={{ padding:"0 10px 10px", display:"flex", flexDirection:"column", gap:6 }}>
          {items.map(q=>(
            <div key={q.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 8px", borderRadius:9, background:"#141414", border:"1px solid #232326" }}>
              <QueueThumb q={q} size={40}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>Round {q.round}</div>
                <div style={{ fontSize:10, color:"#71717a" }}>{q.date}</div>
              </div>
              <AssignBtn small/>
            </div>
          ))}
          <button onClick={e=>e.preventDefault()} style={{ marginTop:2, width:"100%", padding:"8px", fontSize:11, fontWeight:700, borderRadius:8, background:hexA("#3B82F6",0.10), color:"#60a5fa", border:`1px solid ${hexA("#3B82F6",0.22)}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <UserPlusIcon size={13}/>Assign all {items.length} rounds
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Right rail ---------- */
function QueueRail({ grouped }){
  const groups = useMemo(()=>{
    const m = {};
    QUEUE.forEach(q=>{ (m[q.event] = m[q.event] || []).push(q); });
    return Object.entries(m);
  }, []);
  return (
    <div style={{ flex:"0 1 330px", maxWidth:360, minWidth:280, display:"flex", flexDirection:"column", gap:24 }}>
      {/* Upload Video — kept as-is per user */}
      <a href="#" onClick={e=>e.preventDefault()} style={{ textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"space-between", padding:16, background:"#3B82F6", borderRadius:16, border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 10px 30px rgba(59,130,246,0.18)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><PlusIcon size={20} color="#fff"/></div>
          <div style={{ display:"flex", flexDirection:"column", gap:2, minWidth:0, lineHeight:1.25 }}>
            <span style={{ fontSize:14, fontWeight:600, color:"#fff", whiteSpace:"nowrap" }}>Upload Video</span>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.65)", whiteSpace:"nowrap" }}>Add new footage</span>
          </div>
        </div>
        <div style={{ width:32, height:32, borderRadius:8, background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.55)", flexShrink:0 }}><PlusIcon size={14} color="currentColor"/></div>
      </a>

      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:18, fontWeight:500, color:"#fff", letterSpacing:"-0.01em" }}>In Queue</h3>
          <span style={{ padding:"2px 9px", fontSize:12, fontWeight:600, borderRadius:999, background:hexA("#f59e0b",0.10), color:"#f59e0b", border:`1px solid ${hexA("#f59e0b",0.20)}` }}>{QUEUE.length}</span>
          {grouped && <span style={{ marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"#71717a" }}><LayersIcon size={13}/>{groups.length} events</span>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap: grouped?10:16 }}>
          {grouped
            ? groups.map(([ev,items],i)=><QueueGroup key={ev} event={ev} items={items} defaultOpen={i===0} />)
            : QUEUE.map(q=><QueueRowFlat key={q.id} q={q} />)
          }
        </div>
        <p style={{ fontSize:11, color:"#71717a", marginTop:16, textAlign:"center" }}>Videos waiting to be picked up by team members</p>
      </div>
    </div>
  );
}

/* ============================ App ============================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "queueMode": "grouped",
  "showFilters": true,
  "dedupCards": true
}/*EDITMODE-END*/;

function App(){
  const [t,setTweak]=useTweaks(TWEAK_DEFAULTS);
  const [statusFilter,setStatusFilter]=useState("All");
  const [assignee,setAssignee]=useState(null);

  const filtered = useMemo(()=>VIDEOS.filter(v=>{
    if(statusFilter==="Unassigned" && v.assignee) return false;
    if(statusFilter==="In Progress" && v.status!=="IN PROGRESS") return false;
    if(assignee && v.assignee!==assignee) return false;
    return true;
  }), [statusFilter, assignee]);

  return (
    <div style={{ display:"flex", height:"100vh", background:"#0e0e0e" }}>
      <Sidebar/>
      <main className="cscroll" style={{ flex:1, height:"100vh", overflowY:"auto", padding:"24px 40px 60px" }}>
        {/* top bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:20, marginBottom:36 }}>
          <span style={{ fontSize:14, color:"#d4d4d8", padding:"6px 12px", borderRadius:8, border:"1px solid #27272a", background:"#161616" }}>syd@boxraw.com</span>
          <a href="#" onClick={e=>e.preventDefault()} style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:14, color:"#a1a1aa", textDecoration:"none" }}><LogOutIcon size={16}/>Logout</a>
        </div>

        <div style={{ display:"flex", gap:36, maxWidth:1320, margin:"0 auto", alignItems:"flex-start" }}>
          {/* center */}
          <div style={{ flex:"1 1 auto", minWidth:0 }}>
            <h2 style={{ margin:"0 0 24px", fontSize:28, fontWeight:500, color:"#fff", letterSpacing:"-0.02em" }}>Explore Projects</h2>
            {t.showFilters && (
              <FilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter} assignee={assignee} setAssignee={setAssignee} count={filtered.length} />
            )}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(230px, 1fr))", gap:24 }}>
              {filtered.map(v=><VideoCard key={v.id} v={v} dedup={t.dedupCards} />)}
            </div>
            {filtered.length===0 && <div style={{ padding:"48px 0", textAlign:"center", color:"#71717a", fontSize:14 }}>No projects match these filters.</div>}
          </div>
          {/* right rail */}
          <QueueRail grouped={t.queueMode==="grouped"} />
        </div>
      </main>

      <TweaksPanel>
        <TweakSection label="In Queue (right rail)" />
        <TweakRadio label="Queue display" value={t.queueMode} options={["grouped","flat"]} onChange={v=>setTweak("queueMode", v)} />
        <TweakSection label="Explore Projects (center)" />
        <TweakToggle label="Show filter bar" value={t.showFilters} onChange={v=>setTweak("showFilters", v)} />
        <TweakToggle label="De-duplicated cards" value={t.dedupCards} onChange={v=>setTweak("dedupCards", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
