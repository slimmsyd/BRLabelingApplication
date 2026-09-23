/* global React */
// ----------------------------- icons -----------------------------
const Icon = ({ d, size = 16, color = "currentColor", sw = 1.9, fill = "none", extra }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {d}{extra}
  </svg>
);
const SearchIcon = (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />;
const PlusIcon   = (p) => <Icon {...p} d={<><path d="M5 12h14"/><path d="M12 5v14"/></>} />;
const UserPlusIcon = (p) => <Icon {...p} d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></>} />;
const MoreIcon   = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>} />;
const VideoIcon  = (p) => <Icon {...p} d={<><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></>} />;
const ChevronDown = (p) => <Icon {...p} d={<path d="m6 9 6 6 6-6"/>} />;
const ChevronRight = (p) => <Icon {...p} d={<path d="m9 18 6-6-6-6"/>} />;
const GearIcon   = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />;
const LogOutIcon = (p) => <Icon {...p} d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>} />;
const SlidersIcon = (p) => <Icon {...p} d={<><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>} />;
const LayersIcon = (p) => <Icon {...p} d={<><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></>} />;

// hex + alpha helper
function hexA(hex, a){
  const m = hex.replace("#","");
  const v = m.length === 3 ? m.split("").map(x=>x+x).join("") : m;
  const r = parseInt(v.slice(0,2),16), g = parseInt(v.slice(2,4),16), b = parseInt(v.slice(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ----------------------------- seed data -----------------------------
const EDITORS = ["OH", "ObedA", "Vedz Ezel", "Marcus", "Priya"];

// Center library — active videos (assigned IN PROGRESS, or UNASSIGNED)
const VIDEOS = [
  { id:"v1", title:"Huey Malone v Mark Andrejev - R1", boxer1:"Huey Malone", boxer2:"Mark Andrejev", round:1, cams:1, date:"Jun 5, 2026", uploaded:"Jun 8", assignee:"OH", status:"IN PROGRESS", hue:"#1d3a8a" },
  { id:"v2", title:"Isaac Cruz v Giovanni Cabrera - R12", boxer1:"Isaac Cruz", boxer2:"Giovanni Cabrera", round:12, cams:1, date:"Jul 28, 2023", uploaded:"Jun 5", assignee:"Vedz Ezel", status:"IN PROGRESS", hue:"#3a1d6e" },
  { id:"v3", title:"Isaac Cruz v Giovanni Cabrera - R11", boxer1:"Isaac Cruz", boxer2:"Giovanni Cabrera", round:11, cams:1, date:"Jul 28, 2023", uploaded:"Jun 5", assignee:"ObedA", status:"IN PROGRESS", hue:"#0e2a4a" },
  { id:"v4", title:"Keyshawn Davis v Nahir Albright - R8", boxer1:"Keyshawn Davis", boxer2:"Nahir Albright", round:8, cams:1, date:"Oct 13, 2023", uploaded:"May 26", assignee:"Vedz Ezel", status:"IN PROGRESS", hue:"#10243f" },
  { id:"v5", title:"Canelo Alvarez v Jermell Charlo - R3", boxer1:"Canelo Alvarez", boxer2:"Jermell Charlo", round:3, cams:2, date:"Sep 30, 2023", uploaded:"Jun 2", assignee:null, status:"UNASSIGNED", hue:"#2a1e10" },
  { id:"v6", title:"Gervonta Davis v Ryan Garcia - R7", boxer1:"Gervonta Davis", boxer2:"Ryan Garcia", round:7, cams:2, date:"Apr 22, 2023", uploaded:"Jun 1", assignee:"Marcus", status:"IN PROGRESS", hue:"#1a2c1a" },
  { id:"v7", title:"Naoya Inoue v Marlon Tapales - R5", boxer1:"Naoya Inoue", boxer2:"Marlon Tapales", round:5, cams:1, date:"Dec 26, 2023", uploaded:"May 30", assignee:null, status:"UNASSIGNED", hue:"#241024" },
  { id:"v8", title:"Shakur Stevenson v Edwin De Los Santos - R9", boxer1:"Shakur Stevenson", boxer2:"Edwin De Los Santos", round:9, cams:1, date:"Nov 16, 2023", uploaded:"May 28", assignee:"Priya", status:"IN PROGRESS", hue:"#102a2a" },
];

// Right rail — In Queue (unassigned, awaiting pickup). Two events to show grouping.
const QUEUE = [
  ...Array.from({length:8}, (_,i)=>({ id:"q-f"+i, boxer1:"Sebastian Fundora", boxer2:"Keith Thurman", round:i+1, hue:"#13294d", date:"Mar 30, 2024" })),
  ...Array.from({length:3}, (_,i)=>({ id:"q-b"+i, boxer1:"Dmitry Bivol", boxer2:"Lyndon Arthur", round:i+1, hue:"#0e1f3a", date:"Dec 23, 2023" })),
].map(q => ({ ...q, title:`${q.boxer1} v ${q.boxer2} - R${q.round}`, event:`${q.boxer1} vs ${q.boxer2}` }));

Object.assign(window, {
  SearchIcon, PlusIcon, UserPlusIcon, MoreIcon, VideoIcon, ChevronDown, ChevronRight,
  GearIcon, LogOutIcon, SlidersIcon, LayersIcon, hexA, EDITORS, VIDEOS, QUEUE,
});
