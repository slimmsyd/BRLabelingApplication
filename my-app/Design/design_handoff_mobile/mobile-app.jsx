/* global React, IOSDevice, VIDEOS, QUEUE, hexA, fa, DirectionB, SearchIcon, PlusIcon, VideoIcon, ChevronDown, ChevronRight, LayersIcon, GearIcon, LogOutIcon, UserPlusIcon, SlidersIcon, useTweaks, TweaksPanel, TweakSection, TweakRadio */
const { useState, useMemo, useEffect } = React;

/* ----- local icons (mobile chrome) ----- */
const MI = ({ d, size=22, color="currentColor", sw=1.9, fill="none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{d}</svg>
);
const MenuI   = (p)=><MI {...p} d={<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}/>;
const GridI   = (p)=><MI {...p} d={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>}/>;
const ReviewI = (p)=><MI {...p} d={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>}/>;
const UserI   = (p)=><MI {...p} d={<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}/>;
const XI      = (p)=><MI {...p} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>}/>;
const BellI   = (p)=><MI {...p} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>}/>;

const ACCENT="#3B82F6";

/* ----- review data ----- */
const AWAIT = Array.from({length:14},(_,i)=>({ t:`Isaac Cruz v Giovanni Cabrera`, s:"NEEDS QC", r:8+(i%6), e:["Vedz Ezel","OH","ObedA"][i%3], d:"6/9/2026" }));
const DONE  = Array.from({length:16},(_,i)=>({ t:`Naoya Inoue v Marlon Tapales`, s:i%4===3?"COMPLETED":"REVIEWED", r:7+(i%5), e:["OH","ObedA",""][i%3], d:"6/9/2026" }));
const SMAP={ "NEEDS QC":"#f59e0b","REVIEWED":"#a855f7","COMPLETED":"#22c55e" };

/* ============================ project card (compact, 2-up) ============================ */
function MCard({ v }){
  return (
    <div style={{ background:"#1A1A1A", border:"1px solid #232326", borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <div style={{ position:"relative", aspectRatio:"4/3", background:`linear-gradient(135deg, ${v.hue}, #0b0c0f 78%)` }}>
        <span style={{ position:"absolute", top:7, left:7, display:"inline-flex", alignItems:"center", gap:3, padding:"2px 6px", background:fa(ACCENT,0.22), color:ACCENT, fontSize:8.5, fontWeight:700, textTransform:"uppercase", borderRadius:5, border:`1px solid ${fa(ACCENT,0.3)}` }}><VideoIcon size={8}/>{v.cams}</span>
        <span style={{ position:"absolute", top:7, right:7, padding:"2px 6px", background:"rgba(255,255,255,0.12)", color:"#fff", fontSize:8.5, fontWeight:700, borderRadius:5, border:"1px solid rgba(255,255,255,0.2)" }}>R{v.round}</span>
      </div>
      <div style={{ padding:"9px 10px 11px", display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#fff", lineHeight:1.3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", minHeight:31 }}>{v.title}</div>
        <div style={{ fontSize:9.5, color:"#71717a" }}>{v.date}</div>
        {v.assignee ? (
          <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:9.5, color:"#a1a1aa" }}><span style={{width:6,height:6,borderRadius:999,background:"#22c55e"}}/>{v.assignee}</span>
            <span style={{ fontSize:8.5, fontWeight:700, padding:"1.5px 5px", borderRadius:4, background:fa(ACCENT,0.12), color:"#60a5fa", border:`1px solid ${fa(ACCENT,0.24)}`, textTransform:"uppercase" }}>{v.status}</span>
          </div>
        ) : (
          <span style={{ alignSelf:"flex-start", fontSize:8.5, fontWeight:700, padding:"2px 6px", borderRadius:4, background:"rgba(255,255,255,0.05)", color:"#a1a1aa", border:"1px solid rgba(255,255,255,0.1)", textTransform:"uppercase" }}>UNASSIGNED</span>
        )}
      </div>
    </div>
  );
}

/* ============================ In Queue (collapsible section) ============================ */
function MQueueGroup({ event, items, defaultOpen }){
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={{ background:"#161616", border:"1px solid #27272a", borderRadius:12, overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"11px 12px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left" }}>
        <span style={{ color:"#71717a", display:"flex" }}>{open?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12.5, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{event}</div>
          <div style={{ fontSize:10, color:"#71717a", marginTop:1 }}>{items.length} rounds awaiting pickup</div>
        </div>
        <span style={{ padding:"1px 7px", fontSize:10.5, fontWeight:700, borderRadius:999, background:fa("#f59e0b",0.12), color:"#f59e0b", border:`1px solid ${fa("#f59e0b",0.24)}` }}>{items.length}</span>
      </button>
      {open && (
        <div style={{ padding:"0 12px 12px 34px", display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {items.map(q=><span key={q.id} style={{ padding:"2px 7px", fontSize:9.5, fontWeight:700, borderRadius:5, background:"rgba(255,255,255,0.05)", color:"#a1a1aa", border:"1px solid rgba(255,255,255,0.08)" }}>R{q.round}</span>)}
          </div>
          <button style={{ width:"100%", padding:"8px", fontSize:11, fontWeight:700, borderRadius:8, background:fa(ACCENT,0.10), color:"#60a5fa", border:`1px solid ${fa(ACCENT,0.22)}`, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><UserPlusIcon size={12}/>Assign all {items.length}</button>
        </div>
      )}
    </div>
  );
}

function MInQueue(){
  const [open,setOpen]=useState(true);
  const groups = useMemo(()=>{ const m={}; QUEUE.forEach(q=>{(m[q.event]=m[q.event]||[]).push(q);}); return Object.entries(m); },[]);
  return (
    <div style={{ background:"#121212", border:"1px solid #232326", borderRadius:16, overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"13px 14px", background:"transparent", border:"none", cursor:"pointer" }}>
        <h3 style={{ margin:0, fontSize:15, fontWeight:600, color:"#fff" }}>In Queue</h3>
        <span style={{ padding:"1.5px 8px", fontSize:11, fontWeight:700, borderRadius:999, background:fa("#f59e0b",0.10), color:"#f59e0b", border:`1px solid ${fa("#f59e0b",0.2)}` }}>{QUEUE.length}</span>
        <span style={{ marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:5, fontSize:10.5, color:"#71717a" }}><LayersIcon size={12}/>{groups.length} events</span>
        <span style={{ color:"#71717a", display:"flex" }}>{open?<ChevronDown size={17}/>:<ChevronRight size={17}/>}</span>
      </button>
      {open && (
        <div style={{ padding:"0 12px 14px", display:"flex", flexDirection:"column", gap:9 }}>
          {groups.map(([ev,items],i)=><MQueueGroup key={ev} event={ev} items={items} defaultOpen={i===0}/>)}
        </div>
      )}
    </div>
  );
}

/* ============================ chips / filter ============================ */
function FilterChips({ status, setStatus }){
  const segs=["All","Unassigned","In Progress"];
  return (
    <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"0 16px 2px", WebkitOverflowScrolling:"touch" }} className="nobar">
      <div style={{ display:"flex", alignItems:"center", color:"#71717a", paddingRight:2 }}><SlidersIcon size={15}/></div>
      {segs.map(s=>(
        <button key={s} onClick={()=>setStatus(s)} style={{ flexShrink:0, padding:"7px 14px", fontSize:12.5, fontWeight:600, borderRadius:999, cursor:"pointer", border:`1px solid ${status===s?fa(ACCENT,0.5):"#27272a"}`, background:status===s?fa(ACCENT,0.12):"#161616", color:status===s?"#fff":"#a1a1aa", whiteSpace:"nowrap" }}>{s}</button>
      ))}
      <button style={{ flexShrink:0, display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", fontSize:12.5, fontWeight:600, borderRadius:999, border:"1px solid #27272a", background:"#161616", color:"#a1a1aa", whiteSpace:"nowrap" }}>Assignee: Anyone <ChevronDown size={13}/></button>
    </div>
  );
}

/* ============================ screens ============================ */
function ProjectsScreen({ status, setStatus }){
  const cards = VIDEOS.filter(v=>v.assignee).filter(v=>{
    if(status==="Unassigned") return false; return true;
  });
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, paddingTop:6 }}>
      <FilterChips status={status} setStatus={setStatus}/>
      <div style={{ padding:"0 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {cards.map(v=><MCard key={v.id} v={v}/>)}
      </div>
      <div style={{ padding:"0 16px" }}><MInQueue/></div>
      <div style={{ padding:"0 16px" }}><DirectionB/></div>
    </div>
  );
}

function MReviewRow({ it }){
  const c=SMAP[it.s];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"12px 16px", borderBottom:"1px solid #1c1c1f" }}>
      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
        <VideoIcon size={15} color={c}/>
        <span style={{ fontSize:13.5, fontWeight:500, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{it.t}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:7, paddingLeft:24 }}>
        <span style={{ padding:"2px 7px", fontSize:9.5, fontWeight:700, borderRadius:5, background:fa(c,0.10), color:c, border:`1px solid ${fa(c,0.22)}`, textTransform:"uppercase" }}>{it.s}</span>
        <span style={{ padding:"2px 7px", fontSize:9.5, fontWeight:700, borderRadius:5, background:fa(ACCENT,0.10), color:"#60a5fa", border:`1px solid ${fa(ACCENT,0.22)}` }}>R{it.r}</span>
        {it.e && <span style={{ fontSize:10, color:"#a1a1aa" }}>{it.e}</span>}
        <span style={{ marginLeft:"auto", fontSize:10, color:"#71717a" }}>{it.d}</span>
      </div>
    </div>
  );
}
function ReviewScreen(){
  const [tab,setTab]=useState("await");
  const list = tab==="await"?AWAIT:DONE;
  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"8px 16px 14px", display:"flex", gap:6, background:"#0e0e0e", position:"sticky", top:0, zIndex:5 }}>
        {[["await","Awaiting QC",184,"#f59e0b"],["done","QC Complete",496,"#22c55e"]].map(([k,label,n,c])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px", fontSize:12.5, fontWeight:600, borderRadius:10, cursor:"pointer", border:`1px solid ${tab===k?fa(c,0.45):"#27272a"}`, background:tab===k?fa(c,0.10):"#161616", color:tab===k?"#fff":"#a1a1aa" }}>
            {label}<span style={{ padding:"1px 7px", fontSize:10, fontWeight:700, borderRadius:999, background:fa(c,0.15), color:c }}>{n}</span>
          </button>
        ))}
      </div>
      <div>{list.map((it,i)=><MReviewRow key={i} it={it}/>)}</div>
    </div>
  );
}

function AccountScreen(){
  const Row=({icon,label,danger})=>(
    <div style={{ display:"flex", alignItems:"center", gap:13, padding:"15px 16px", borderBottom:"1px solid #1c1c1f", color:danger?"#f87171":"#e4e4e7", fontSize:14.5 }}>
      {icon}<span style={{flex:1}}>{label}</span><ChevronRight size={17} color="#52525b"/>
    </div>
  );
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"22px 16px" }}>
        <div style={{ width:54, height:54, borderRadius:999, background:fa(ACCENT,0.15), border:`1px solid ${fa(ACCENT,0.35)}`, display:"flex", alignItems:"center", justifyContent:"center", color:ACCENT, fontSize:20, fontWeight:700 }}>S</div>
        <div><div style={{ fontSize:16, fontWeight:600, color:"#fff" }}>syd</div><div style={{ fontSize:12.5, color:"#71717a" }}>syd@boxraw.com</div></div>
      </div>
      <Row icon={<BellI size={19} color="#a1a1aa"/>} label="Notifications"/>
      <Row icon={<GearIcon size={19} color="#a1a1aa"/>} label="Settings"/>
      <Row icon={<LogOutIcon size={19} color="#a1a1aa"/>} label="Log out" danger/>
    </div>
  );
}

/* ============================ chrome ============================ */
const TABS=[["projects","Projects",GridI],["review","Review",ReviewI],["account","Account",UserI]];
const TITLES={ projects:"Explore Projects", review:"Review", account:"Account" };

function Header({ nav, tab, onMenu }){
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"4px 16px 12px" }}>
      {nav==="drawer" && <button onClick={onMenu} style={{ background:"none", border:"none", color:"#fff", cursor:"pointer", display:"flex", padding:0 }}><MenuI size={23}/></button>}
      <h1 style={{ margin:0, fontSize:24, fontWeight:600, color:"#fff", letterSpacing:"-0.02em", flex:1 }}>{TITLES[tab]}</h1>
      <button style={{ width:38, height:38, borderRadius:999, background:"#161616", border:"1px solid #27272a", color:"#a1a1aa", display:"flex", alignItems:"center", justifyContent:"center" }}><SearchIcon size={17}/></button>
      {nav==="tabs" && <div style={{ width:38, height:38, borderRadius:999, background:fa(ACCENT,0.15), border:`1px solid ${fa(ACCENT,0.35)}`, display:"flex", alignItems:"center", justifyContent:"center", color:ACCENT, fontWeight:700, fontSize:15 }}>S</div>}
    </div>
  );
}

function TabBar({ tab, setTab }){
  return (
    <div style={{ flexShrink:0, display:"flex", borderTop:"1px solid #1c1c1f", background:"rgba(14,14,14,0.96)", backdropFilter:"blur(10px)", paddingBottom:22 }}>
      {TABS.map(([k,label,Icon])=>{
        const on=tab===k;
        return (
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"10px 0 6px", background:"none", border:"none", cursor:"pointer", color:on?ACCENT:"#71717a" }}>
            <Icon size={22} color={on?ACCENT:"#71717a"} sw={on?2.1:1.8}/>
            <span style={{ fontSize:10.5, fontWeight:on?700:500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Drawer({ open, tab, setTab, onClose }){
  return (
    <>
      <div onClick={onClose} style={{ position:"absolute", inset:0, zIndex:40, background:"rgba(0,0,0,0.5)", opacity:open?1:0, pointerEvents:open?"auto":"none", transition:"opacity 200ms" }}/>
      <div style={{ position:"absolute", top:0, bottom:0, left:0, width:286, zIndex:41, background:"#121212", borderRight:"1px solid #27272a", transform:open?"translateX(0)":"translateX(-100%)", transition:"transform 240ms cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", paddingTop:58 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 18px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:11 }}>
            <div style={{ width:40, height:40, borderRadius:999, background:fa(ACCENT,0.15), border:`1px solid ${fa(ACCENT,0.35)}`, display:"flex", alignItems:"center", justifyContent:"center", color:ACCENT, fontWeight:700 }}>S</div>
            <div><div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>syd</div><div style={{ fontSize:11, color:"#71717a" }}>syd@boxraw.com</div></div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#71717a", display:"flex" }}><XI size={20}/></button>
        </div>
        <div style={{ padding:"6px 12px", display:"flex", flexDirection:"column", gap:2 }}>
          {TABS.map(([k,label,Icon])=>{
            const on=tab===k;
            return (
              <button key={k} onClick={()=>{setTab(k);onClose();}} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 12px", borderRadius:10, background:on?fa(ACCENT,0.12):"transparent", border:"none", cursor:"pointer", color:on?"#fff":"#a1a1aa", fontSize:14.5, fontWeight:on?600:500 }}>
                <Icon size={20} color={on?ACCENT:"#a1a1aa"}/>{label}
              </button>
            );
          })}
        </div>
        <div style={{ margin:"8px 18px", height:1, background:"#27272a" }}/>
        <div style={{ padding:"0 18px", display:"flex", flexDirection:"column", gap:11 }}>
          <div style={{ fontSize:10.5, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.07em" }}>Your work</div>
          {[["Awaiting QC",184,"#f59e0b"],["QC Complete",496,"#22c55e"]].map(([l,n,c])=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:7, height:7, borderRadius:999, background:c }}/>
              <span style={{ fontSize:13, color:"#d4d4d8", flex:1 }}>{l}</span>
              <span style={{ fontSize:11, fontWeight:700, color:c }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:"auto", padding:18 }}>
          <button style={{ display:"flex", alignItems:"center", gap:10, fontSize:13.5, color:"#a1a1aa", background:"none", border:"none" }}><LogOutIcon size={17}/>Log out</button>
        </div>
      </div>
    </>
  );
}

/* ============================ Phone app ============================ */
function PhoneApp({ nav }){
  const [tab,setTab]=useState("projects");
  const [status,setStatus]=useState("All");
  const [drawer,setDrawer]=useState(false);
  useEffect(()=>{ setDrawer(false); },[nav]);
  return (
    <div style={{ position:"relative", height:"100%", background:"#0e0e0e", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ height:52, flexShrink:0 }}></div>
      <Header nav={nav} tab={tab} onMenu={()=>setDrawer(true)}/>
      <div className="cscroll" style={{ flex:1, overflowY:"auto", paddingBottom: nav==="tabs"?8:24 }}>
        {tab==="projects" && <ProjectsScreen status={status} setStatus={setStatus}/>}
        {tab==="review" && <ReviewScreen/>}
        {tab==="account" && <AccountScreen/>}
      </div>

      {/* FAB upload */}
      <button style={{ position:"absolute", right:16, bottom: nav==="tabs"?92:34, zIndex:30, width:54, height:54, borderRadius:999, background:ACCENT, border:"1px solid rgba(255,255,255,0.18)", boxShadow:"0 10px 26px rgba(59,130,246,0.45)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}><PlusIcon size={24} color="#fff"/></button>

      {nav==="tabs" && <TabBar tab={tab} setTab={setTab}/>}
      {nav==="drawer" && <Drawer open={drawer} tab={tab} setTab={setTab} onClose={()=>setDrawer(false)}/>}
    </div>
  );
}

/* ============================ Root: framed + scaled ============================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{ "nav": "tabs" }/*EDITMODE-END*/;

function App(){
  const [t,setTweak]=useTweaks(TWEAK_DEFAULTS);
  const [scale,setScale]=useState(1);
  useEffect(()=>{
    const fit=()=>{ const s=Math.min((window.innerHeight-48)/874,(window.innerWidth-48)/402,1); setScale(s>0?s:1); };
    fit(); window.addEventListener("resize",fit); return ()=>window.removeEventListener("resize",fit);
  },[]);
  return (
    <div style={{ position:"fixed", inset:0, background:"#000", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
      <div style={{ transform:`scale(${scale})`, transformOrigin:"center" }}>
        <IOSDevice dark width={402} height={874}>
          <PhoneApp nav={t.nav}/>
        </IOSDevice>
      </div>
      <TweaksPanel>
        <TweakSection label="Mobile navigation"/>
        <TweakRadio label="Nav pattern" value={t.nav} options={["tabs","drawer"]} onChange={v=>setTweak("nav",v)}/>
        <div style={{ padding:"4px 2px", fontSize:11, color:"#8a8a93", lineHeight:1.55 }}>
          <b style={{color:"#c7c7cf"}}>tabs</b> — bottom tab bar (Projects · Review · Account)<br/>
          <b style={{color:"#c7c7cf"}}>drawer</b> — hamburger → slide-in menu
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
