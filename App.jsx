import { useState, useEffect, useCallback } from "react";

const ESTADOS = ["Nuevo", "Cotizado", "Seguimiento", "Cerrado Ganado", "Cerrado Perdido"];
const ESTADO_COLORS = {
  "Nuevo":          { bg: "#1a2744", border: "#3b5bdb", text: "#748ffc", dot: "#3b5bdb" },
  "Cotizado":       { bg: "#1a2a1a", border: "#2f9e44", text: "#69db7c", dot: "#2f9e44" },
  "Seguimiento":    { bg: "#2a1f00", border: "#e67700", text: "#ffa94d", dot: "#e67700" },
  "Cerrado Ganado": { bg: "#1a2a2a", border: "#0c8599", text: "#4dabf7", dot: "#0c8599" },
  "Cerrado Perdido":{ bg: "#2a1a1a", border: "#c92a2a", text: "#ff6b6b", dot: "#c92a2a" },
};
const CANALES  = ["Formulario Web","WhatsApp","Email","Referido","LinkedIn"];
const PRODUCTOS = ["Notebooks","Servidores","Cámaras IP","UPS","Switches","Pantallas","Impresoras"];

const INIT_EJECUTIVOS = [
  { id:1, nombre:"Camila Torres",  especialidades:["Notebooks","Pantallas"],   estado:"activo",     color:"#e67700", ultimoAsignado:false },
  { id:2, nombre:"Diego Ramos",    especialidades:["Servidores","UPS"],         estado:"activo",     color:"#3b5bdb", ultimoAsignado:true  },
  { id:3, nombre:"Sofía Muñoz",    especialidades:["Cámaras IP","Switches"],    estado:"vacaciones", color:"#2f9e44", ultimoAsignado:false },
  { id:4, nombre:"Andrés Vega",    especialidades:["Notebooks","Impresoras"],   estado:"activo",     color:"#0c8599", ultimoAsignado:false },
];

const INIT_QUOTES = [
  { id:1, empresa:"Constructora Andina",  contacto:"Pedro Soto",    telefono:"+56912345678", email:"pedro@andina.cl",    canal:"WhatsApp",      producto:"Notebooks",  ejecutivo:"Camila Torres", estado:"Cerrado Ganado",  fecha_ingreso:"2026-01-15", monto:4500000,  notas:"15 unidades.",        seguimientos:[{fecha:"2026-01-18",nota:"Cliente confirmó compra.",tipo:"éxito"}] },
  { id:2, empresa:"Clínica Vitacura",     contacto:"María González", telefono:"+56987654321", email:"maria@clinica.cl",   canal:"Formulario Web",producto:"Servidores", ejecutivo:"Diego Ramos",   estado:"Seguimiento",     fecha_ingreso:"2026-02-01", monto:12000000, notas:"Servidor redundante.", seguimientos:[{fecha:"2026-02-05",nota:"Seguimiento enviado.",tipo:"neutral"}] },
  { id:3, empresa:"Retail Express",       contacto:"Juan Pérez",     telefono:"+56911112222", email:"juan@retailex.cl",   canal:"WhatsApp",      producto:"Pantallas",  ejecutivo:"Sofía Muñoz",   estado:"Cotizado",        fecha_ingreso:"2026-02-10", monto:3200000,  notas:"8 pantallas.",        seguimientos:[] },
  { id:4, empresa:"Minera Atacama",       contacto:"Roberto Díaz",   telefono:"+56933334444", email:"roberto@minera.cl",  canal:"Email",         producto:"UPS",        ejecutivo:"Andrés Vega",   estado:"Nuevo",           fecha_ingreso:"2026-02-15", monto:0,        notas:"Consulta inicial.",   seguimientos:[] },
  { id:5, empresa:"Colegio San Martín",   contacto:"Ana Rojas",      telefono:"+56955556666", email:"ana@smarcos.cl",     canal:"Referido",      producto:"Notebooks",  ejecutivo:"Camila Torres", estado:"Cerrado Perdido", fecha_ingreso:"2026-01-20", monto:2800000,  notas:"Perdimos por precio.",seguimientos:[{fecha:"2026-01-25",nota:"Eligió competidor.",tipo:"negativo"}] },
  { id:6, empresa:"Hotel Punta Arenas",   contacto:"Lucia Vera",     telefono:"+56977778888", email:"lucia@hotelpunta.cl",canal:"LinkedIn",      producto:"Cámaras IP", ejecutivo:"Diego Ramos",   estado:"Cotizado",        fecha_ingreso:"2026-02-12", monto:5600000,  notas:"Sistema vigilancia.", seguimientos:[] },
  { id:7, empresa:"Banco Central Dev",    contacto:"Carlos Muñoz",   telefono:"+56999990000", email:"carlos@bcd.cl",      canal:"Formulario Web",producto:"Switches",   ejecutivo:"Sofía Muñoz",   estado:"Seguimiento",     fecha_ingreso:"2026-02-08", monto:8900000,  notas:"Licitación pública.", seguimientos:[] },
];

const INDUSTRIAS = ["Construcción","Salud","Retail","Minería","Hotelería","Banca","Educación","Tecnología","Logística","Otro"];

const INIT_CLIENTES = [
  { id:101, empresa:"Constructora Andina",  contacto:"Pedro Soto",    rut:"76.123.456-7", telefono:"+56912345678", email:"pedro@andina.cl",    direccion:"Av. Providencia 1234, Santiago", industria:"Construcción", notas:"Cliente recurrente, buen pagador." },
  { id:102, empresa:"Clínica Vitacura",     contacto:"María González",rut:"76.987.654-3", telefono:"+56987654321", email:"maria@clinica.cl",   direccion:"Vitacura 5678, Santiago",        industria:"Salud",        notas:"Requieren factura a 30 días." },
  { id:103, empresa:"Retail Express",       contacto:"Juan Pérez",    rut:"77.111.222-0", telefono:"+56911112222", email:"juan@retailex.cl",   direccion:"Mall Plaza Norte, Huechuraba",   industria:"Retail",       notas:"" },
  { id:104, empresa:"Minera Atacama",       contacto:"Roberto Díaz",  rut:"76.333.444-1", telefono:"+56933334444", email:"roberto@minera.cl",  direccion:"Copiapó, Atacama",               industria:"Minería",      notas:"Solo reciben proveedores certificados." },
  { id:105, empresa:"Colegio San Martín",   contacto:"Ana Rojas",     rut:"65.555.666-2", telefono:"+56955556666", email:"ana@smarcos.cl",     direccion:"San Martín 910, Santiago",       industria:"Educación",    notas:"" },
  { id:106, empresa:"Hotel Punta Arenas",   contacto:"Lucia Vera",    rut:"76.777.888-3", telefono:"+56977778888", email:"lucia@hotelpunta.cl",direccion:"Av. Bulnes 443, Punta Arenas",   industria:"Hotelería",    notas:"Contactar solo por email." },
  { id:107, empresa:"Banco Central Dev",    contacto:"Carlos Muñoz",  rut:"97.004.000-5", telefono:"+56999990000", email:"carlos@bcd.cl",      direccion:"Agustinas 1180, Santiago",       industria:"Banca",        notas:"Proceso de licitación formal." },
];

// ── CREDENCIALES (Opción 1 — cambiar antes de entregar a cliente) ─────────────
const CREDENTIALS = {
  gerencia: { password: "tekfusion2026", nombre: "Gerencia" },
  ejecutivos: {
    "Camila Torres":  "camila123",
    "Diego Ramos":    "diego123",
    "Sofía Muñoz":    "sofia123",
    "Andrés Vega":    "andres123",
  }
};

// ── HOOK RESPONSIVE ───────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── ICONS ─────────────────────────────────────────────────────────────────────
const I = ({ n, s = 16 }) => {
  const d = {
    dash:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    kanban:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>,
    table:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M3 12h18M3 18h18M8 3v18M16 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
    team:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>,
    plus:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
    zap:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    x:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>,
    check:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>,
    bell:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    arrow:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
    logout:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    edit:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    mail:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    wa:      <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    up:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    clock:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    send:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>,
    shuffle: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>,
    pkg:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    drag:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>,
    palm:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
    menu:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    phone:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    users:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    upload:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
    building:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    link:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    trash:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    download:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
    search:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    cal:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    eye:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeoff:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  };
  return d[n] || null;
};

// ── GLOBAL STYLES ─────────────────────────────────────────────────────────────
const GS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#080c14;font-family:'DM Sans',sans-serif;color:#e2e8f0;-webkit-tap-highlight-color:transparent}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:#0f1623}
  ::-webkit-scrollbar-thumb{background:#2a3a5c;border-radius:2px}
  input,select,textarea,button{font-family:'DM Sans',sans-serif}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .fi{animation:fadeIn .3s ease forwards}
  .su{animation:slideUp .25s ease forwards}
`;

const fmt = n => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n > 0 ? `$${(n/1000).toFixed(0)}K` : "-";

// ── BASE COMPONENTS ───────────────────────────────────────────────────────────
const Avatar = ({ n, color, size = 32 }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:`${color}33`, border:`1px solid ${color}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:700, color, flexShrink:0 }}>{n?.[0]}</div>
);

const Badge = ({ estado }) => {
  const c = ESTADO_COLORS[estado] || ESTADO_COLORS["Nuevo"];
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:c.bg, border:`1px solid ${c.border}`, color:c.text, whiteSpace:"nowrap" }}><span style={{ width:5, height:5, borderRadius:"50%", background:c.dot }}/>{estado}</span>;
};

const Card = ({ children, style={}, onClick }) => (
  <div onClick={onClick} style={{ background:"linear-gradient(135deg,#0f1623,#111827)", border:"1px solid #1e2d47", borderRadius:12, padding:16, transition:"all .2s", cursor:onClick?"pointer":"default", ...style }}
    onMouseEnter={e=>{ if(onClick){e.currentTarget.style.border="1px solid #2a3a5c";}}}
    onMouseLeave={e=>{ if(onClick){e.currentTarget.style.border="1px solid #1e2d47";}}}
  >{children}</div>
);

const Btn = ({ children, onClick, v="primary", sz="md", icon, style={}, disabled }) => {
  const vs = { primary:{background:"linear-gradient(135deg,#3b5bdb,#2f4ac5)",color:"#fff",border:"none"}, ghost:{background:"transparent",color:"#94a3b8",border:"1px solid #1e2d47"}, danger:{background:"linear-gradient(135deg,#c92a2a,#a61e1e)",color:"#fff",border:"none"}, success:{background:"linear-gradient(135deg,#2f9e44,#237a33)",color:"#fff",border:"none"}, warn:{background:"linear-gradient(135deg,#e67700,#cc6a00)",color:"#fff",border:"none"} };
  const szs = { sm:{padding:"6px 12px",fontSize:12}, md:{padding:"9px 16px",fontSize:13}, lg:{padding:"12px 22px",fontSize:14} };
  return <button onClick={onClick} disabled={disabled} style={{ display:"inline-flex", alignItems:"center", gap:6, borderRadius:8, fontWeight:600, cursor:disabled?"not-allowed":"pointer", transition:"all .15s", opacity:disabled?.5:1, ...vs[v], ...szs[sz], ...style }}
    onMouseEnter={e=>{ if(!disabled)e.currentTarget.style.opacity=".85"; }}
    onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; }}
  >{icon&&<I n={icon} s={sz==="sm"?13:15}/>}{children}</button>;
};

const Inp = ({ label, value, onChange, type="text", placeholder, options, required }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    <label style={{ fontSize:12, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em" }}>{label}{required&&<span style={{color:"#e67700"}}> *</span>}</label>
    {options?(
      <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:"#080c14", border:"1px solid #1e2d47", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:13, outline:"none", appearance:"none" }}>
        <option value="">Seleccionar...</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    ):type==="textarea"?(
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ background:"#080c14", border:"1px solid #1e2d47", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:13, outline:"none", resize:"vertical" }}/>
    ):(
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ background:"#080c14", border:"1px solid #1e2d47", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:13, outline:"none" }}/>
    )}
  </div>
);

// ── MODAL (responsive: fullscreen en mobile) ──────────────────────────────────
const Modal = ({ title, onClose, children, width=580 }) => {
  const isMobile = useIsMobile();
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", zIndex:1000, padding:isMobile?0:20 }} onClick={e=>{ if(e.target===e.currentTarget)onClose(); }}>
      <div className={isMobile?"su":"fi"} style={{ background:"#0f1623", border:"1px solid #1e2d47", borderRadius:isMobile?"16px 16px 0 0":16, width:"100%", maxWidth:isMobile?"100%":width, maxHeight:isMobile?"92vh":"90vh", overflow:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 20px", borderBottom:"1px solid #1e2d47", position:"sticky", top:0, background:"#0f1623", zIndex:1 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, color:"#e2e8f0" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", padding:6 }}><I n="x" s={18}/></button>
        </div>
        <div style={{ padding:isMobile?16:24 }}>{children}</div>
      </div>
    </div>
  );
};

const Toast = ({ message, type, onClose }) => {
  useEffect(()=>{ const t=setTimeout(onClose,3500); return()=>clearTimeout(t); },[]);
  const colors = { success:"#2f9e44", error:"#c92a2a", info:"#3b5bdb", warn:"#e67700" };
  return <div className="fi" style={{ position:"fixed", bottom:80, right:16, zIndex:2000, background:"#0f1623", border:`1px solid ${colors[type]||colors.info}`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 4px 24px rgba(0,0,0,.4)", maxWidth:300 }}><span style={{ color:colors[type], fontSize:13, fontWeight:500 }}>{message}</span><button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", flexShrink:0 }}><I n="x" s={14}/></button></div>;
};

const Toggle = ({ value, onChange }) => (
  <div onClick={()=>onChange(!value)} style={{ width:36, height:20, borderRadius:10, background:value?"#2f9e44":"#1e2d47", border:`1px solid ${value?"#2f9e44":"#2a3a5c"}`, position:"relative", transition:"all .2s", cursor:"pointer", flexShrink:0 }}>
    <div style={{ position:"absolute", top:2, left:value?16:2, width:14, height:14, borderRadius:"50%", background:"#fff", transition:"left .2s" }}/>
  </div>
);

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
const Dashboard = ({ quotes, ejecutivos }) => {
  const isMobile = useIsMobile();
  const ganadas  = quotes.filter(q=>q.estado==="Cerrado Ganado").length;
  const perdidas = quotes.filter(q=>q.estado==="Cerrado Perdido").length;
  const enProceso= quotes.filter(q=>!["Cerrado Ganado","Cerrado Perdido"].includes(q.estado)).length;
  const montoG   = quotes.filter(q=>q.estado==="Cerrado Ganado").reduce((a,q)=>a+q.monto,0);
  const montoP   = quotes.filter(q=>["Cotizado","Seguimiento"].includes(q.estado)).reduce((a,q)=>a+q.monto,0);
  const tasa     = Math.round((ganadas/(ganadas+perdidas||1))*100);
  const byEstado = ESTADOS.map(e=>({ e, c:quotes.filter(q=>q.estado===e).length }));
  const maxC     = Math.max(...byEstado.map(x=>x.c),1);

  return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?20:24, fontWeight:800, color:"#e2e8f0" }}>Dashboard</h2>
        <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>Vista general — TekFusion</p>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {[
          { label:"Total",       value:quotes.length, sub:"cotizaciones",        color:"#3b5bdb", icon:"table" },
          { label:"En proceso",  value:enProceso,     sub:fmt(montoP),           color:"#e67700", icon:"clock" },
          { label:"Ganadas",     value:ganadas,        sub:fmt(montoG),           color:"#2f9e44", icon:"check" },
          { label:"Cierre",      value:`${tasa}%`,    sub:`${perdidas} perdidas`, color:"#0c8599", icon:"up"    },
        ].map(s=>(
          <Card key={s.label} style={{ position:"relative", overflow:"hidden", padding:"14px 16px" }}>
            <div style={{ position:"absolute", top:0, right:0, width:50, height:50, background:`${s.color}08`, borderRadius:"0 12px 0 50px" }}/>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em" }}>{s.label}</span>
                <span style={{ color:s.color, opacity:.7 }}><I n={s.icon} s={14}/></span>
              </div>
              <span style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:"#e2e8f0", lineHeight:1 }}>{s.value}</span>
              <span style={{ fontSize:11, color:"#64748b" }}>{s.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Pipeline bar */}
      <Card>
        <h4 style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, marginBottom:14, color:"#94a3b8" }}>Pipeline por Estado</h4>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {byEstado.map(({e,c})=>{
            const col=ESTADO_COLORS[e];
            return (
              <div key={e} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:11, color:"#64748b", width:isMobile?90:110, flexShrink:0 }}>{e}</span>
                <div style={{ flex:1, height:6, background:"#1e2d47", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${(c/maxC)*100}%`, height:"100%", background:col.dot, borderRadius:3, transition:"width .6s ease" }}/>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:col.text, width:20, textAlign:"right" }}>{c}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Equipo */}
      <Card>
        <h4 style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, marginBottom:14, color:"#94a3b8" }}>Performance Ejecutivos</h4>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {ejecutivos.map(ej=>{
            const ejQ=quotes.filter(q=>q.ejecutivo===ej.nombre);
            const ejG=ejQ.filter(q=>q.estado==="Cerrado Ganado");
            return (
              <div key={ej.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Avatar n={ej.nombre} color={ej.color} size={32}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:"#e2e8f0" }}>{ej.nombre.split(" ")[0]}</span>
                    {ej.estado==="vacaciones"&&<span style={{ fontSize:9, padding:"2px 6px", borderRadius:10, background:"#2a1f00", border:"1px solid #e67700", color:"#ffa94d", fontWeight:600 }}>VAC</span>}
                  </div>
                  <span style={{ fontSize:11, color:"#64748b" }}>{ejQ.length} cotiz · {ejG.length} ganadas</span>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:ej.estado==="vacaciones"?"#374151":"#69db7c" }}>{fmt(ejG.reduce((a,q)=>a+q.monto,0))}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ── KANBAN ────────────────────────────────────────────────────────────────────
const Kanban = ({ quotes, onSelectQuote, onUpdateEstado, ejecutivos }) => {
  const isMobile = useIsMobile();
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [activeCol, setActiveCol] = useState("Nuevo"); // mobile: one col at a time
  const cols = ESTADOS.slice(0,4);
  const perdidas = quotes.filter(q=>q.estado==="Cerrado Perdido");
  const getColor = n => ejecutivos.find(e=>e.nombre===n)?.color||"#64748b";

  // Mobile: show column selector + single column
  if(isMobile) return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:"#e2e8f0" }}>Pipeline</h2>
        <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>Toca una tarjeta para editar</p>
      </div>
      {/* Column tabs */}
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
        {ESTADOS.map(estado=>{
          const c=ESTADO_COLORS[estado];
          const count=quotes.filter(q=>q.estado===estado).length;
          const active=activeCol===estado;
          return (
            <button key={estado} onClick={()=>setActiveCol(estado)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:20, border:`1px solid ${active?c.dot:c.border}`, background:active?c.bg:"transparent", color:active?c.text:"#64748b", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all .2s" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:active?c.dot:"#374151" }}/>
              {estado}
              <span style={{ background:`${active?c.dot:"#374151"}33`, padding:"1px 6px", borderRadius:10 }}>{count}</span>
            </button>
          );
        })}
      </div>
      {/* Active column cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {quotes.filter(q=>q.estado===activeCol).map(q=>{
          const c=ESTADO_COLORS[activeCol];
          return (
            <div key={q.id} onClick={()=>onSelectQuote(q)} style={{ background:"#0f1623", border:`1px solid #1e2d47`, borderLeft:`3px solid ${c.dot}`, borderRadius:10, padding:14, cursor:"pointer", transition:"all .15s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <span style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{q.empresa}</span>
                {q.monto>0&&<span style={{ fontSize:13, fontWeight:700, color:"#69db7c", flexShrink:0, marginLeft:8 }}>{fmt(q.monto)}</span>}
              </div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:10 }}>{q.producto} · {q.canal}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <Avatar n={q.ejecutivo} color={getColor(q.ejecutivo)} size={22}/>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>{q.ejecutivo.split(" ")[0]}</span>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {ESTADOS.filter(e=>e!==activeCol).map(dest=>{
                    const dc=ESTADO_COLORS[dest];
                    return (
                      <button key={dest} onClick={e=>{ e.stopPropagation(); onUpdateEstado(q.id,dest); }} style={{ fontSize:9, padding:"3px 7px", borderRadius:8, border:`1px solid ${dc.border}`, background:dc.bg, color:dc.text, cursor:"pointer", fontWeight:600 }}>→ {dest.split(" ")[0]}</button>
                    );
                  })}
                </div>
              </div>
              {q.fecha_seguimiento&&(()=>{
                const dias = Math.ceil((new Date(q.fecha_seguimiento)-new Date())/(1000*60*60*24));
                const vencido = dias < 0;
                const color  = vencido?"#c92a2a":dias===0||dias===1?"#e67700":dias<=4?"#e67700":"#2f9e44";
                const bg     = vencido?"#2a1a1a":dias===0||dias===1?"#2a1f00":"#1a2a1a";
                const border = vencido?"#c92a2a44":dias===0||dias===1?"#e6770044":"#2f9e4444";
                const canales = q.canales_seguimiento||"";
                return (
                  <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid #1e2d4744", display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", background:bg, border:`1px solid ${border}`, borderRadius:20 }}>
                      {canales.includes("WhatsApp")&&<span style={{color:"#2f9e44"}}><I n="wa" s={11}/></span>}
                      {canales.includes("Email")&&<span style={{color:"#3b5bdb"}}><I n="mail" s={11}/></span>}
                      <span style={{ fontSize:10, fontWeight:700, color, marginLeft:2 }}>
                        {vencido?`Vencido ${Math.abs(dias)}d`:dias===0?"¡Hoy!":`${dias}d`}
                      </span>
                      <span style={{ fontSize:9, color:"#64748b", marginLeft:2 }}>{q.fecha_seguimiento.slice(5)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
        {quotes.filter(q=>q.estado===activeCol).length===0&&(
          <div style={{ border:"1px dashed #1e2d47", borderRadius:10, padding:32, textAlign:"center", color:"#374151", fontSize:13 }}>Sin oportunidades en este estado</div>
        )}
      </div>
    </div>
  );

  // Desktop: drag & drop 5 columns
  return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:"#e2e8f0" }}>Pipeline Kanban</h2>
        <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>Arrastra las tarjetas entre columnas para cambiar el estado</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        {ESTADOS.map(estado=>{
          const colQ=quotes.filter(q=>q.estado===estado);
          const c=ESTADO_COLORS[estado];
          const isDragOver=dragOverCol===estado;
          return (
            <div key={estado}
              onDragOver={e=>{ e.preventDefault(); setDragOverCol(estado); }}
              onDrop={e=>{ e.preventDefault(); if(draggingId)onUpdateEstado(draggingId,estado); setDraggingId(null); setDragOverCol(null); }}
              onDragLeave={()=>setDragOverCol(null)}
              style={{ display:"flex", flexDirection:"column", gap:10 }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:isDragOver?`${c.dot}22`:c.bg, border:`1px solid ${isDragOver?c.dot:c.border}`, borderRadius:8, transition:"all .15s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:c.dot }}/>
                  <span style={{ fontSize:12, fontWeight:700, color:c.text }}>{estado}</span>
                </div>
                <span style={{ fontSize:11, color:c.text, opacity:.7, background:`${c.dot}22`, padding:"2px 7px", borderRadius:10 }}>{colQ.length}</span>
              </div>
              {colQ.reduce((a,q)=>a+q.monto,0)>0&&<span style={{ fontSize:11, color:"#64748b", paddingLeft:4 }}>{fmt(colQ.reduce((a,q)=>a+q.monto,0))} en pipeline</span>}
              <div style={{ display:"flex", flexDirection:"column", gap:8, minHeight:100, borderRadius:8, padding:isDragOver?4:0, border:isDragOver?"2px dashed #3b5bdb44":"2px dashed transparent", transition:"all .15s" }}>
                {colQ.map(q=>(
                  <div key={q.id} draggable
                    onDragStart={e=>{ setDraggingId(q.id); e.dataTransfer.effectAllowed="move"; }}
                    onDragEnd={()=>{ setDraggingId(null); setDragOverCol(null); }}
                    onClick={()=>onSelectQuote(q)}
                    style={{ background:draggingId===q.id?"#0a0f1a":"#0f1623", border:`1px solid ${draggingId===q.id?c.dot:"#1e2d47"}`, borderLeft:`3px solid ${c.dot}`, borderRadius:10, padding:14, cursor:"grab", opacity:draggingId===q.id?.4:1, transition:"all .15s", userSelect:"none" }}
                    onMouseEnter={e=>{ if(draggingId!==q.id){e.currentTarget.style.background="#141d2e"; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 16px rgba(0,0,0,.35)";} }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="#0f1623"; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", flex:1, lineHeight:1.3 }}>{q.empresa}</span>
                      <span style={{ color:"#374151", marginLeft:6 }}><I n="drag" s={13}/></span>
                    </div>
                    <div style={{ fontSize:11, color:"#64748b", marginBottom:10 }}>{q.producto}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <Avatar n={q.ejecutivo} color={getColor(q.ejecutivo)} size={20}/>
                        <span style={{ fontSize:11, color:"#94a3b8" }}>{q.ejecutivo.split(" ")[0]}</span>
                      </div>
                      {q.monto>0&&<span style={{ fontSize:12, fontWeight:700, color:"#69db7c" }}>{fmt(q.monto)}</span>}
                    </div>
                    {q.fecha_seguimiento&&(()=>{
                      const dias = Math.ceil((new Date(q.fecha_seguimiento)-new Date())/(1000*60*60*24));
                      const vencido = dias < 0;
                      const urgente = dias === 0 || dias === 1;
                      const color = vencido ? "#c92a2a" : urgente ? "#e67700" : dias <= 4 ? "#e67700" : "#2f9e44";
                      const bg    = vencido ? "#2a1a1a" : urgente ? "#2a1f00" : "#1a2a1a";
                      const border= vencido ? "#c92a2a44" : urgente ? "#e6770044" : "#2f9e4444";
                      const canales = q.canales_seguimiento||"";
                      return (
                        <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #1e2d4744", display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", background:bg, border:`1px solid ${border}`, borderRadius:20, flex:1 }}>
                            <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                              {canales.includes("WhatsApp")&&<span style={{ color:"#2f9e44" }}><I n="wa" s={11}/></span>}
                              {canales.includes("Email")&&<span style={{ color:"#3b5bdb" }}><I n="mail" s={11}/></span>}
                            </div>
                            <span style={{ fontSize:10, fontWeight:700, color, flex:1 }}>
                              {vencido ? `Vencido ${Math.abs(dias)}d` : dias === 0 ? "¡Hoy!" : `${dias}d`}
                            </span>
                            <span style={{ fontSize:9, color:"#64748b" }}>{q.fecha_seguimiento.slice(5)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
                {colQ.length===0&&<div style={{ border:"1px dashed #1e2d47", borderRadius:10, padding:20, textAlign:"center", color:isDragOver?"#3b5bdb":"#374151", fontSize:12, background:isDragOver?"#1a274422":"transparent", transition:"all .15s" }}>{isDragOver?"↓ Soltar aquí":"Sin oportunidades"}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── TABLA / LISTA ─────────────────────────────────────────────────────────────
const Tabla = ({ quotes, onSelectQuote, ejecutivos }) => {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const getColor = n => ejecutivos.find(e=>e.nombre===n)?.color||"#64748b";
  const filtered = quotes.filter(q=>{
    const s=search.toLowerCase();
    return(!s||q.empresa.toLowerCase().includes(s)||q.contacto.toLowerCase().includes(s)||q.producto.toLowerCase().includes(s))&&(!filterEstado||q.estado===filterEstado);
  });

  const exportCSV = () => {
    const cols = ["empresa","contacto","email","telefono","canal","producto","ejecutivo","estado","monto","fecha_ingreso","notas"];
    const header = cols.join(",");
    const rows = filtered.map(q => cols.map(k => `"${String(q[k]||"").replace(/"/g,'""')}"`).join(","));
    const csv = [header,...rows].join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`cotizaciones_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  };

  return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?20:24, fontWeight:800, color:"#e2e8f0" }}>Cotizaciones</h2>
          <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>{filtered.length} resultados</p>
        </div>
        <Btn onClick={exportCSV} v="ghost" sz="sm" icon="download">Exportar CSV</Btn>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <input placeholder="🔍 Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1, minWidth:160, background:"#0f1623", border:"1px solid #1e2d47", borderRadius:8, color:"#e2e8f0", padding:"9px 14px", fontSize:13, outline:"none" }}/>
        <select value={filterEstado} onChange={e=>setFilterEstado(e.target.value)} style={{ background:"#0f1623", border:"1px solid #1e2d47", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:12, outline:"none" }}>
          <option value="">Todos</option>
          {ESTADOS.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {isMobile?(
        // Mobile: card list
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(q=>(
            <div key={q.id} onClick={()=>onSelectQuote(q)} style={{ background:"#0f1623", border:"1px solid #1e2d47", borderLeft:`3px solid ${ESTADO_COLORS[q.estado]?.dot||"#3b5bdb"}`, borderRadius:10, padding:14, cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{q.empresa}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{q.contacto} · {q.producto}</div>
                </div>
                {q.monto>0&&<span style={{ fontSize:13, fontWeight:700, color:"#69db7c", flexShrink:0, marginLeft:8 }}>{fmt(q.monto)}</span>}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <Avatar n={q.ejecutivo} color={getColor(q.ejecutivo)} size={22}/>
                  <span style={{ fontSize:11, color:"#94a3b8" }}>{q.ejecutivo.split(" ")[0]}</span>
                </div>
                <Badge estado={q.estado}/>
              </div>
            </div>
          ))}
          {filtered.length===0&&<div style={{ padding:40, textAlign:"center", color:"#374151", fontSize:13 }}>Sin resultados</div>}
        </div>
      ):(
        // Desktop: table
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #1e2d47" }}>
                  {["Empresa","Contacto","Canal","Producto","Ejecutivo","Estado","Monto","Fecha",""].map(h=>(
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(q=>(
                  <tr key={q.id} style={{ borderBottom:"1px solid #1e2d4722", cursor:"pointer", transition:"background .1s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#141d2e"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={()=>onSelectQuote(q)}
                  >
                    <td style={{ padding:"12px 16px", fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{q.empresa}</td>
                    <td style={{ padding:"12px 16px", fontSize:13, color:"#94a3b8" }}>{q.contacto}</td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:"#64748b" }}>{q.canal}</td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:"#94a3b8" }}>{q.producto}</td>
                    <td style={{ padding:"12px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <Avatar n={q.ejecutivo} color={getColor(q.ejecutivo)} size={22}/>
                        <span style={{ fontSize:12, color:"#94a3b8" }}>{q.ejecutivo.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td style={{ padding:"12px 16px" }}><Badge estado={q.estado}/></td>
                    <td style={{ padding:"12px 16px", fontSize:13, fontWeight:600, color:q.monto>0?"#69db7c":"#374151" }}>{fmt(q.monto)}</td>
                    <td style={{ padding:"12px 16px", fontSize:11, color:"#64748b" }}>{q.fecha_ingreso}</td>
                    <td style={{ padding:"12px 16px" }}><button style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", padding:4 }}><I n="edit" s={14}/></button></td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={9} style={{ padding:40, textAlign:"center", color:"#374151", fontSize:13 }}>Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// ── VISTA CALENDARIO ──────────────────────────────────────────────────────────
const Calendario = ({ quotes, onSelectQuote, ejecutivos }) => {
  const isMobile = useIsMobile();
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const getColor = n => ejecutivos.find(e=>e.nombre===n)?.color||"#64748b";
  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday-first

  // Map seguimientos by day
  const segByDay = {};
  quotes.forEach(q => {
    if(q.fecha_seguimiento) {
      const [y,m,d] = q.fecha_seguimiento.split("-").map(Number);
      if(y===year && m-1===month) {
        const key = d;
        if(!segByDay[key]) segByDay[key]=[];
        segByDay[key].push(q);
      }
    }
  });

  const todayStr = today.toISOString().split("T")[0];
  const isToday = d => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}` === todayStr;

  // Próximos seguimientos
  const proximos = quotes
    .filter(q=>q.fecha_seguimiento && q.fecha_seguimiento >= todayStr)
    .sort((a,b)=>a.fecha_seguimiento.localeCompare(b.fecha_seguimiento))
    .slice(0,8);

  const vencidos = quotes.filter(q=>q.fecha_seguimiento && q.fecha_seguimiento < todayStr && !["Cerrado Ganado","Cerrado Perdido"].includes(q.estado));

  return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?20:24, fontWeight:800, color:"#e2e8f0" }}>Calendario</h2>
          <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>Seguimientos programados</p>
        </div>
        {vencidos.length>0&&(
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:"#2a1a1a", border:"1px solid #c92a2a44", borderRadius:8 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#c92a2a", flexShrink:0 }}/>
            <span style={{ fontSize:12, color:"#ff6b6b", fontWeight:600 }}>{vencidos.length} seguimiento{vencidos.length!==1?"s":""} vencido{vencidos.length!==1?"s":""}</span>
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 320px", gap:16 }}>

        {/* Calendario */}
        <Card style={{ padding:0, overflow:"hidden" }}>
          {/* Nav mes */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", borderBottom:"1px solid #1e2d47" }}>
            <button onClick={prevMonth} style={{ background:"none", border:"1px solid #1e2d47", borderRadius:7, color:"#94a3b8", cursor:"pointer", padding:"5px 10px", fontSize:16 }}>‹</button>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:"#e2e8f0" }}>{MESES[month]} {year}</span>
            <button onClick={nextMonth} style={{ background:"none", border:"1px solid #1e2d47", borderRadius:7, color:"#94a3b8", cursor:"pointer", padding:"5px 10px", fontSize:16 }}>›</button>
          </div>

          {/* Grid */}
          <div style={{ padding:14 }}>
            {/* Day headers */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:6 }}>
              {["Lu","Ma","Mi","Ju","Vi","Sa","Do"].map(d=>(
                <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#374151", padding:"4px 0" }}>{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
              {Array.from({length:startOffset},(_,i)=>(
                <div key={`e${i}`} style={{ aspectRatio:"1", borderRadius:8 }}/>
              ))}
              {Array.from({length:daysInMonth},(_,i)=>{
                const d = i+1;
                const segs = segByDay[d]||[];
                const hoy = isToday(d);
                const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const pasado = dateStr < todayStr;
                return (
                  <div key={d} style={{ aspectRatio:"1", borderRadius:8, background:hoy?"#1a2744":segs.length>0?"#0f1623":"transparent", border:`1px solid ${hoy?"#3b5bdb":segs.length>0?"#1e2d47":"transparent"}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"4px 2px", cursor:segs.length>0?"pointer":"default", transition:"all .15s", position:"relative" }}
                    onMouseEnter={e=>{ if(segs.length>0)e.currentTarget.style.background="#141d2e"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=hoy?"#1a2744":segs.length>0?"#0f1623":"transparent"; }}
                  >
                    <span style={{ fontSize:11, fontWeight:hoy?800:400, color:hoy?"#748ffc":segs.length>0&&pasado?"#ff6b6b":segs.length>0?"#e2e8f0":"#64748b", lineHeight:1.4 }}>{d}</span>
                    {segs.length>0&&(
                      <div style={{ display:"flex", flexWrap:"wrap", gap:2, justifyContent:"center", marginTop:2 }}>
                        {segs.slice(0,3).map((q,i)=>(
                          <div key={i} onClick={()=>onSelectQuote(q)} style={{ width:6, height:6, borderRadius:"50%", background:getColor(q.ejecutivo), flexShrink:0 }} title={q.empresa}/>
                        ))}
                        {segs.length>3&&<span style={{ fontSize:8, color:"#64748b" }}>+{segs.length-3}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div style={{ padding:"10px 18px", borderTop:"1px solid #1e2d47", display:"flex", gap:16, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#64748b" }}><div style={{ width:8, height:8, borderRadius:"50%", background:"#3b5bdb" }}/> Hoy</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#64748b" }}><div style={{ width:8, height:8, borderRadius:"50%", background:"#e67700" }}/> Seguimiento pendiente</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#64748b" }}><div style={{ width:8, height:8, borderRadius:"50%", background:"#ff6b6b" }}/> Vencido</div>
          </div>
        </Card>

        {/* Panel lateral */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Vencidos */}
          {vencidos.length>0&&(
            <Card style={{ padding:14, border:"1px solid #c92a2a44" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#ff6b6b", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#c92a2a" }}/>VENCIDOS
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {vencidos.slice(0,4).map(q=>(
                  <div key={q.id} onClick={()=>onSelectQuote(q)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"#2a1a1a", borderRadius:7, cursor:"pointer", border:"1px solid #c92a2a22" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0" }}>{q.empresa}</div>
                      <div style={{ fontSize:10, color:"#ff6b6b" }}>{q.fecha_seguimiento}</div>
                    </div>
                    <Avatar n={q.ejecutivo} color={getColor(q.ejecutivo)} size={24}/>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Próximos */}
          <Card style={{ padding:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:10, textTransform:"uppercase", letterSpacing:".05em" }}>Próximos seguimientos</div>
            {proximos.length===0 ? (
              <div style={{ fontSize:12, color:"#374151", textAlign:"center", padding:"12px 0" }}>Sin seguimientos programados</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {proximos.map(q=>{
                  const dias = Math.ceil((new Date(q.fecha_seguimiento)-new Date())/(1000*60*60*24));
                  return (
                    <div key={q.id} onClick={()=>onSelectQuote(q)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"#080c14", borderRadius:7, cursor:"pointer", border:"1px solid #1e2d47", transition:"background .15s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#0f1623"}
                      onMouseLeave={e=>e.currentTarget.style.background="#080c14"}
                    >
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{q.empresa}</div>
                        <div style={{ fontSize:10, color:"#64748b", marginTop:1 }}>{q.canales_seguimiento||"—"}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, marginLeft:8 }}>
                        <Avatar n={q.ejecutivo} color={getColor(q.ejecutivo)} size={22}/>
                        <span style={{ fontSize:11, fontWeight:700, color:dias===0?"#ffa94d":dias<=2?"#ff6b6b":dias<=5?"#e67700":"#69db7c" }}>
                          {dias===0?"Hoy":`${dias}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// ── FICHA CLIENTE MODAL ───────────────────────────────────────────────────────
const FichaClienteModal = ({ cliente, onClose, onUpdate, onDelete, onNuevaCot, quotes, showToast }) => {
  const isMobile = useIsMobile();
  const [c, setC] = useState({...cliente});
  const [editMode, setEditMode] = useState(false);
  const cotizaciones = quotes.filter(q => q.empresa.toLowerCase() === cliente.empresa.toLowerCase());

  const save = () => {
    onUpdate(c);
    setEditMode(false);
    showToast("Cliente actualizado","success");
  };

  return (
    <Modal title={c.empresa} onClose={onClose} width={720}>
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

        {/* Header cliente */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"#080c14", borderRadius:10, border:"1px solid #1e2d47" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:"linear-gradient(135deg,#3b5bdb22,#2f9e4422)", border:"1px solid #2a3a5c", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I n="building" s={20}/>
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", fontFamily:"'Syne',sans-serif" }}>{c.empresa}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{c.industria} · RUT {c.rut}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={()=>setEditMode(!editMode)} v={editMode?"warn":"ghost"} sz="sm" icon="edit">{editMode?"Cancelar":"Editar"}</Btn>
            <Btn onClick={onNuevaCot} v="primary" sz="sm" icon="plus">Nueva cotiz.</Btn>
          </div>
        </div>

        {/* Datos */}
        {editMode ? (
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12 }}>
            <Inp label="Empresa"    value={c.empresa}    onChange={v=>setC(p=>({...p,empresa:v}))}/>
            <Inp label="Contacto"   value={c.contacto}   onChange={v=>setC(p=>({...p,contacto:v}))}/>
            <Inp label="Email"      value={c.email}      onChange={v=>setC(p=>({...p,email:v}))}      type="email"/>
            <Inp label="Teléfono"   value={c.telefono}   onChange={v=>setC(p=>({...p,telefono:v}))}/>
            <Inp label="RUT / NIT"  value={c.rut}        onChange={v=>setC(p=>({...p,rut:v}))}/>
            <Inp label="Industria"  value={c.industria}  onChange={v=>setC(p=>({...p,industria:v}))}  options={INDUSTRIAS}/>
            <div style={{ gridColumn:isMobile?"1":"1 / -1" }}>
              <Inp label="Dirección" value={c.direccion}  onChange={v=>setC(p=>({...p,direccion:v}))}/>
            </div>
            <div style={{ gridColumn:isMobile?"1":"1 / -1" }}>
              <Inp label="Notas"     value={c.notas}      onChange={v=>setC(p=>({...p,notas:v}))}     type="textarea"/>
            </div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10 }}>
            {[
              { label:"Contacto",  value:c.contacto,  icon:"team"  },
              { label:"Teléfono",  value:c.telefono,  icon:"phone" },
              { label:"Email",     value:c.email,     icon:"mail"  },
              { label:"RUT / NIT", value:c.rut,       icon:"edit"  },
              { label:"Industria", value:c.industria, icon:"pkg"   },
              { label:"Dirección", value:c.direccion, icon:"arrow" },
            ].map(f => f.value ? (
              <div key={f.label} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", background:"#080c14", borderRadius:8, border:"1px solid #1e2d47" }}>
                <span style={{ color:"#3b5bdb", flexShrink:0, marginTop:1 }}><I n={f.icon} s={14}/></span>
                <div>
                  <div style={{ fontSize:10, color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>{f.label}</div>
                  <div style={{ fontSize:13, color:"#e2e8f0", marginTop:2 }}>{f.value}</div>
                </div>
              </div>
            ) : null)}
            {c.notas && (
              <div style={{ gridColumn:isMobile?"1":"1 / -1", padding:"10px 12px", background:"#080c14", borderRadius:8, border:"1px solid #1e2d47" }}>
                <div style={{ fontSize:10, color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>Notas</div>
                <div style={{ fontSize:13, color:"#94a3b8" }}>{c.notas}</div>
              </div>
            )}
          </div>
        )}

        {/* Historial cotizaciones */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <h4 style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em" }}>Cotizaciones ({cotizaciones.length})</h4>
            {cotizaciones.length>0 && (
              <span style={{ fontSize:12, color:"#69db7c", fontWeight:600 }}>
                ${cotizaciones.filter(q=>q.estado==="Cerrado Ganado").reduce((a,q)=>a+q.monto,0).toLocaleString("es-CL")} ganado
              </span>
            )}
          </div>
          {cotizaciones.length===0 ? (
            <div style={{ padding:"20px", textAlign:"center", border:"1px dashed #1e2d47", borderRadius:8, color:"#374151", fontSize:13 }}>
              Sin cotizaciones aún — <span style={{ color:"#748ffc", cursor:"pointer" }} onClick={onNuevaCot}>crear una</span>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {cotizaciones.map(q => (
                <div key={q.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"#080c14", borderRadius:8, border:"1px solid #1e2d47", borderLeft:`3px solid ${ESTADO_COLORS[q.estado]?.dot||"#3b5bdb"}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{q.producto}</div>
                    <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{q.fecha_ingreso} · {q.ejecutivo.split(" ")[0]}</div>
                  </div>
                  <Badge estado={q.estado}/>
                  <span style={{ fontSize:13, fontWeight:700, color:q.monto>0?"#69db7c":"#374151", minWidth:60, textAlign:"right" }}>{fmt(q.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:4, borderTop:"1px solid #1e2d47" }}>
          <Btn onClick={()=>{ if(window.confirm(`¿Eliminar a ${c.empresa}?`)) onDelete(c.id); }} v="danger" sz="sm" icon="trash">Eliminar</Btn>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={onClose} v="ghost">Cerrar</Btn>
            {editMode && <Btn onClick={save} icon="check">Guardar</Btn>}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── IMPORTAR CSV MODAL ────────────────────────────────────────────────────────
const ImportarCSVModal = ({ onClose, onImport, showToast }) => {
  const [step, setStep] = useState("upload"); // upload | preview | done
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [mapeo, setMapeo] = useState({ empresa:"empresa", contacto:"contacto", telefono:"telefono", email:"email", producto:"producto" });
  const [headers, setHeaders] = useState([]);
  const [error, setError] = useState("");

  const parseCSV = text => {
    const lines = text.trim().split("\n").filter(l=>l.trim());
    if(lines.length<2){setError("El CSV debe tener al menos un encabezado y una fila de datos."); return;}
    const hdrs = lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,"").toLowerCase());
    setHeaders(["(ignorar)",...hdrs]);
    // Auto-detect columns
    const autoMap = {};
    ["empresa","contacto","telefono","email","producto"].forEach(k=>{
      const found = hdrs.find(h=>h.includes(k)||h.includes(k==="telefono"?"tel":k==="contacto"?"nombre":k));
      autoMap[k] = found || "(ignorar)";
    });
    setMapeo(autoMap);
    const data = lines.slice(1).map(line=>{
      const vals = line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
      const obj={};
      hdrs.forEach((h,i)=>{ obj[h]=vals[i]||""; });
      return obj;
    });
    setRows(data);
    setStep("preview");
  };

  const handleFile = e => {
    const file = e.target.files[0];
    if(!file){return;}
    if(!file.name.endsWith(".csv")){setError("Solo se aceptan archivos .csv"); return;}
    setFileName(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = ev => parseCSV(ev.target.result);
    reader.readAsText(file, "UTF-8");
  };

  const getVal = (row, campo) => mapeo[campo]==="(ignorar)" ? "" : (row[mapeo[campo]]||"");

  const confirmar = () => {
    const nuevos = rows.map((row,i) => ({
      id: Date.now()+i,
      empresa:    getVal(row,"empresa")  ||"Sin nombre",
      contacto:   getVal(row,"contacto") ||"",
      telefono:   getVal(row,"telefono") ||"",
      email:      getVal(row,"email")    ||"",
      rut:"", direccion:"", notas:"",
      industria:  "",
      _productoInteres: getVal(row,"producto")||"",
    }));
    onImport(nuevos);
    showToast(`✓ ${nuevos.length} clientes importados`,"success");
    setStep("done");
  };

  return (
    <Modal title="Importar clientes desde CSV" onClose={onClose} width={700}>
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

        {step==="upload" && (
          <>
            {/* Instrucciones */}
            <div style={{ padding:"14px 16px", background:"#080c14", border:"1px solid #1e2d47", borderRadius:10 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginBottom:8 }}>Formato esperado del CSV</div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:10 }}>El archivo debe tener encabezados en la primera fila. Columnas recomendadas:</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                {["empresa","contacto","telefono","email","producto"].map(c=>(
                  <span key={c} style={{ fontSize:11, padding:"3px 10px", background:"#1a2744", border:"1px solid #3b5bdb44", borderRadius:6, color:"#748ffc", fontFamily:"monospace" }}>{c}</span>
                ))}
              </div>
              <div style={{ fontSize:11, color:"#374151" }}>Puedes tener columnas con nombres diferentes — las mapearás en el siguiente paso.</div>
            </div>

            {/* Descargar plantilla */}
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <Btn sz="sm" v="ghost" icon="download" onClick={()=>{
                const csv = "empresa,contacto,telefono,email,producto\nEjemplo SA,Juan López,+56912345678,juan@ejemplo.cl,Notebooks";
                const blob = new Blob([csv],{type:"text/csv"});
                const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="plantilla_clientes.csv"; a.click();
              }}>Descargar plantilla</Btn>
            </div>

            {/* Drop zone */}
            <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:40, border:"2px dashed #1e2d47", borderRadius:12, cursor:"pointer", transition:"all .2s", background:"#080c14" }}
              onDragOver={e=>{e.preventDefault(); e.currentTarget.style.borderColor="#3b5bdb"; e.currentTarget.style.background="#1a274411";}}
              onDragLeave={e=>{e.currentTarget.style.borderColor="#1e2d47"; e.currentTarget.style.background="#080c14";}}
              onDrop={e=>{e.preventDefault(); e.currentTarget.style.borderColor="#1e2d47"; e.currentTarget.style.background="#080c14"; const f=e.dataTransfer.files[0]; if(f){const inp=document.createElement("input"); inp.type="file"; const dt=new DataTransfer(); dt.items.add(f); inp.files=dt.files; handleFile({target:inp});}}}
            >
              <span style={{ color:"#3b5bdb" }}><I n="upload" s={32}/></span>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>Arrastra tu CSV aquí</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>o haz clic para seleccionar</div>
              </div>
              <input type="file" accept=".csv" onChange={handleFile} style={{ display:"none" }}/>
            </label>
            {error&&<div style={{ padding:"10px 14px", background:"#2a1a1a", border:"1px solid #c92a2a44", borderRadius:8, fontSize:12, color:"#ff6b6b" }}>{error}</div>}
          </>
        )}

        {step==="preview" && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:13, color:"#94a3b8" }}><strong style={{color:"#e2e8f0"}}>{rows.length} filas</strong> encontradas en <span style={{color:"#748ffc"}}>{fileName}</span></div>
              <Btn sz="sm" v="ghost" onClick={()=>{setStep("upload");setRows([]);setHeaders([]);}} icon="arrow">Cambiar archivo</Btn>
            </div>

            {/* Mapeo de columnas */}
            <div style={{ background:"#080c14", border:"1px solid #1e2d47", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em", marginBottom:12 }}>Mapear columnas del CSV</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  {key:"empresa",  label:"Empresa"},
                  {key:"contacto", label:"Nombre contacto"},
                  {key:"telefono", label:"Teléfono"},
                  {key:"email",    label:"Email"},
                  {key:"producto", label:"Producto de interés"},
                ].map(f=>(
                  <div key={f.key} style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    <label style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em" }}>{f.label}</label>
                    <select value={mapeo[f.key]} onChange={e=>setMapeo(p=>({...p,[f.key]:e.target.value}))} style={{ background:"#0f1623", border:"1px solid #1e2d47", borderRadius:7, color:"#e2e8f0", padding:"8px 10px", fontSize:12, outline:"none" }}>
                      {headers.map(h=><option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview tabla */}
            <div style={{ border:"1px solid #1e2d47", borderRadius:10, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid #1e2d47", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em" }}>Preview (primeras 5 filas)</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"#0a0f1a" }}>
                      {["Empresa","Contacto","Teléfono","Email","Producto"].map(h=>(
                        <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:11, color:"#64748b", fontWeight:600, whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0,5).map((row,i)=>(
                      <tr key={i} style={{ borderTop:"1px solid #1e2d4722" }}>
                        <td style={{ padding:"8px 12px", fontSize:12, color:"#e2e8f0" }}>{getVal(row,"empresa")||<span style={{color:"#374151"}}>—</span>}</td>
                        <td style={{ padding:"8px 12px", fontSize:12, color:"#94a3b8" }}>{getVal(row,"contacto")||<span style={{color:"#374151"}}>—</span>}</td>
                        <td style={{ padding:"8px 12px", fontSize:12, color:"#64748b"  }}>{getVal(row,"telefono")||<span style={{color:"#374151"}}>—</span>}</td>
                        <td style={{ padding:"8px 12px", fontSize:12, color:"#64748b"  }}>{getVal(row,"email")   ||<span style={{color:"#374151"}}>—</span>}</td>
                        <td style={{ padding:"8px 12px", fontSize:12, color:"#64748b"  }}>{getVal(row,"producto")||<span style={{color:"#374151"}}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length>5&&<div style={{ padding:"8px 14px", borderTop:"1px solid #1e2d47", fontSize:11, color:"#64748b" }}>...y {rows.length-5} filas más</div>}
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, paddingTop:4, borderTop:"1px solid #1e2d47" }}>
              <Btn onClick={onClose} v="ghost">Cancelar</Btn>
              <Btn onClick={confirmar} icon="check" v="success">Importar {rows.length} clientes</Btn>
            </div>
          </>
        )}

        {step==="done" && (
          <div style={{ textAlign:"center", padding:"32px 20px" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"#1a2a1a", border:"1px solid #2f9e44", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", color:"#69db7c" }}><I n="check" s={24}/></div>
            <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", fontFamily:"'Syne',sans-serif", marginBottom:6 }}>¡Importación completada!</div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>{rows.length} clientes agregados a tu base de datos</div>
            <Btn onClick={onClose} v="primary">Ver clientes</Btn>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ── VISTA CLIENTES ────────────────────────────────────────────────────────────
const Clientes = ({ clientes, onUpdate, onDelete, onAdd, quotes, setShowNuevaCot, setShowImportar, showToast, onSelectCliente }) => {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filterIndustria, setFilterIndustria] = useState("");

  const filtered = clientes.filter(c=>{
    const s = search.toLowerCase();
    return (!s || c.empresa.toLowerCase().includes(s) || c.contacto.toLowerCase().includes(s) || c.email.toLowerCase().includes(s))
      && (!filterIndustria || c.industria===filterIndustria);
  });

  const industriasUsadas = [...new Set(clientes.map(c=>c.industria).filter(Boolean))];

  return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?20:24, fontWeight:800, color:"#e2e8f0" }}>Clientes</h2>
          <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>{filtered.length} de {clientes.length} contactos</p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <Btn onClick={()=>setShowImportar(true)} v="ghost" sz="sm" icon="upload">Importar CSV</Btn>
          <Btn onClick={()=>onAdd()} v="primary" sz="sm" icon="plus">Nuevo cliente</Btn>
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {[
          { label:"Total clientes",    val:clientes.length,                                            color:"#3b5bdb" },
          { label:"Con cotizaciones",  val:[...new Set(quotes.map(q=>q.empresa))].length,              color:"#e67700" },
          { label:"Industrias",        val:[...new Set(clientes.map(c=>c.industria).filter(Boolean))].length, color:"#2f9e44" },
        ].map(s=>(
          <div key={s.label} style={{ padding:"12px 14px", background:"#0f1623", border:"1px solid #1e2d47", borderRadius:10, textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Syne',sans-serif", color:s.color }}>{s.val}</div>
            <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <input placeholder="🔍 Buscar empresa, contacto, email..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1, minWidth:180, background:"#0f1623", border:"1px solid #1e2d47", borderRadius:8, color:"#e2e8f0", padding:"9px 14px", fontSize:13, outline:"none" }}/>
        <select value={filterIndustria} onChange={e=>setFilterIndustria(e.target.value)} style={{ background:"#0f1623", border:"1px solid #1e2d47", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:12, outline:"none" }}>
          <option value="">Todos los rubros</option>
          {industriasUsadas.map(ind=><option key={ind} value={ind}>{ind}</option>)}
        </select>
      </div>

      {/* Grid de clientes */}
      {isMobile ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(c=>{
            const cots = quotes.filter(q=>q.empresa.toLowerCase()===c.empresa.toLowerCase());
            return (
              <div key={c.id} onClick={()=>onSelectCliente(c)} style={{ background:"#0f1623", border:"1px solid #1e2d47", borderLeft:`3px solid #3b5bdb`, borderRadius:10, padding:14, cursor:"pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{c.empresa}</div>
                    <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{c.contacto}</div>
                  </div>
                  {c.industria&&<span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:"#1a2744", border:"1px solid #3b5bdb33", color:"#748ffc" }}>{c.industria}</span>}
                </div>
                <div style={{ display:"flex", gap:12, marginTop:10, fontSize:11, color:"#64748b" }}>
                  <span>{c.email}</span>
                  {cots.length>0&&<span style={{ color:"#e67700" }}>{cots.length} cotiz.</span>}
                </div>
              </div>
            );
          })}
          {filtered.length===0&&<div style={{ padding:40, textAlign:"center", color:"#374151", fontSize:13 }}>Sin resultados</div>}
        </div>
      ) : (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #1e2d47" }}>
                  {["Empresa","Contacto","Email","Teléfono","Rubro","Cotizaciones",""].map(h=>(
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c=>{
                  const cots = quotes.filter(q=>q.empresa.toLowerCase()===c.empresa.toLowerCase());
                  const ganadas = cots.filter(q=>q.estado==="Cerrado Ganado");
                  return (
                    <tr key={c.id} style={{ borderBottom:"1px solid #1e2d4722", cursor:"pointer", transition:"background .1s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#141d2e"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      onClick={()=>onSelectCliente(c)}
                    >
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{c.empresa}</div>
                        {c.rut&&<div style={{ fontSize:11, color:"#374151", marginTop:2 }}>{c.rut}</div>}
                      </td>
                      <td style={{ padding:"12px 16px", fontSize:13, color:"#94a3b8" }}>{c.contacto}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"#64748b" }}>{c.email}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"#64748b" }}>{c.telefono}</td>
                      <td style={{ padding:"12px 16px" }}>
                        {c.industria&&<span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, background:"#1a274422", border:"1px solid #3b5bdb33", color:"#748ffc" }}>{c.industria}</span>}
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        {cots.length>0 ? (
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:13, fontWeight:600, color:"#e67700" }}>{cots.length}</span>
                            {ganadas.length>0&&<span style={{ fontSize:11, color:"#69db7c" }}>{ganadas.length} ganada{ganadas.length!==1?"s":""}</span>}
                          </div>
                        ) : <span style={{ fontSize:12, color:"#374151" }}>—</span>}
                      </td>
                      <td style={{ padding:"12px 16px" }}><button style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", padding:4 }}><I n="edit" s={14}/></button></td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:"#374151", fontSize:13 }}>Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// ── PANEL EQUIPO ──────────────────────────────────────────────────────────────
const PanelEquipo = ({ ejecutivos, onUpdate, quotes, modoAsignacion, onCambiarModo, showToast }) => {
  const isMobile = useIsMobile();
  const activos = ejecutivos.filter(e=>e.estado==="activo");
  const modos = [
    { key:"roundrobin", label:"Round Robin", desc:"Rotación equitativa", icon:"shuffle" },
    { key:"producto",   label:"Por Producto", desc:"Según especialidad",  icon:"pkg"     },
    { key:"manual",     label:"Manual",       desc:"Asignación manual",   icon:"edit"    },
  ];

  const toggleVac = id => {
    const ej=ejecutivos.find(e=>e.id===id);
    const nuevo=ej.estado==="vacaciones"?"activo":"vacaciones";
    onUpdate(ejecutivos.map(e=>e.id===id?{...e,estado:nuevo}:e));
    showToast(`${ej.nombre.split(" ")[0]} ${nuevo==="vacaciones"?"🌴 en vacaciones":"✓ activo"}`,nuevo==="vacaciones"?"warn":"success");
  };

  return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?20:24, fontWeight:800, color:"#e2e8f0" }}>Equipo</h2>
        <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>{activos.length} activos · {ejecutivos.length-activos.length} en vacaciones</p>
      </div>

      {/* Modo asignación */}
      <Card>
        <h4 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, marginBottom:12, color:"#e2e8f0" }}>Modo de Asignación</h4>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:10 }}>
          {modos.map(m=>(
            <div key={m.key} onClick={()=>{ onCambiarModo(m.key); showToast(`Modo: ${m.label}`,"info"); }} style={{ border:`1px solid ${modoAsignacion===m.key?"#3b5bdb":"#1e2d47"}`, background:modoAsignacion===m.key?"#1a2744":"#080c14", borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"all .2s", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ color:modoAsignacion===m.key?"#748ffc":"#64748b" }}><I n={m.icon} s={16}/></span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:modoAsignacion===m.key?"#748ffc":"#94a3b8" }}>{m.label}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{m.desc}</div>
              </div>
              {modoAsignacion===m.key&&<span style={{ color:"#748ffc" }}><I n="check" s={14}/></span>}
            </div>
          ))}
        </div>
      </Card>

      {/* Cards ejecutivos */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
        {ejecutivos.map(ej=>{
          const ejQ=quotes.filter(q=>q.ejecutivo===ej.nombre);
          const activas=ejQ.filter(q=>!["Cerrado Ganado","Cerrado Perdido"].includes(q.estado)).length;
          const ganadas=ejQ.filter(q=>q.estado==="Cerrado Ganado").length;
          const isVac=ej.estado==="vacaciones";
          return (
            <Card key={ej.id} style={{ opacity:isVac?.75:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar n={ej.nombre} color={ej.color} size={40}/>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0", fontFamily:"'Syne',sans-serif" }}>{ej.nombre}</div>
                    {isVac?<div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}><I n="palm" s={11}/><span style={{ fontSize:11, color:"#ffa94d" }}>En vacaciones</span></div>:<span style={{ fontSize:11, color:"#64748b" }}>Activo</span>}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, color:isVac?"#ffa94d":"#69db7c" }}>{isVac?"Inactivo":"Activo"}</span>
                  <Toggle value={!isVac} onChange={()=>toggleVac(ej.id)}/>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                {[{l:"Activas",v:activas,c:"#e67700"},{l:"Ganadas",v:ganadas,c:"#2f9e44"},{l:"Total",v:ejQ.length,c:"#3b5bdb"}].map(s=>(
                  <div key={s.l} style={{ flex:1, background:"#080c14", borderRadius:8, padding:"8px 10px", textAlign:"center", border:"1px solid #1e2d47" }}>
                    <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Syne',sans-serif", color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:10, color:"#64748b" }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {ej.especialidades.map(esp=><span key={esp} style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:`${ej.color}11`, border:`1px solid ${ej.color}33`, color:ej.color }}>{esp}</span>)}
              </div>
              {isVac&&<div style={{ marginTop:10, padding:"8px 12px", background:"#2a1f0088", border:"1px solid #e6770044", borderRadius:8, fontSize:11, color:"#ffa94d" }}>⚠️ No recibirá cotizaciones nuevas</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ── FICHA MODAL ───────────────────────────────────────────────────────────────
const FichaModal = ({ quote, onClose, onUpdate, ejecutivos, showToast }) => {
  const isMobile = useIsMobile();
  const [q, setQ] = useState({...quote});
  const [seg, setSeg] = useState("");
  const [showAuto, setShowAuto] = useState(false);
  const [sentAuto, setSentAuto] = useState(null);
  const [fechaSeg, setFechaSeg] = useState(q.fecha_seguimiento||"");
  const [canalSeg, setCanalSeg] = useState({ whatsapp:true, email:true });
  const [segGuardado, setSegGuardado] = useState(!!q.fecha_seguimiento);
  const activos = ejecutivos.filter(e=>e.estado==="activo").map(e=>e.nombre);

  const addSeg = () => {
    if(!seg.trim())return;
    setQ(p=>({...p, seguimientos:[...p.seguimientos,{fecha:new Date().toISOString().split("T")[0],nota:seg,tipo:"neutral"}]}));
    setSeg(""); showToast("Seguimiento registrado","success");
  };

  const triggerAuto = label => {
    setSentAuto(label); setTimeout(()=>setSentAuto(null),3000);
    showToast(`✓ ${label} gatillado vía Make`,"success");
    setQ(p=>({...p, seguimientos:[...p.seguimientos,{fecha:new Date().toISOString().split("T")[0],nota:`[AUTO] ${label}`,tipo:"éxito"}]}));
  };

  const programarSeg = () => {
    if(!fechaSeg)return;
    if(!canalSeg.whatsapp&&!canalSeg.email){showToast("Selecciona al menos un canal","warn");return;}
    const canales=[canalSeg.whatsapp&&"WhatsApp",canalSeg.email&&"Email"].filter(Boolean).join(" + ");
    setQ(p=>({...p, fecha_seguimiento:fechaSeg, canales_seguimiento:canales, seguimientos:[...p.seguimientos,{fecha:new Date().toISOString().split("T")[0],nota:`⏰ Seguimiento programado: ${fechaSeg} vía ${canales}`,tipo:"éxito"}]}));
    setSegGuardado(true); showToast(`✓ Programado para ${fechaSeg}`,"success");
  };

  const cancelarSeg = () => {
    setQ(p=>({...p, fecha_seguimiento:null, canales_seguimiento:null, seguimientos:[...p.seguimientos,{fecha:new Date().toISOString().split("T")[0],nota:"❌ Seguimiento cancelado",tipo:"negativo"}]}));
    setFechaSeg(""); setSegGuardado(false); showToast("Seguimiento cancelado","warn");
  };

  const addDias = n => { const d=new Date(); d.setDate(d.getDate()+n); setFechaSeg(d.toISOString().split("T")[0]); setSegGuardado(false); };
  const diasRestantes = fechaSeg?Math.ceil((new Date(fechaSeg)-new Date())/(1000*60*60*24)):null;

  const autos = [
    { label:"WhatsApp al cliente", icon:"wa",   color:"#2f9e44" },
    { label:"Email de seguimiento",icon:"mail", color:"#3b5bdb" },
    { label:"Recordatorio 48h",    icon:"bell", color:"#e67700" },
    { label:"Notificar ejecutivo", icon:"send", color:"#0c8599" },
  ];

  return (
    <Modal title={q.empresa} onClose={onClose} width={700}>
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
        {/* Campos */}
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12 }}>
          <Inp label="Estado"            value={q.estado}    onChange={v=>setQ(p=>({...p,estado:v}))}    options={ESTADOS}/>
          <Inp label="Ejecutivo"         value={q.ejecutivo} onChange={v=>setQ(p=>({...p,ejecutivo:v}))} options={activos}/>
          <Inp label="Empresa"           value={q.empresa}   onChange={v=>setQ(p=>({...p,empresa:v}))}/>
          <Inp label="Contacto"          value={q.contacto}  onChange={v=>setQ(p=>({...p,contacto:v}))}/>
          <Inp label="Email"             value={q.email}     onChange={v=>setQ(p=>({...p,email:v}))}     type="email"/>
          <Inp label="Teléfono"          value={q.telefono}  onChange={v=>setQ(p=>({...p,telefono:v}))}/>
          <Inp label="Producto"          value={q.producto}  onChange={v=>setQ(p=>({...p,producto:v}))}  options={PRODUCTOS}/>
          <Inp label="Monto (CLP)"       value={q.monto}     onChange={v=>setQ(p=>({...p,monto:parseInt(v)||0}))} type="number"/>
        </div>
        <Inp label="Notas internas" value={q.notas} onChange={v=>setQ(p=>({...p,notas:v}))} type="textarea"/>

        {/* Seguimiento programado */}
        <div style={{ background:"#080c14", border:`1px solid ${segGuardado?"#2f9e44":"#1e2d47"}`, borderRadius:12, overflow:"hidden", transition:"border .2s" }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #1e2d4766", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:segGuardado?"#2f9e44":"#e67700" }}><I n="bell" s={15}/></span>
              <span style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>Seguimiento Automático</span>
              {segGuardado&&<span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:"#1a2a1a", border:"1px solid #2f9e44", color:"#69db7c", fontWeight:600 }}>ACTIVO</span>}
            </div>
            {segGuardado&&diasRestantes!==null&&(
              <span style={{ fontSize:12, color:diasRestantes<=1?"#ff6b6b":diasRestantes<=3?"#ffa94d":"#69db7c", fontWeight:600 }}>
                {diasRestantes===0?"¡Hoy!":diasRestantes<0?"Vencido":`En ${diasRestantes}d`}
              </span>
            )}
          </div>
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <label style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em" }}>Fecha</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                <input type="date" value={fechaSeg} onChange={e=>{ setFechaSeg(e.target.value); setSegGuardado(false); }} style={{ flex:1, minWidth:140, background:"#0f1623", border:"1px solid #1e2d47", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, outline:"none" }}/>
                <div style={{ display:"flex", gap:5 }}>
                  {[2,3,4,5,7].map(d=>(
                    <button key={d} onClick={()=>addDias(d)} style={{ padding:"7px 9px", borderRadius:7, border:"1px solid #1e2d47", background:"#0f1623", color:"#94a3b8", fontSize:11, fontWeight:600, cursor:"pointer" }}>+{d}d</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <label style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em" }}>Enviar por</label>
              <div style={{ display:"flex", gap:10 }}>
                {[{ key:"whatsapp",label:"WhatsApp",icon:"wa",color:"#2f9e44" },{ key:"email",label:"Email",icon:"mail",color:"#3b5bdb" }].map(c=>(
                  <div key={c.key} onClick={()=>setCanalSeg(p=>({...p,[c.key]:!p[c.key]}))} style={{ flex:1, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:9, border:`1px solid ${canalSeg[c.key]?c.color:"#1e2d47"}`, background:canalSeg[c.key]?`${c.color}11`:"#0f1623", cursor:"pointer", transition:"all .2s" }}>
                    <span style={{ color:canalSeg[c.key]?c.color:"#374151" }}><I n={c.icon} s={16}/></span>
                    <span style={{ fontSize:13, fontWeight:600, color:canalSeg[c.key]?c.color:"#64748b" }}>{c.label}</span>
                    <div style={{ marginLeft:"auto", width:16, height:16, borderRadius:"50%", border:`2px solid ${canalSeg[c.key]?c.color:"#2a3a5c"}`, background:canalSeg[c.key]?c.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>{canalSeg[c.key]&&<I n="check" s={9}/>}</div>
                  </div>
                ))}
              </div>
            </div>
            {fechaSeg&&<div className="fi" style={{ padding:"9px 12px", background:"#0f1623", borderRadius:8, border:"1px solid #1e2d47", fontSize:12, color:"#94a3b8" }}>Make enviará <strong style={{color:"#e2e8f0"}}>{[canalSeg.whatsapp&&"WhatsApp",canalSeg.email&&"Email"].filter(Boolean).join(" + ")}</strong> el <strong style={{color:"#ffa94d"}}>{fechaSeg}</strong></div>}
            <div style={{ display:"flex", gap:8 }}>
              {segGuardado?(
                <>
                  <div style={{ flex:1, padding:"9px 12px", borderRadius:8, background:"#1a2a1a", border:"1px solid #2f9e44", fontSize:12, color:"#69db7c", display:"flex", alignItems:"center", gap:6 }}><I n="check" s={13}/> {q.fecha_seguimiento} · {q.canales_seguimiento}</div>
                  <Btn onClick={cancelarSeg} v="danger" sz="sm">Cancelar</Btn>
                </>
              ):(
                <Btn onClick={programarSeg} disabled={!fechaSeg||(!canalSeg.whatsapp&&!canalSeg.email)} icon="bell" style={{ flex:1, justifyContent:"center" }}>Programar seguimiento</Btn>
              )}
            </div>
          </div>
        </div>

        {/* Historial */}
        <div>
          <h4 style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>Historial</h4>
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:160, overflowY:"auto", marginBottom:10 }}>
            {q.seguimientos.length===0&&<p style={{ color:"#374151", fontSize:12 }}>Sin seguimientos aún.</p>}
            {q.seguimientos.map((s,i)=>{ const tc={éxito:"#2f9e44",negativo:"#c92a2a",neutral:"#3b5bdb"}; return (
              <div key={i} style={{ display:"flex", gap:10, padding:"7px 12px", background:"#080c14", borderRadius:8, border:`1px solid ${tc[s.tipo]||"#1e2d47"}22` }}>
                <span style={{ fontSize:10, color:tc[s.tipo]||"#64748b", width:70, flexShrink:0, paddingTop:2 }}>{s.fecha}</span>
                <span style={{ fontSize:12, color:"#94a3b8" }}>{s.nota}</span>
              </div>
            );})}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={seg} onChange={e=>setSeg(e.target.value)} placeholder="Agregar nota..." onKeyDown={e=>e.key==="Enter"&&addSeg()} style={{ flex:1, background:"#080c14", border:"1px solid #1e2d47", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:12, outline:"none" }}/>
            <Btn onClick={addSeg} sz="sm" icon="plus">Agregar</Btn>
          </div>
        </div>

        {/* Automatizaciones */}
        <div style={{ background:"#080c14", border:"1px solid #1e2d47", borderRadius:10, overflow:"hidden" }}>
          <button onClick={()=>setShowAuto(!showAuto)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:"none", border:"none", cursor:"pointer", color:"#e2e8f0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{color:"#e67700"}}><I n="zap" s={15}/></span><span style={{ fontSize:13, fontWeight:600 }}>Enviar ahora (Make)</span></div>
            <span style={{ color:"#64748b", fontSize:18, transform:showAuto?"rotate(90deg)":"none", transition:"transform .2s" }}>›</span>
          </button>
          {showAuto&&(
            <div style={{ padding:"0 14px 14px", display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:8 }}>
              {autos.map(a=>(
                <button key={a.label} onClick={()=>triggerAuto(a.label)} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:8, cursor:"pointer", background:sentAuto===a.label?`${a.color}22`:"#0f1623", border:`1px solid ${sentAuto===a.label?a.color:"#1e2d47"}`, color:sentAuto===a.label?a.color:"#94a3b8", fontSize:12, fontWeight:500, transition:"all .2s", textAlign:"left" }}>
                  <span style={{color:a.color}}><I n={a.icon} s={13}/></span>
                  {sentAuto===a.label?"✓ Enviado":a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, paddingTop:4, borderTop:"1px solid #1e2d47" }}>
          <Btn onClick={onClose} v="ghost">Cancelar</Btn>
          <Btn onClick={()=>{ onUpdate(q); showToast("Guardado","success"); onClose(); }} icon="check">Guardar cambios</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── NUEVA COTIZACIÓN ──────────────────────────────────────────────────────────
const NuevaCotizacion = ({ onSave, onClose, ejecutivos, modoAsignacion }) => {
  const isMobile = useIsMobile();
  const activos = ejecutivos.filter(e=>e.estado==="activo");
  const getAutoEj = () => {
    if(modoAsignacion==="roundrobin"){ const idx=activos.findIndex(e=>e.ultimoAsignado); return activos[(idx+1)%activos.length]?.nombre||activos[0]?.nombre||""; }
    return "";
  };
  const [form, setForm] = useState({ empresa:"", contacto:"", telefono:"", email:"", canal:"", producto:"", ejecutivo:modoAsignacion!=="manual"?getAutoEj():"", estado:"Nuevo", monto:"", notas:"" });
  const set = k => v => setForm(p=>({...p,[k]:v}));
  const isValid = form.empresa&&form.contacto&&form.canal&&form.ejecutivo;

  return (
    <Modal title="Nueva Cotización" onClose={onClose} width={640}>
      {modoAsignacion==="roundrobin"&&form.ejecutivo&&<div style={{ marginBottom:14, padding:"10px 14px", background:"#1a274422", border:"1px solid #3b5bdb44", borderRadius:8, fontSize:12, color:"#748ffc" }}>🔄 Round Robin → <strong>{form.ejecutivo}</strong></div>}
      {modoAsignacion==="manual"&&<div style={{ marginBottom:14, padding:"10px 14px", background:"#2a1f0022", border:"1px solid #e6770044", borderRadius:8, fontSize:12, color:"#ffa94d" }}>✋ Modo manual — asigna el ejecutivo</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12 }}>
          <Inp label="Empresa"   value={form.empresa}   onChange={set("empresa")}   required/>
          <Inp label="Contacto"  value={form.contacto}  onChange={set("contacto")}  required/>
          <Inp label="Email"     value={form.email}     onChange={set("email")}     type="email"/>
          <Inp label="Teléfono"  value={form.telefono}  onChange={set("telefono")}/>
          <Inp label="Canal"     value={form.canal}     onChange={set("canal")}     options={CANALES} required/>
          <Inp label="Producto"  value={form.producto}  onChange={v=>{ set("producto")(v); if(modoAsignacion==="producto"){const ej=activos.find(e=>e.especialidades.includes(v)); if(ej)set("ejecutivo")(ej.nombre);}}} options={PRODUCTOS}/>
          <Inp label="Ejecutivo" value={form.ejecutivo} onChange={set("ejecutivo")} options={activos.map(e=>e.nombre)} required/>
          <Inp label="Monto (CLP)" value={form.monto}   onChange={set("monto")}    type="number"/>
        </div>
        <Inp label="Notas" value={form.notas} onChange={set("notas")} type="textarea"/>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, paddingTop:8, borderTop:"1px solid #1e2d47" }}>
          <Btn onClick={onClose} v="ghost">Cancelar</Btn>
          <Btn onClick={()=>{ onSave({...form,monto:parseInt(form.monto)||0,fecha_ingreso:new Date().toISOString().split("T")[0],seguimientos:[],id:Date.now()}); onClose(); }} disabled={!isValid} icon="plus">Crear</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const Login = ({ onLogin }) => {
  const isMobile = useIsMobile();
  const [sel, setSel]           = useState(null);
  const [ejSel, setEjSel]       = useState(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const intentarLogin = () => {
    setError(""); setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (sel === "gerencia") {
        if (password === CREDENTIALS.gerencia.password) {
          onLogin("gerencia", "Gerencia");
        } else {
          setError("Contraseña incorrecta"); setPassword("");
        }
      } else if (sel === "ejecutivo" && ejSel) {
        if (password === CREDENTIALS.ejecutivos[ejSel]) {
          onLogin("ejecutivo", ejSel);
        } else {
          setError("Contraseña incorrecta"); setPassword("");
        }
      }
    }, 400);
  };

  const roles = [
    { key:"gerencia",  label:"Gerencia",  desc:"Dashboard completo + gestión de equipo", icon:"up",   color:"#3b5bdb" },
    { key:"ejecutivo", label:"Ejecutivo", desc:"Mis cotizaciones asignadas",               icon:"team", color:"#2f9e44" },
  ];

  const listo = sel === "gerencia" ? password.length > 0 : (ejSel && password.length > 0);

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080c14", padding:20, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:"20%", left:"30%", width:400, height:400, background:"#3b5bdb08", borderRadius:"50%", filter:"blur(80px)" }}/>
      <div style={{ position:"absolute", bottom:"20%", right:"20%", width:300, height:300, background:"#2f9e4408", borderRadius:"50%", filter:"blur(60px)" }}/>
      <div className="fi" style={{ width:"100%", maxWidth:440, position:"relative", zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:isMobile?28:36 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:40, height:40, background:"linear-gradient(135deg,#3b5bdb,#2f9e44)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}><I n="zap" s={20}/></div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:"#e2e8f0" }}>TekFusion CRM</span>
          </div>
          <p style={{ color:"#64748b", fontSize:14 }}>Ingresa con tus credenciales</p>
        </div>

        {/* Paso 1: elegir rol */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
          {roles.map(r=>(
            <div key={r.key} onClick={()=>{ setSel(r.key); setEjSel(null); setPassword(""); setError(""); }}
              style={{ border:`1px solid ${sel===r.key?r.color:"#1e2d47"}`, background:sel===r.key?`${r.color}11`:"#0f1623", borderRadius:12, padding:"14px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:14, transition:"all .2s" }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${r.color}22`, border:`1px solid ${r.color}44`, display:"flex", alignItems:"center", justifyContent:"center", color:r.color }}><I n={r.icon} s={17}/></div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0", fontFamily:"'Syne',sans-serif" }}>{r.label}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>{r.desc}</div>
              </div>
              {sel===r.key&&<span style={{ color:r.color }}><I n="check" s={17}/></span>}
            </div>
          ))}
        </div>

        {/* Paso 2: elegir ejecutivo (si aplica) */}
        {sel==="ejecutivo"&&(
          <div className="fi" style={{ marginBottom:16 }}>
            <p style={{ fontSize:11, color:"#64748b", marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>¿Quién eres?</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {INIT_EJECUTIVOS.map(ej=>(
                <button key={ej.id} onClick={()=>{ setEjSel(ej.nombre); setPassword(""); setError(""); }}
                  style={{ background:ejSel===ej.nombre?`${ej.color}11`:"#0f1623", border:`1px solid ${ejSel===ej.nombre?ej.color:"#1e2d47"}`, borderRadius:8, padding:"10px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all .15s" }}>
                  <Avatar n={ej.nombre} color={ej.color} size={28}/>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:12, color:"#e2e8f0", fontWeight:600 }}>{ej.nombre.split(" ")[0]}</div>
                    {ej.estado==="vacaciones"
                      ? <div style={{ fontSize:10, color:"#ffa94d" }}>🌴 Vacaciones</div>
                      : <div style={{ fontSize:10, color:"#64748b" }}>Activo</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paso 3: contraseña */}
        {(sel==="gerencia" || ejSel) && (
          <div className="fi" style={{ marginBottom:16 }}>
            <p style={{ fontSize:11, color:"#64748b", marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>Contraseña</p>
            <div style={{ position:"relative" }}>
              <input
                type={showPw?"text":"password"}
                value={password}
                onChange={e=>{ setPassword(e.target.value); setError(""); }}
                onKeyDown={e=>e.key==="Enter"&&listo&&intentarLogin()}
                placeholder="Ingresa tu contraseña"
                autoFocus
                style={{ width:"100%", background:"#0f1623", border:`1px solid ${error?"#c92a2a":"#1e2d47"}`, borderRadius:8, color:"#e2e8f0", padding:"11px 42px 11px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}
              />
              <button onClick={()=>setShowPw(!showPw)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#64748b", cursor:"pointer", padding:2 }}>
                <I n={showPw?"eyeoff":"eye"} s={16}/>
              </button>
            </div>
            {error&&<p style={{ fontSize:12, color:"#ff6b6b", marginTop:6 }}>⚠ {error}</p>}
          </div>
        )}

        {/* Botón ingresar */}
        {listo&&(
          <Btn onClick={intentarLogin} disabled={loading} style={{ width:"100%", justifyContent:"center" }} sz="lg" icon={loading?"clock":"arrow"}>
            {loading?"Verificando...":"Ingresar"}
          </Btn>
        )}
      </div>
    </div>
  );
};

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [user, setUser] = useState(null);
  const [quotes, setQuotes] = useState(INIT_QUOTES);
  const [ejecutivos, setEjecutivos] = useState(INIT_EJECUTIVOS);
  const [clientes, setClientes] = useState(INIT_CLIENTES);
  const [view, setView] = useState("dashboard");
  const [selectedQ, setSelectedQ] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showNueva, setShowNueva] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [toast, setToast] = useState(null);
  const [modo, setModo] = useState("roundrobin");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  const showToast = useCallback((msg,type="info")=>setToast({msg,type,id:Date.now()}),[]);
  const updateQ = q => setQuotes(p=>p.map(x=>x.id===q.id?q:x));
  const updateEstado = (id,estado) => { setQuotes(p=>p.map(q=>q.id===id?{...q,estado}:q)); showToast(`Movido a "${estado}"`,"success"); };
  const addQ = q => { setQuotes(p=>[...p,q]); showToast("Cotización creada","success"); };
  const myQ = user?.role==="ejecutivo"?quotes.filter(q=>q.ejecutivo===user.nombre):quotes;

  const addCliente = (c) => {
    const nuevo = { id:Date.now(), empresa:"", contacto:"", telefono:"", email:"", rut:"", direccion:"", industria:"", notas:"", ...c };
    setClientes(p=>[...p, nuevo]);
    setSelectedCliente(nuevo);
    showToast("Cliente creado","success");
  };
  const updateCliente = c => { setClientes(p=>p.map(x=>x.id===c.id?c:x)); setSelectedCliente(null); };
  const deleteCliente = id => { setClientes(p=>p.filter(c=>c.id!==id)); setSelectedCliente(null); showToast("Cliente eliminado","warn"); };
  const importClientes = nuevos => {
    setClientes(p=>{
      const existentes = new Set(p.map(c=>c.empresa.toLowerCase()));
      const filtrados = nuevos.filter(c=>!existentes.has(c.empresa.toLowerCase()));
      return [...p,...filtrados];
    });
  };

  if(!user) return (
    <><style>{GS}</style><Login onLogin={(role,nombre)=>setUser({role,nombre})}/>{toast&&<Toast key={toast.id} message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}</>
  );

  const nav = [
    { key:"dashboard",  label:"Dashboard", icon:"dash"   },
    { key:"kanban",     label:"Pipeline",  icon:"kanban" },
    { key:"tabla",      label:"Lista",     icon:"table"  },
    { key:"clientes",   label:"Clientes",  icon:"users"  },
    ...(user.role==="gerencia"?[{ key:"equipo", label:"Equipo", icon:"team" }]:[]),
  ];

  return (
    <>
      <style>{GS}</style>
      <div style={{ display:"flex", minHeight:"100vh", background:"#080c14" }}>

        {/* ── DESKTOP SIDEBAR ── */}
        {!isMobile&&(
          <div style={{ width:220, flexShrink:0, background:"#0a0f1a", borderRight:"1px solid #1e2d47", display:"flex", flexDirection:"column", padding:"24px 0", position:"sticky", top:0, height:"100vh" }}>
            <div style={{ padding:"0 20px 20px", borderBottom:"1px solid #1e2d47" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:30, height:30, background:"linear-gradient(135deg,#3b5bdb,#2f9e44)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}><I n="zap" s={14}/></div>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:"#e2e8f0" }}>TekFusion</span>
              </div>
              {user.role==="gerencia"&&<div style={{ marginTop:10, padding:"4px 8px", background:"#1a274422", border:"1px solid #2a3a5c", borderRadius:6, fontSize:10, color:"#748ffc" }}>🔄 {modo==="roundrobin"?"Round Robin":modo==="producto"?"Por Producto":"Manual"}</div>}
            </div>
            <nav style={{ flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:4 }}>
              {nav.map(item=>(
                <button key={item.key} onClick={()=>setView(item.key)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, cursor:"pointer", background:view===item.key?"#1a2744":"transparent", border:view===item.key?"1px solid #2a3a5c":"1px solid transparent", color:view===item.key?"#748ffc":"#64748b", fontSize:13, fontWeight:view===item.key?600:400, transition:"all .15s", textAlign:"left" }}
                  onMouseEnter={e=>{ if(view!==item.key){e.currentTarget.style.color="#94a3b8"; e.currentTarget.style.background="#0f1623";}}}
                  onMouseLeave={e=>{ if(view!==item.key){e.currentTarget.style.color="#64748b"; e.currentTarget.style.background="transparent";}}}
                ><I n={item.icon} s={16}/>{item.label}</button>
              ))}
            </nav>
            <div style={{ padding:"16px 12px", borderTop:"1px solid #1e2d47" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:8 }}>
                <Avatar n={user.nombre||"G"} color="#3b5bdb" size={30}/>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0" }}>{user.nombre?.split(" ")[0]||"Gerencia"}</div>
                  <div style={{ fontSize:10, color:"#64748b", textTransform:"capitalize" }}>{user.role}</div>
                </div>
              </div>
              <button onClick={()=>setUser(null)} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", borderRadius:8, cursor:"pointer", background:"transparent", border:"1px solid transparent", color:"#64748b", fontSize:12, width:"100%", transition:"all .15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.color="#ff6b6b"; e.currentTarget.style.background="#2a1a1a"; }}
                onMouseLeave={e=>{ e.currentTarget.style.color="#64748b"; e.currentTarget.style.background="transparent"; }}
              ><I n="logout" s={14}/>Cerrar sesión</button>
            </div>
          </div>
        )}

        {/* ── MAIN ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

          {/* Header */}
          <div style={{ padding:isMobile?"12px 16px":"14px 28px", borderBottom:"1px solid #1e2d47", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, background:"#0a0f1a", position:"sticky", top:0, zIndex:100 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
              {isMobile&&(
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:26, height:26, background:"linear-gradient(135deg,#3b5bdb,#2f9e44)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}><I n="zap" s={12}/></div>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"#e2e8f0" }}>TekFusion</span>
                </div>
              )}
              {/* Búsqueda global */}
              <div style={{ position:"relative", flex:1, maxWidth:isMobile?160:360 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"#0f1623", border:"1px solid #1e2d47", borderRadius:8, padding:"7px 12px" }}>
                  <span style={{ color:"#64748b", flexShrink:0 }}><I n="search" s={14}/></span>
                  <input
                    value={globalSearch}
                    onChange={e=>{ setGlobalSearch(e.target.value); setShowGlobalSearch(e.target.value.length>0); }}
                    onBlur={()=>setTimeout(()=>setShowGlobalSearch(false),200)}
                    onFocus={()=>{ if(globalSearch.length>0)setShowGlobalSearch(true); }}
                    placeholder={isMobile?"Buscar...":"Buscar empresa, contacto..."}
                    style={{ background:"none", border:"none", outline:"none", color:"#e2e8f0", fontSize:12, width:"100%", minWidth:0 }}
                  />
                  {globalSearch&&<button onClick={()=>{setGlobalSearch("");setShowGlobalSearch(false);}} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", flexShrink:0, padding:0 }}><I n="x" s={12}/></button>}
                </div>
                {showGlobalSearch&&(()=>{
                  const s = globalSearch.toLowerCase();
                  const resultados = myQ.filter(q=>q.empresa.toLowerCase().includes(s)||q.contacto.toLowerCase().includes(s)||q.producto.toLowerCase().includes(s)).slice(0,6);
                  return resultados.length>0 ? (
                    <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#0f1623", border:"1px solid #1e2d47", borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,.5)", zIndex:200, overflow:"hidden" }}>
                      {resultados.map(q=>(
                        <div key={q.id} onClick={()=>{ setSelectedQ(q); setGlobalSearch(""); setShowGlobalSearch(false); }} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid #1e2d4422", transition:"background .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#141d2e"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        >
                          <div>
                            <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0" }}>{q.empresa}</div>
                            <div style={{ fontSize:11, color:"#64748b" }}>{q.contacto} · {q.producto}</div>
                          </div>
                          <Badge estado={q.estado}/>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#0f1623", border:"1px solid #1e2d47", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#374151", zIndex:200 }}>Sin resultados</div>
                  );
                })()}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <Btn onClick={()=>setShowNueva(true)} icon="plus" sz="sm">{isMobile?"Nueva":"Nueva cotización"}</Btn>
              {isMobile&&(
                <button onClick={()=>setUser(null)} style={{ background:"none", border:"1px solid #1e2d47", borderRadius:8, color:"#64748b", cursor:"pointer", padding:"6px 8px", display:"flex", alignItems:"center" }}>
                  <I n="logout" s={15}/>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex:1, padding:isMobile?"14px 14px 100px":"28px", overflowY:"auto" }}>
            {view==="dashboard" &&<Dashboard quotes={myQ} ejecutivos={ejecutivos}/>}
            {view==="kanban"    &&<Kanban quotes={myQ} onSelectQuote={setSelectedQ} onUpdateEstado={updateEstado} ejecutivos={ejecutivos}/>}
            {view==="tabla"     &&<Tabla quotes={myQ} onSelectQuote={setSelectedQ} ejecutivos={ejecutivos}/>}
            {view==="clientes"  &&<Clientes clientes={clientes} onUpdate={updateCliente} onDelete={deleteCliente} onAdd={addCliente} quotes={quotes} setShowNuevaCot={()=>setShowNueva(true)} setShowImportar={setShowImportar} showToast={showToast} onSelectCliente={setSelectedCliente}/>}
            {view==="equipo"    &&user.role==="gerencia"&&<PanelEquipo ejecutivos={ejecutivos} onUpdate={setEjecutivos} quotes={quotes} modoAsignacion={modo} onCambiarModo={setModo} showToast={showToast}/>}
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile&&(
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#0a0f1a", borderTop:"1px solid #1e2d47", display:"flex", zIndex:200, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
          {nav.map(item=>(
            <button key={item.key} onClick={()=>setView(item.key)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 4px", background:"none", border:"none", cursor:"pointer", color:view===item.key?"#748ffc":"#64748b", transition:"color .15s" }}>
              <I n={item.icon} s={20}/>
              <span style={{ fontSize:10, fontWeight:view===item.key?700:400 }}>{item.label}</span>
              {view===item.key&&<div style={{ position:"absolute", bottom:0, width:24, height:2, background:"#748ffc", borderRadius:1 }}/>}
            </button>
          ))}
        </div>
      )}

      {selectedQ&&<FichaModal quote={selectedQ} onClose={()=>setSelectedQ(null)} onUpdate={q=>{ updateQ(q); setSelectedQ(null); }} ejecutivos={ejecutivos} showToast={showToast}/>}
      {selectedCliente&&<FichaClienteModal cliente={selectedCliente} onClose={()=>setSelectedCliente(null)} onUpdate={updateCliente} onDelete={deleteCliente} onNuevaCot={()=>{ setSelectedCliente(null); setShowNueva(true); }} quotes={quotes} showToast={showToast}/>}
      {showNueva&&<NuevaCotizacion onSave={addQ} onClose={()=>setShowNueva(false)} ejecutivos={ejecutivos} modoAsignacion={modo}/>}
      {showImportar&&<ImportarCSVModal onClose={()=>setShowImportar(false)} onImport={importClientes} showToast={showToast}/>}
      {toast&&<Toast key={toast.id} message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
