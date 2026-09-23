/* global React */
const { useState, useRef, useEffect } = React;

/* ----------------------------- icons ----------------------------- */
const FIcon = ({ d, size = 16, color = "currentColor", sw = 1.9, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{d}</svg>
);
const MsgIcon  = (p) => <FIcon {...p} d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />;
const LockIcon = (p) => <FIcon {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />;
const SendIcon = (p) => <FIcon {...p} d={<><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>} />;
const CheckIcon= (p) => <FIcon {...p} d={<path d="M20 6 9 17l-5-5"/>} />;
const XIcon    = (p) => <FIcon {...p} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />;
const ChevUp   = (p) => <FIcon {...p} d={<path d="m18 15-6-6-6 6"/>} />;
const ChevDn   = (p) => <FIcon {...p} d={<path d="m6 9 6 6 6-6"/>} />;

/* hex+alpha (local copy so this file is standalone) */
function fa(hex, a){
  const v = hex.replace("#",""); const h = v.length===3 ? v.split("").map(x=>x+x).join("") : v;
  return `rgba(${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)}, ${a})`;
}

const ACCENT = "#3B82F6";
const CATS = [
  { k:"general",  label:"General",  c:"#3B82F6", ph:"What's on your mind?" },
  { k:"bug",      label:"Bug",      c:"#f87171", ph:"What broke? Where did it happen?" },
  { k:"idea",     label:"Idea",     c:"#fbbf24", ph:"What would you add or change?" },
  { k:"friction", label:"Friction", c:"#c084fc", ph:"What slowed you down or felt clunky?" },
];
const RATING_LABELS = ["", "Rough", "Poor", "Okay", "Good", "Great"];

/* ----------------------------- Rating (5-point) ----------------------------- */
function Rating({ value, setValue }){
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:11.5, color:"#a1a1aa", fontWeight:500 }}>How's the experience?</span>
        <span style={{ marginLeft:"auto", fontSize:11.5, fontWeight:600, color: shown ? ACCENT : "#52525b", minWidth:42, textAlign:"right" }}>{RATING_LABELS[shown] || "—"}</span>
      </div>
      <div style={{ display:"flex", gap:8 }} onMouseLeave={()=>setHover(0)}>
        {[1,2,3,4,5].map(n=>{
          const on = n <= shown;
          return (
            <button key={n} type="button" aria-label={"Rate "+n}
              onMouseEnter={()=>setHover(n)} onClick={()=>setValue(n===value?0:n)}
              style={{
                flex:1, height:30, borderRadius:8, cursor:"pointer",
                background: on ? fa(ACCENT, 0.14) : "rgba(255,255,255,0.03)",
                border:`1px solid ${on ? fa(ACCENT,0.55) : "#2a2a2e"}`,
                display:"flex", alignItems:"center", justifyContent:"center", transition:"all 110ms",
              }}>
              <span style={{ width:8, height:8, borderRadius:999, background: on ? ACCENT : "#3f3f46", transition:"all 110ms" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- shared form ----------------------------- */
function FeedbackForm({ onClose, autoCloseOnSend, showHeaderLock, compact }){
  const [cat, setCat] = useState("general");
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const active = CATS.find(c=>c.k===cat);
  const canSend = rating > 0 || text.trim().length > 0;

  const submit = () => {
    if(!canSend) return;
    setSent(true);
    if(autoCloseOnSend) setTimeout(()=>{ onClose && onClose(); }, 1500);
  };
  const reset = () => { setSent(false); setCat("general"); setRating(0); setText(""); };

  if(sent){
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"22px 8px" }}>
        <div style={{ width:44, height:44, borderRadius:999, background:fa("#22c55e",0.12), border:`1px solid ${fa("#22c55e",0.4)}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <CheckIcon size={22} color="#22c55e" />
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>Thanks — that helps.</div>
          <div style={{ fontSize:12, color:"#71717a", marginTop:3 }}>Sent anonymously.</div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:2 }}>
          <button onClick={reset} style={{ padding:"7px 14px", fontSize:12, fontWeight:600, borderRadius:8, background:"rgba(255,255,255,0.05)", color:"#d4d4d8", border:"1px solid #2a2a2e", cursor:"pointer" }}>Send another</button>
          {onClose && <button onClick={onClose} style={{ padding:"7px 14px", fontSize:12, fontWeight:600, borderRadius:8, background:ACCENT, color:"#fff", border:"none", cursor:"pointer" }}>Done</button>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* category chips */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {CATS.map(c=>{
          const on = c.k===cat;
          return (
            <button key={c.k} onClick={()=>setCat(c.k)} style={{
              padding:"5px 11px", fontSize:11.5, fontWeight:600, borderRadius:999, cursor:"pointer", transition:"all 110ms",
              background: on ? fa(c.c,0.14) : "rgba(255,255,255,0.03)",
              color: on ? c.c : "#a1a1aa",
              border:`1px solid ${on ? fa(c.c,0.5) : "#2a2a2e"}`,
            }}>{c.label}</button>
          );
        })}
      </div>

      <Rating value={rating} setValue={setRating} />

      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={active.ph} rows={compact?2:3}
        style={{
          width:"100%", resize:"none", background:"rgba(255,255,255,0.03)", border:"1px solid #2a2a2e",
          borderRadius:10, padding:"10px 12px", color:"#fff", fontSize:12.5, fontFamily:"inherit", outline:"none",
          lineHeight:1.5,
        }}
        onFocus={e=>e.target.style.borderColor=fa(ACCENT,0.5)}
        onBlur={e=>e.target.style.borderColor="#2a2a2e"} />

      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:10.5, color:"#71717a" }}>
          <LockIcon size={12} /> Anonymous
        </span>
        <button onClick={submit} disabled={!canSend} style={{
          marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", fontSize:12.5, fontWeight:700,
          borderRadius:9, border:"none", cursor: canSend ? "pointer":"not-allowed",
          background: canSend ? ACCENT : "#1f1f23", color: canSend ? "#fff" : "#52525b", transition:"all 120ms",
        }}>
          <SendIcon size={14} /> Send
        </button>
      </div>
    </div>
  );
}

/* ============================ Direction A — inline rail card ============================ */
function DirectionA(){
  return (
    <div style={{ background:"#161616", border:"1px solid #27272a", borderRadius:16, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:fa(ACCENT,0.12), border:`1px solid ${fa(ACCENT,0.3)}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <MsgIcon size={15} color={ACCENT} />
        </div>
        <div style={{ lineHeight:1.25 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:"#fff" }}>Share feedback</div>
          <div style={{ fontSize:10.5, color:"#71717a" }}>Help shape the tool</div>
        </div>
      </div>
      <FeedbackForm showHeaderLock compact />
    </div>
  );
}

/* ============================ Direction B — collapsed prompt → expand ============================ */
function DirectionB(){
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background:"#161616", border:`1px solid ${open?fa(ACCENT,0.3):"#27272a"}`, borderRadius:16, overflow:"hidden", transition:"border-color 150ms" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:11, padding:"14px 16px", background:"transparent",
        border:"none", cursor:"pointer", textAlign:"left",
      }}>
        <div style={{ width:30, height:30, borderRadius:9, background:fa(ACCENT,0.12), border:`1px solid ${fa(ACCENT,0.3)}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <MsgIcon size={15} color={ACCENT} />
        </div>
        <div style={{ flex:1, minWidth:0, lineHeight:1.25 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:"#fff" }}>How are we doing?</div>
          <div style={{ fontSize:10.5, color:"#71717a" }}>{open ? "Anonymous · takes 10 seconds" : "Tap to share feedback"}</div>
        </div>
        <span style={{ color:"#71717a" }}>{open ? <ChevUp size={18}/> : <ChevDn size={18}/>}</span>
      </button>
      {open && (
        <div style={{ padding:"2px 16px 16px" }}>
          <div style={{ height:1, background:"#27272a", margin:"0 0 14px" }} />
          <FeedbackForm compact />
        </div>
      )}
    </div>
  );
}

/* ============================ Direction C — floating pill → modal ============================ */
function DirectionC(){
  const [open, setOpen] = useState(false);
  useEffect(()=>{
    const onKey = (e)=>{ if(e.key==="Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[]);
  return (
    <>
      {/* floating pill — fixed to viewport bottom-right */}
      <button onClick={()=>setOpen(true)} style={{
        position:"fixed", right:24, bottom:24, zIndex:60, display:"inline-flex", alignItems:"center", gap:9,
        padding:"12px 18px", borderRadius:999, background:ACCENT, color:"#fff", border:"1px solid rgba(255,255,255,0.15)",
        boxShadow:"0 12px 30px rgba(59,130,246,0.35)", cursor:"pointer", fontSize:13.5, fontWeight:700,
      }}>
        <MsgIcon size={16} color="#fff" /> Feedback
      </button>

      {open && (
        <div onClick={()=>setOpen(false)} style={{
          position:"fixed", inset:0, zIndex:70, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(3px)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:24,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            width:"100%", maxWidth:420, background:"#161616", border:"1px solid #27272a", borderRadius:18, padding:22,
            boxShadow:"0 30px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:11, marginBottom:18 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:fa(ACCENT,0.12), border:`1px solid ${fa(ACCENT,0.3)}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <MsgIcon size={16} color={ACCENT} />
              </div>
              <div style={{ flex:1, lineHeight:1.3 }}>
                <div style={{ fontSize:16, fontWeight:600, color:"#fff" }}>Send feedback</div>
                <div style={{ fontSize:11.5, color:"#71717a", marginTop:2 }}>Anonymous — tell us what's working and what isn't.</div>
              </div>
              <button onClick={()=>setOpen(false)} style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a2e", color:"#a1a1aa", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><XIcon size={15}/></button>
            </div>
            <FeedbackForm onClose={()=>setOpen(false)} autoCloseOnSend />
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { FeedbackForm, DirectionA, DirectionB, DirectionC, fa });
