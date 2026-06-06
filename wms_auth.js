
// PRG WMS - Shared Auth Module v2
var SUPA_URL="https://ujvqanqqhmnfxsfeqixc.supabase.co";
var SUPA_KEY="sb_publishable_5o19BnZUEi8j-rU5DDAgBA_HwKB7V-v";
var supa=supabase.createClient(SUPA_URL,SUPA_KEY);
var currentUser=null,currentProfile=null;

// Restore session instantly from cache to avoid flash
(function(){
  var cached=sessionStorage.getItem('wms_profile');
  if(cached){
    try{
      var p=JSON.parse(cached);
      var nameEl=document.getElementById('sidebar-user-name');
      var roleEl=document.getElementById('sidebar-user-role');
      if(nameEl)nameEl.textContent=p.name||'';
      if(roleEl){roleEl.textContent=p.role==='admin'?'Admin':'User';roleEl.className=p.role==='admin'?'badge badge-orange':'badge badge-gray';}
      document.querySelectorAll('.admin-only').forEach(function(el){el.style.display=p.role==='admin'?'flex':'none';});
      // Hide auth screen immediately
      var as=document.getElementById('auth-screen');
      var ap=document.getElementById('app');
      if(as)as.style.display='none';
      if(ap)ap.style.display='block';
    }catch(e){}
  }
})();

async function doLogin(){
  var email=document.getElementById('login-email').value.trim();
  var pass=document.getElementById('login-pass').value;
  if(!email||!pass){document.getElementById('auth-msg').textContent='Vyplnte pole';return;}
  document.getElementById('auth-msg').textContent='Prihlasovani...';
  var res=await supa.auth.signInWithPassword({email,password:pass});
  if(res.error){document.getElementById('auth-msg').textContent='Chyba: '+res.error.message;return;}
  await onLoggedIn(res.data.user);
}

async function onLoggedIn(user){
  currentUser=user;
  var prof=await supa.from('profiles').select('*').eq('id',user.id).single();
  currentProfile=prof.data||{name:user.email,role:'user'};
  sessionStorage.setItem('wms_profile',JSON.stringify(currentProfile));
  sessionStorage.setItem('wms_user_id',user.id);
  var nameEl=document.getElementById('sidebar-user-name');
  var roleEl=document.getElementById('sidebar-user-role');
  if(nameEl)nameEl.textContent=currentProfile.name||user.email;
  if(roleEl){roleEl.textContent=currentProfile.role==='admin'?'Admin':'User';roleEl.className=currentProfile.role==='admin'?'badge badge-orange':'badge badge-gray';}
  document.querySelectorAll('.admin-only').forEach(function(el){el.style.display=currentProfile.role==='admin'?'flex':'none';});
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('app').style.display='block';
  if(typeof afterLogin==='function')afterLogin();
}

async function doLogout(){
  sessionStorage.clear();
  await supa.auth.signOut();
  window.location.href='wms_dashboard.html';
}

function go(u){window.location.href=u;}
function toggleSidebar(){var sb=document.getElementById('sidebar'),ov=document.getElementById('sidebar-overlay'),o=sb.classList.toggle('open');ov.style.display=o?'block':'none';}
var _tt;
function toast(m){var e=document.getElementById('toast');e.textContent=m;e.classList.add('show');clearTimeout(_tt);_tt=setTimeout(function(){e.classList.remove('show');},2800);}
function closeModal(id){document.getElementById(id).style.display='none';}
function fmtD(dt){return new Date(dt).toLocaleDateString('cs-CZ');}
function fmtDT(dt){return new Date(dt).toLocaleString('cs-CZ');}

// Init auth
supa.auth.getSession().then(function(res){
  if(res.data&&res.data.session){
    onLoggedIn(res.data.session.user);
  } else {
    sessionStorage.clear();
    document.getElementById('auth-screen').style.display='flex';
    document.getElementById('app').style.display='none';
  }
});
