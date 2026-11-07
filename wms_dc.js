/* PRG Systems – sdílený modul DC (distribuční centra)
   Použití na stránce:
     <script src="wms_dc.js"></script>
     await PRG_DC.init(supa, currentProfile);   // po přihlášení, před načtením dat
     q = PRG_DC.apply(q, 'warehouse_id');       // filtr dotazu podle zvoleného DC
     PRG_DC.currentId()                         // id zvoleného DC (null = všechna)
*/
(function(){
  var KEY='prg_dc';
  var state={list:[],all:[],restricted:false,current:'',ready:false};

  function sid(v){return v==null?'':String(v);}
  function lsGet(){try{return localStorage.getItem(KEY);}catch(e){return null;}}
  function lsSet(v){try{localStorage.setItem(KEY,v);}catch(e){}}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function byId(id){for(var i=0;i<state.list.length;i++){if(sid(state.list[i].id)===sid(id))return state.list[i];}return null;}

  async function init(supa,profile){
    var res=await supa.from('warehouses').select('id,code,name,is_active').order('code');
    var all=(res&&res.data)||[];
    state.all=all;
    var active=all.filter(function(w){return w.is_active!==false;});
    var isAdmin=profile&&profile.role==='admin';
    var allowed=profile&&profile.allowed_dcs;
    state.restricted=!isAdmin&&Array.isArray(allowed);
    state.list=state.restricted?active.filter(function(w){return allowed.map(sid).indexOf(sid(w.id))!==-1;}):active;

    var cur=lsGet();
    var canAll=state.list.length>1;
    if(cur===''&&canAll){state.current='';}
    else if(cur&&byId(cur)){state.current=sid(cur);}
    else if(profile&&profile.default_dc!=null&&byId(profile.default_dc)){state.current=sid(profile.default_dc);}
    else if(state.list.length){state.current=sid(state.list[0].id);}
    else{state.current='';}
    state.ready=true;
    render();
    return state;
  }

  function render(){
    var old=document.getElementById('dc-switch');if(old)old.remove();
    /* DC se přepíná v Setupu (⚙️ → Jazyk a DC); v horní liště zůstane jen štítek se zvoleným DC, klik otevře Setup */
    var tb=document.querySelector('.topbar,#prg-bar');if(!tb||!state.list.length)return;
    var cur=state.current===''?null:byId(state.current);
    var chip=document.createElement('button');chip.type='button';chip.id='dc-switch';chip.className='dc-chip';
    chip.title='Změnit DC';chip.textContent='🏬 '+(cur?cur.code:'Všechna DC')+(state.list.length>1?' ▾':'');
    chip.onclick=function(){if(window.PRG_SETUP)PRG_SETUP.open();};
    var ref=tb.querySelector('#prg-user');if(ref)tb.insertBefore(chip,ref);else tb.appendChild(chip);
  }

  /* filtr dotazu: zvolené DC, nebo (u omezeného uživatele při volbě „Všechna DC“) jen povolená DC */
  function apply(q,col){
    if(!state.ready)return q;
    if(state.current!=='')return q.eq(col,state.current);
    if(state.restricted){return q.in(col,state.list.map(function(d){return d.id;}));}
    return q;
  }
  function currentId(){return state.current===''?null:(byId(state.current)?byId(state.current).id:state.current);}
  function currentDc(){return state.current===''?null:byId(state.current);}
  function list(){return state.list.slice();}
  function allWarehouses(){return state.all.slice();}
  function restricted(){return state.restricted;}

  /* styl přepínače (vloží se samo) */
  var st=document.createElement('style');
  st.textContent='.dc-switch{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--muted,#667);}'
   +'.dc-switch select{padding:6px 8px;border:1.5px solid var(--border,#dde);border-radius:7px;font-size:13px;font-family:inherit;background:#fff;color:var(--text,#222);max-width:200px;}'
   +'.dc-chip{margin-left:auto;padding:5px 11px;border-radius:14px;border:none;background:var(--accent-light,#e8f7f1);color:var(--accent,#0a7c4e);font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer;}';
  document.head.appendChild(st);

  window.PRG_DC={init:init,apply:apply,currentId:currentId,currentDc:currentDc,list:list,allWarehouses:allWarehouses,restricted:restricted,render:render};
})();
