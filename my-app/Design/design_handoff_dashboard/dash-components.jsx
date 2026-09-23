/* global React, VideoIcon, MoreIcon, UserPlusIcon, PlusIcon, SearchIcon, ChevronDown, ChevronRight, GearIcon, SlidersIcon, hexA, EDITORS */
const { useState } = React;

/* ============================ Left Sidebar (compact, improved version) ============================ */
const SIDE_ITEMS_QC = [
  { t:"Isaac Cruz v Giovanni Cabrer…", s:"NEEDS QC", r:"R10", e:"Vedz Ezel", d:"6/9/2026" },
  { t:"Isaac Cruz v Giovanni Cabrer…", s:"NEEDS QC", r:"R9", e:"OH", d:"6/9/2026" },
  { t:"Isaac Cruz v Giovanni Cabrer…", s:"NEEDS QC", r:"R7", e:"ObedA", d:"6/9/2026" },
  { t:"Isaac Cruz v Giovanni Cabrer…", s:"NEEDS QC", r:"R8", e:"OH", d:"6/9/2026" },
];
const SIDE_ITEMS_DONE = Array.from({length:9},(_,i)=>({ t:"Naoya Inoue v Marlon Tapale…", s: i%4===3?"COMPLETED":"REVIEWED", r:"R"+(7+i%5), e: ["OH","ObedA",""][i%3], d:"6/9/2026" }));

function SideRow({ it }){
  const map = { "NEEDS QC":"#f59e0b", "REVIEWED":"#a855f7", "COMPLETED":"#22c55e" };
  const c = map[it.s];
  return (
    <a href="#" onClick={e=>e.preventDefault()} style={{ textDecoration:"none", display:"flex", flexDirection:"column", gap:5, padding:"8px 10px", borderRadius:8 }}
       onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
       onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <VideoIcon size={14} color={c} />
        <span style={{ color:"#fff", fontSize:12, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{it.t}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:22 }}>
        <span style={{ padding:"1.5px 6px", fontSize:9, fontWeight:700, borderRadius:5, textTransform:"uppercase", background:hexA(c,0.10), color:c, border:`1px solid ${hexA(c,0.22)}`, whiteSpace:"nowrap" }}>{it.s}</span>
        <span style={{ padding:"1.5px 6px", fontSize:9, fontWeight:700, borderRadius:5, background:hexA("#3b82f6",0.10), color:"#60a5fa", border:`1px solid ${hexA("#3b82f6",0.22)}` }}>{it.r}</span>
        {it.e && <span style={{ fontSize:9, color:"#a1a1aa", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:64 }}>{it.e}</span>}
        <span style={{ fontSize:9, color:"#71717a", marginLeft:"auto" }}>{it.d}</span>
      </div>
    </a>
  );
}

function SideSection({ label, count, hue, items, grow }){
  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:0, flex:`${grow} 1 0`, paddingTop:14, borderTop:"1px solid #27272a" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0 10px 6px" }}>
        <span style={{ fontSize:11, fontWeight:600, color:"#71717a", textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</span>
        {count!=null && <span style={{ padding:"1px 7px", fontSize:10, fontWeight:700, borderRadius:999, background:hexA(hue,0.12), color:hue, border:`1px solid ${hexA(hue,0.24)}` }}>{count}</span>}
      </div>
      <div className="cscroll" style={{ display:"flex", flexDirection:"column", gap:1, overflowY:"auto", minHeight:0, flex:"1 1 0", paddingRight:2 }}>
        {items.map((it,i)=><SideRow key={i} it={it} />)}
      </div>
    </div>
  );
}

function Sidebar(){
  return (
    <aside style={{ width:256, height:"100vh", background:"#121212", borderRight:"1px solid #27272a", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ height:64, display:"flex", alignItems:"center", padding:"0 16px", gap:12, flexShrink:0 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:3, padding:6, cursor:"pointer", color:"#a1a1aa" }}>
          <div style={{ width:16, height:2, background:"currentColor", borderRadius:1 }}/>
          <div style={{ width:16, height:2, background:"currentColor", borderRadius:1 }}/>
          <div style={{ width:16, height:2, background:"currentColor", borderRadius:1 }}/>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:"#1E1E1E", padding:"6px 12px", borderRadius:999, border:"1px solid #27272a", color:"#a1a1aa" }}>
          <SearchIcon size={14}/>
          <input placeholder="Search projects..." style={{ background:"transparent", border:"none", outline:"none", color:"#fff", fontSize:13, width:"100%", fontFamily:"inherit" }}/>
        </div>
      </div>
      <nav style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column", gap:14, padding:"8px 12px 16px" }}>
        <div style={{ flexShrink:0 }}>
          <div style={{ padding:"0 10px 6px", fontSize:11, fontWeight:600, color:"#71717a", textTransform:"uppercase", letterSpacing:"0.07em" }}>Assigned to You</div>
          <div style={{ fontSize:12, color:"#a1a1aa", fontStyle:"italic", padding:"4px 10px" }}>No active assignments</div>
        </div>
        <SideSection label="Awaiting QC" count={184} hue="#f59e0b" items={SIDE_ITEMS_QC} grow={1} />
        <SideSection label="QC Complete" count={496} hue="#22c55e" items={SIDE_ITEMS_DONE} grow={1} />
      </nav>
      <div style={{ padding:16, flexShrink:0 }}>
        <a href="#" onClick={e=>e.preventDefault()} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:8, borderRadius:8, color:"#a1a1aa", fontSize:12, textDecoration:"none" }}>
          <span>Settings</span><GearIcon size={14}/>
        </a>
        <div style={{ paddingTop:16, marginTop:8, borderTop:"1px solid #27272a", textAlign:"center", fontSize:11, color:"#71717a", fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase" }}>Box RAW Labs</div>
      </div>
    </aside>
  );
}

/* ============================ Video Card (center) ============================ */
function VideoCard({ v, dedup }){
  const [hover, setHover] = useState(false);
  const statusColor = v.status==="IN PROGRESS" ? "#3B82F6" : null;
  return (
    <a href="#" onClick={e=>e.preventDefault()} style={{ textDecoration:"none" }}
       onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={{ background:"#1A1A1A", border:`1px solid ${hover?"#27272a":"transparent"}`, borderRadius:12, overflow:"hidden", display:"flex", flexDirection:"column", height:"100%", transition:"all 200ms" }}>
        {/* media */}
        <div style={{ position:"relative", aspectRatio:"4/3", background:"rgba(0,0,0,0.4)", padding:16 }}>
          <div style={{ width:"100%", height:"100%", borderRadius:8, overflow:"hidden", position:"relative", background:`linear-gradient(135deg, ${v.hue}, #0c0d10 75%)` }}>
            <div style={{ position:"absolute", top:8, left:8, display:"flex", gap:6, zIndex:10 }}>
              <button style={{ width:32, height:32, borderRadius:8, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", border:"1px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}><MoreIcon size={16}/></button>
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"5px 8px", background:hexA("#3B82F6",0.2), color:"#3B82F6", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", borderRadius:6, border:`1px solid ${hexA("#3B82F6",0.3)}` }}><VideoIcon size={10}/>{v.cams} {v.cams===1?"Cam":"Cams"}</span>
            </div>
            <div style={{ position:"absolute", top:8, right:8, zIndex:10 }}>
              <span style={{ padding:"5px 8px", background:"rgba(255,255,255,0.1)", color:"#fff", fontSize:10, fontWeight:700, textTransform:"uppercase", borderRadius:6, border:"1px solid rgba(255,255,255,0.2)" }}>R{v.round}</span>
            </div>
          </div>
        </div>
        {/* content */}
        <div style={{ padding:"8px 20px 20px", display:"flex", flexDirection:"column", flex:1 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:600, color: hover?"#3B82F6":"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", transition:"color 150ms" }}>{v.title}</h3>
          {!dedup && <p style={{ margin:"4px 0 0", fontSize:14, color:"#a1a1aa" }}>{v.boxer1} vs {v.boxer2}</p>}
          <div style={{ marginTop:"auto", paddingTop:12, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              <span style={{ fontSize:12, color:"#71717a" }}>{v.date}</span>
              <span style={{ fontSize:12, color:"#71717a" }}>Uploaded {v.uploaded}</span>
            </div>
            {dedup ? (
              /* de-duped: single combined assignment row */
              v.assignee ? (
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11, color:"#d4d4d8" }}>
                    <span style={{ width:7, height:7, borderRadius:999, background:"#22c55e" }}/>{v.assignee}
                  </span>
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:5, background:hexA("#3B82F6",0.12), color:"#60a5fa", border:`1px solid ${hexA("#3B82F6",0.24)}`, textTransform:"uppercase", letterSpacing:"0.04em" }}>{v.status}</span>
                </div>
              ) : (
                <span style={{ alignSelf:"flex-start", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:5, background:"rgba(255,255,255,0.05)", color:"#a1a1aa", border:"1px solid rgba(255,255,255,0.1)", textTransform:"uppercase" }}>UNASSIGNED</span>
              )
            ) : (
              /* original look: white pill + separate status pill */
              v.assignee ? (
                <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-start" }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fff", color:"#000", fontSize:10, fontWeight:700, padding:"4px 8px", borderRadius:5, textTransform:"uppercase", letterSpacing:"0.04em" }}>
                    <span style={{ width:6, height:6, borderRadius:999, background:"#22c55e" }}/>ASSIGNED: {v.assignee}
                  </span>
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5, background:hexA("#3B82F6",0.10), color:"#3B82F6", border:`1px solid ${hexA("#3B82F6",0.20)}`, textTransform:"uppercase", letterSpacing:"0.04em" }}>{v.status}</span>
                </div>
              ) : (
                <span style={{ alignSelf:"flex-start", fontSize:10, fontWeight:700, padding:"4px 8px", borderRadius:5, background:"rgba(255,255,255,0.05)", color:"#a1a1aa", border:"1px solid rgba(255,255,255,0.1)", textTransform:"uppercase" }}>UNASSIGNED</span>
              )
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

/* ============================ Filter bar (center) ============================ */
function FilterBar({ statusFilter, setStatusFilter, assignee, setAssignee, count }){
  const segments = ["All","Unassigned","In Progress"];
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, color:"#71717a" }}><SlidersIcon size={15}/></div>
      {/* status segments */}
      <div style={{ display:"flex", gap:2, background:"#1A1A1A", border:"1px solid #27272a", borderRadius:10, padding:3 }}>
        {segments.map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)} style={{
            padding:"6px 14px", fontSize:12.5, fontWeight:500, borderRadius:7, border:"none", cursor:"pointer",
            background: statusFilter===s ? "#2a2a2e" : "transparent",
            color: statusFilter===s ? "#fff" : "#a1a1aa", transition:"all 120ms",
          }}>{s}</button>
        ))}
      </div>
      {/* assignee dropdown */}
      <div style={{ position:"relative" }}>
        <button onClick={()=>setOpen(o=>!o)} style={{
          display:"flex", alignItems:"center", gap:8, padding:"7px 12px", fontSize:12.5, fontWeight:500,
          background:"#1A1A1A", border:`1px solid ${assignee?"#3B82F6":"#27272a"}`, borderRadius:10, cursor:"pointer",
          color: assignee ? "#fff" : "#a1a1aa",
        }}>
          <span style={{ color:"#71717a", fontWeight:400 }}>Assignee:</span>{assignee || "Anyone"}
          <ChevronDown size={14} color="#71717a"/>
        </button>
        {open && (
          <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, minWidth:170, background:"#1E1E1E", border:"1px solid #27272a", borderRadius:10, padding:5, zIndex:50, boxShadow:"0 12px 30px rgba(0,0,0,0.5)" }}>
            {["Anyone", ...EDITORS].map(e=>(
              <button key={e} onClick={()=>{ setAssignee(e==="Anyone"?null:e); setOpen(false); }} style={{
                display:"block", width:"100%", textAlign:"left", padding:"7px 10px", fontSize:12.5, borderRadius:6, border:"none", cursor:"pointer",
                background: (assignee||"Anyone")===e ? hexA("#3B82F6",0.12) : "transparent",
                color: (assignee||"Anyone")===e ? "#60a5fa" : "#d4d4d8",
              }}>{e}</button>
            ))}
          </div>
        )}
      </div>
      <span style={{ marginLeft:"auto", fontSize:12.5, color:"#71717a" }}>{count} {count===1?"project":"projects"}</span>
    </div>
  );
}

Object.assign(window, { Sidebar, VideoCard, FilterBar });
