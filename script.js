/* ===== KONFIGURASI ===== */
var GAS_URL="https://script.google.com/macros/s/AKfycbwTGFTatNOATbDYW6AM2-PCEK6gkAHwtDxLjgDRkFu0FaAgbsYcOyRdmccPbQX0SA61/exec";
var FETCH_TIMEOUT=30000,currentUser=null,masterData={daerah:[],desa:{},kelompok:{}},allUsers=[],allTaarufRequests=[],currentTaarufFilter='',cachedKegiatan=[],adminRoles=['Admin','Desa','Daerah','Super Admin'];
var searchCurrentPage=1,searchPageSize=6,adminCurrentPage=1,adminPageSize=10,taarufCurrentPage=1,taarufPageSize=8,searchIamInTaaruf=false;
var userPhotoMap={};
var debounceTimers={};

/* ===== DEBOUNCE ===== */
function debounce(k,fn,ms){ms=ms||250;clearTimeout(debounceTimers[k]);debounceTimers[k]=setTimeout(fn,ms)}
function debounceFilterCards(){debounce('fc',function(){searchCurrentPage=1;renderCards(allUsers)},200)}
function debounceFilterAdmin(){debounce('fa',function(){adminCurrentPage=1;renderAdminUsers(allUsers)},200)}

/* ===== LAZY OBSERVER ===== */
var lazyObserver=null;
function initLazyObserver(){
    if(lazyObserver)return;if(!('IntersectionObserver'in window))return;
    lazyObserver=new IntersectionObserver(function(e){for(var i=0;i<e.length;i++){if(e[i].isIntersecting){var img=e[i].target;if(img.dataset.src){img.src=img.dataset.src;img.removeAttribute('data-src');img.classList.add('loaded')}lazyObserver.unobserve(img)}}},{rootMargin:'120px'});
}
function observeLazyImgs(container){if(!lazyObserver){container.querySelectorAll('.lazy-img').forEach(function(el){el.src=el.dataset.src;el.classList.add('loaded')});return}container.querySelectorAll('.lazy-img').forEach(function(el){lazyObserver.observe(el)})}

/* ===== WATERMARK ===== */
function generateWatermarkBg(){if(!currentUser)return'';var t=(currentUser.email||currentUser.nama||'')+' — DILINDUNGI —';var s='<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180"><text x="150" y="90" transform="rotate(-28 150 90)" font-size="11" fill="rgba(0,0,0,0.035)" font-family="Arial,sans-serif" text-anchor="middle" font-weight="bold">'+t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</text></svg>';return'url("data:image/svg+xml,'+encodeURIComponent(s)+'")'}
function showWatermark(){if(!currentUser)return;var w=document.getElementById('watermark-layer');if(!w){w=document.createElement('div');w.id='watermark-layer';document.body.appendChild(w)}w.style.backgroundImage=generateWatermarkBg();w.classList.remove('hidden')}
function hideWatermark(){var w=document.getElementById('watermark-layer');if(w)w.classList.add('hidden')}

/* ===== ANTI-SCREENSHOT ===== */
(function(){
    document.addEventListener('contextmenu',function(e){if(e.target.closest('.protected-zone')){e.preventDefault();showToast('Klik kanan dinonaktifkan.','error')}});
    document.addEventListener('copy',function(e){if(e.target.closest('.protected-zone')){e.preventDefault();showToast('Copy data dilarang.','error')}});
    document.addEventListener('cut',function(e){if(e.target.closest('.protected-zone')){e.preventDefault();showToast('Cut data dilarang.','error')}});
    document.addEventListener('dragstart',function(e){if(e.target.closest('.protected-zone')&&e.target.tagName==='IMG')e.preventDefault()});
    document.addEventListener('keydown',function(e){if(!e.target.closest('.protected-zone'))return;if(e.key==='PrintScreen'||(e.ctrlKey&&e.shiftKey&&(e.key==='S'||e.key==='I'))||(e.ctrlKey&&e.key==='p')||(e.metaKey&&e.key==='p')){e.preventDefault();showToast('Screenshot/print dilarang.','error')}});
    var bt=null;document.addEventListener('visibilitychange',function(){var z=document.getElementById('page-search');if(!z||z.classList.contains('hidden'))return;if(document.hidden){z.style.filter='blur(25px)';z.style.transition='filter .12s';clearTimeout(bt)}else{bt=setTimeout(function(){z.style.filter='none'},350)}});
})();

/* ===== UTILITAS ===== */
function showToast(m,t){t=t||'success';var e=document.createElement('div');e.className='toast toast-'+t;e.innerHTML='<i class="fas fa-'+(t==='success'?'check':'exclamation')+'-circle"></i> '+m;document.body.appendChild(e);setTimeout(function(){e.style.opacity='0';e.style.transition='opacity .3s';setTimeout(function(){e.remove()},300)},3200)}
function showLoading(){var o=document.createElement('div');o.className='loading-overlay';o.id='loadOv';o.innerHTML='<div class="spinner"></div>';document.body.appendChild(o)}
function hideLoading(){var e=document.getElementById('loadOv');if(e)e.remove()}
function showView(id){document.querySelectorAll('.auth-wrapper,.app-shell').forEach(function(e){e.classList.add('hidden')});var t=document.getElementById(id);if(t)t.classList.remove('hidden')}
function getPhotoUrl(u){if(!u)return'';var m=u.match(/\/d\/([a-zA-Z0-9_-]+)/);if(m)return'https://drive.google.com/thumbnail?id='+m[1]+'&sz=w400';return u.indexOf('thumbnail?id=')!==-1?u:u}
function getInitials(n){if(!n)return'?';var p=n.trim().split(/\s+/);return p.length===1?p[0][0].toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase()}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function openPhotoModal(u){document.body.insertAdjacentHTML('beforeend','<div class="photo-modal-overlay" onclick="closePhotoModal(event)"><div class="photo-modal-content" onclick="event.stopPropagation()"><button class="photo-modal-close" onclick="closePhotoModal()" aria-label="Tutup"><i class="fas fa-times"></i></button><img src="'+u.replace('sz=w400','sz=w1200')+'" alt="Foto besar"></div></div>')}
function closePhotoModal(e){if(e&&e.target!==e.currentTarget)return;var m=document.querySelector('.photo-modal-overlay');if(m)m.remove()}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('overlay').classList.toggle('open')}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('open')}
function handleLockedNav(p){if(!currentUser.isComplete){showToast('Lengkapi profil Anda terlebih dahulu.','error');return}switchPage(p)}
function previewFoto(e,id){var f=e.target.files[0],img=document.getElementById(id);if(f){var r=new FileReader();r.onload=function(ev){img.src=ev.target.result;img.style.display='block'};r.readAsDataURL(f)}else img.style.display='none'}
function compressImage(f,mw,q){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(e){var img=new Image();img.onload=function(){var c=document.createElement('canvas'),w=img.width,h=img.height;if(w>mw){h=Math.round((mw/w)*h);w=mw}c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);res(c.toDataURL('image/jpeg',q).split(',')[1])};img.onerror=rej;img.src=e.target.result};r.onerror=rej;r.readAsDataURL(f)})}

/* ===== FETCH ===== */
async function fetchGAS(a,p,m,b){p=p||{};m=m||'GET';b=b||null;var u=GAS_URL+'?action='+a,ctl=new AbortController(),tid=setTimeout(function(){ctl.abort()},FETCH_TIMEOUT);try{if(m==='GET'){Object.keys(p).forEach(function(k){u+='&'+k+'='+encodeURIComponent(p[k])});u+='&_t='+Date.now();var r=await fetch(u,{signal:ctl.signal,cache:'no-store'});clearTimeout(tid);var t=await r.text();try{return JSON.parse(t)}catch(e){return{status:'error',message:'Respons tidak valid'}}}else{var r=await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(Object.assign({action:a},b)),signal:ctl.signal});clearTimeout(tid);var t=await r.text();try{return JSON.parse(t)}catch(e){return{status:'error',message:'Respons tidak valid'}}}}catch(e){clearTimeout(tid);showToast(e.name==='AbortError'?'Permintaan timeout':'Gagal terhubung ke server','error');return{status:'error',message:e.message||'Koneksi gagal'}}}

/* ===== PAGINASI ===== */
function getPaginationRange(c,t){if(t<=7){var a=[];for(var i=1;i<=t;i++)a.push(i);return a}var p=[];if(c<=4){for(var i=1;i<=5;i++)p.push(i);p.push('...',t)}else if(c>=t-3){p.push(1,'...');for(var i=t-4;i<=t;i++)p.push(i)}else{p.push(1,'...',c-1,c,c+1,'...',t)}return p}
function generatePagination(cid,cp,tp,ti,ps,fn){var c=document.getElementById(cid);if(tp<=1||ti===0){c.innerHTML='';return}var si=(cp-1)*ps+1,ei=Math.min(cp*ps,ti),pg=getPaginationRange(cp,tp);var h='<div class="pagination-wrap"><div class="pagination-info">Menampilkan <strong>'+si+' - '+ei+'</strong> dari <strong>'+ti+'</strong></div><div class="pagination-buttons">';h+='<button class="page-btn" '+(cp===1?'disabled':'')+' onclick="'+fn+'('+(cp-1)+')"><i class="fas fa-chevron-left"></i></button>';for(var i=0;i<pg.length;i++){if(pg[i]==='...')h+='<span class="page-ellipsis">...</span>';else h+='<button class="page-btn '+(pg[i]===cp?'active':'')+'" onclick="'+fn+'('+pg[i]+')">'+pg[i]+'</button>'}h+='<button class="page-btn" '+(cp===tp?'disabled':'')+' onclick="'+fn+'('+(cp+1)+')"><i class="fas fa-chevron-right"></i></button></div></div>';c.innerHTML=h}
function goToSearchPage(p){searchCurrentPage=p;renderCards(allUsers);document.getElementById('dashboard-list').scrollIntoView({behavior:'smooth',block:'start'})}
function goToAdminPage(p){adminCurrentPage=p;renderAdminUsers(allUsers);document.getElementById('admin-users-pagination').scrollIntoView({behavior:'smooth',block:'start'})}
function goToTaarufPage(p){taarufCurrentPage=p;renderAdminTaaruf(allTaarufRequests);document.getElementById('admin-taaruf-pagination').scrollIntoView({behavior:'smooth',block:'start'})}
function changeAdminPageSize(){adminPageSize=parseInt(document.getElementById('adminPageSizeSelect').value)||10;adminCurrentPage=1;renderAdminUsers(allUsers)}

/* ===== NAVIGASI ===== */
function switchPage(page){
    document.querySelectorAll('.main-content > div').forEach(function(e){e.classList.add('hidden')});
    var t=document.getElementById('page-'+page);if(t)t.classList.remove('hidden');
    document.querySelectorAll('.sidebar-nav a').forEach(function(a){a.classList.remove('active')});
    var al=document.querySelector('.sidebar-nav a[data-page="'+page+'"]');if(al)al.classList.add('active');
    var titles={'home':'Beranda','search':'Temukan Pasangan','status':"Status Ta'aruf",'kegiatan':'Info Kegiatan','profile':'Edit Profil','admin-home':'Dashboard Admin','admin-users':'Data Peserta','admin-taaruf':"Pengajuan Ta'aruf",'admin-kegiatan':'Kelola Kegiatan'};
    document.getElementById('pageTitle').textContent=titles[page]||'';
    if(page==='search')showWatermark();else hideWatermark();
    var sp=document.getElementById('page-search');if(sp)sp.style.filter='none';
    if(page==='home'&&!adminRoles.includes(currentUser.role))loadHomeStats();
    if(page==='admin-home')loadAdminStats();
    if(page==='search'&&currentUser.isComplete)loadDashboard();
    if(page==='status'&&currentUser.isComplete)loadMyTaarufStatus();
    if(page==='kegiatan')loadKegiatanPage();
    if(page==='profile')prefillProfile();
    if(page==='admin-users')loadAdminUsers();
    if(page==='admin-taaruf')loadAdminTaaruf();
    if(page==='admin-kegiatan')loadAdminKegiatan();
    closeSidebar();
}
function updateShell(){
    if(!currentUser)return;
    document.getElementById('sidebarName').textContent=currentUser.nama;
    document.getElementById('sidebarRole').textContent=currentUser.role+(currentUser.scope&&currentUser.scope!=='All'?' '+currentUser.scope:'');
    var av=document.getElementById('sidebarAvatar');
    if(currentUser.foto)av.innerHTML='<img src="'+getPhotoUrl(currentUser.foto)+'" loading="lazy">';else av.textContent=getInitials(currentUser.nama);
    if(adminRoles.indexOf(currentUser.role)!==-1){document.getElementById('nav-personal').classList.add('hidden');document.getElementById('nav-admin').classList.remove('hidden');document.getElementById('adminRoleLabel').textContent=currentUser.role;document.getElementById('adminScopeLabel').textContent=currentUser.scope||'All'}
    else{document.getElementById('nav-personal').classList.remove('hidden');document.getElementById('nav-admin').classList.add('hidden');updateLockedMenus();document.getElementById('welcomeName').textContent="Assalamu'alaikum, "+currentUser.nama+'!'}
}
function updateLockedMenus(){if(!currentUser)return;var ic=currentUser.isComplete;document.getElementById('lock-search').classList.toggle('hidden',ic);document.getElementById('nav-search').classList.toggle('locked',!ic);document.getElementById('lock-status').classList.toggle('hidden',ic);document.getElementById('nav-status').classList.toggle('locked',!ic);document.getElementById('profileAlert').classList.toggle('hidden',ic)}

/* ===== NOTIFIKASI ===== */
function toggleNotifPanel(e){e.stopPropagation();var p=document.getElementById('notif-panel');p.classList.toggle('hidden');if(!p.classList.contains('hidden'))loadNotifContent()}
function closeNotifPanel(){document.getElementById('notif-panel').classList.add('hidden')}
document.addEventListener('click',function(e){var w=document.querySelector('.notif-wrap'),p=document.getElementById('notif-panel');if(w&&p&&!w.contains(e.target))p.classList.add('hidden')});
async function refreshNotifCount(){if(!currentUser)return;try{var r=await fetchGAS('getNotifCount',{email:currentUser.email,role:currentUser.role,scope:currentUser.scope});if(r.status==='success'){var b=document.getElementById('bellBadge');if(r.count>0){b.textContent=r.count;b.classList.remove('hidden')}else b.classList.add('hidden')}}catch(e){}}
async function loadNotifContent(){
    var el=document.getElementById('notif-list');el.innerHTML='<div class="notif-empty"><div class="spinner" style="margin:0 auto 7px;width:18px;height:18px;border-width:2px"></div>Memuat...</div>';
    try{
        var items=[],isAd=adminRoles.indexOf(currentUser.role)!==-1;
        if(isAd){var r=await fetchGAS('getAllTaaruf',{role:currentUser.role,email:currentUser.email,scope:currentUser.scope});if(r.status==='success')r.data.forEach(function(d){if(d.status==='Pending')items.push({type:'taaruf',text:'<strong>'+esc(d.pelamarNama)+'</strong> mengajukan ta\'aruf ke <strong>'+esc(d.targetNama)+'</strong>',time:d.tanggal})})}
        else{var r=await fetchGAS('getMyTaaruf',{email:currentUser.email});if(r.status==='success')r.data.forEach(function(d){items.push({type:'taaruf',text:(d.isPelamar?'Pengajuan Anda ke':'Mengajukan Anda')+' <strong>'+esc(d.otherNama)+'</strong> &mdash; <strong>'+d.status+'</strong>',time:d.tanggal})})}
        if(cachedKegiatan.length>0)cachedKegiatan.slice(0,3).forEach(function(k){items.push({type:'kegiatan',text:'<strong>'+esc(k.judul)+'</strong>',time:k.tanggal})});
        if(items.length===0){el.innerHTML='<div class="notif-empty"><i class="fas fa-bell-slash" style="font-size:1.2rem;margin-bottom:5px;display:block;opacity:.3"></i>Tidak ada pemberitahuan</div>';return}
        el.innerHTML=items.map(function(it){return'<div class="notif-item"><div class="notif-icon '+it.type+'"><i class="fas '+(it.type==='taaruf'?'fa-heart':'fa-bullhorn')+'"></i></div><div class="notif-text">'+it.text+'<div class="notif-time"><i class="far fa-clock"></i> '+it.time+'</div></div></div>'}).join('');
    }catch(e){el.innerHTML='<div class="notif-empty">Gagal memuat pemberitahuan</div>'}
}

/* ===== VERIFIKASI ===== */
async function handleRegisterClick(e){
    e.preventDefault();var f=document.getElementById('registerForm');if(!f.checkValidity()){f.reportValidity();return}
    document.getElementById('verify-modal').classList.remove('hidden');
    document.getElementById('modalQuestion').innerHTML='<i class="fas fa-spinner fa-spin"></i> Memuat pertanyaan...';
    document.getElementById('modalAnswer').value='';document.getElementById('btnVerifySubmit').disabled=false;document.getElementById('btnVerifySubmit').innerHTML='<i class="fas fa-check"></i> Verifikasi & Daftar';
    var r=await fetchGAS('getVerifyQuestion');
    if(r.status==='success'){document.getElementById('modalQuestion').innerText=r.question;document.getElementById('modalQuestionHidden').value=r.question}
    else{showToast('Gagal memuat pertanyaan','error');closeVerifyModal()}
}
function closeVerifyModal(){document.getElementById('verify-modal').classList.add('hidden')}
async function submitVerifyAndRegister(){
    var a=document.getElementById('modalAnswer').value.trim();if(!a){showToast('Masukkan jawaban','error');return}
    var btn=document.getElementById('btnVerifySubmit');btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Proses...';
    var r=await fetchGAS('register',{},'POST',{email:document.getElementById('regEmail').value.trim(),password:document.getElementById('regPass').value,nama:document.getElementById('regNama').value.trim(),question:document.getElementById('modalQuestionHidden').value,answer:a});
    if(r.status==='success'){showToast(r.message);closeVerifyModal();showView('login-view');document.getElementById('registerForm').reset()}
    else showToast(r.message,'error');
    btn.disabled=false;btn.innerHTML='<i class="fas fa-check"></i> Verifikasi & Daftar';
}

/* ===== AUTH ===== */
function showForgotPassword(){var e=prompt("Masukkan email akun Anda:");if(e)fetchGAS('forgotPassword',{},'POST',{email:e}).then(function(r){showToast(r.message,r.status)})}
function loadRegisterView(){showView('register-view')}
async function login(){
    var btn=document.getElementById('btnLogin'),email=document.getElementById('loginEmail').value.trim(),pass=document.getElementById('loginPass').value;
    if(!email||!pass){showToast('Isi email dan password','error');return}
    btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Masuk...';
    var r=await fetchGAS('login',{email:email,password:pass});
    if(r.status==='success'){
        currentUser=r.user;if(!currentUser.role)currentUser.role='Personal';if(!currentUser.scope)currentUser.scope='';
        showToast("Assalamu'alaikum, "+currentUser.nama+"!");showView('app-shell');updateShell();initLazyObserver();refreshNotifCount();loadKegiatanCache();
        if(adminRoles.indexOf(currentUser.role)!==-1)switchPage('admin-home');
        else{if(!currentUser.isComplete){switchPage('profile');showToast('Silakan lengkapi profil Anda terlebih dahulu.','error')}else switchPage('home')}
    }else showToast(r.message||'Login gagal','error');
    btn.disabled=false;btn.innerHTML='<i class="fas fa-arrow-right"></i> Masuk';
}
function logout(){currentUser=null;cachedKegiatan=[];userPhotoMap={};hideWatermark();document.getElementById('loginEmail').value='';document.getElementById('loginPass').value='';showView('login-view')}

/* ===== MASTER DATA ===== */
async function loadMasterData(){if(masterData.daerah.length===0){var r=await fetchGAS('getMasterData');if(r.status==='success')masterData=r.data}}
function populateDaerahSelect(sid,ph){var s=document.getElementById(sid);s.innerHTML='<option value="">'+(ph||'Semua Daerah')+'</option>';masterData.daerah.forEach(function(d){s.innerHTML+='<option value="'+d+'">'+d+'</option>'})}
function populateFilterDaerah(sid){populateDaerahSelect(sid,'Semua Daerah')}
function onSearchFilterDaerahChange(){var d=document.getElementById('searchFilterDaerah').value,s=document.getElementById('searchFilterDesa'),k=document.getElementById('searchFilterKelompok');s.innerHTML='<option value="">Semua Desa</option>';k.innerHTML='<option value="">Semua Kelompok</option>';if(d&&masterData.desa[d])masterData.desa[d].forEach(function(i){s.innerHTML+='<option value="'+i+'">'+i+'</option>'});filterCardsWithFilters()}
function onSearchFilterDesaChange(){var d=document.getElementById('searchFilterDesa').value,k=document.getElementById('searchFilterKelompok');k.innerHTML='<option value="">Semua Kelompok</option>';if(d&&masterData.kelompok[d])masterData.kelompok[d].forEach(function(i){k.innerHTML+='<option value="'+i+'">'+i+'</option>'});filterCardsWithFilters()}
function onAdminFilterDaerahChange(){var d=document.getElementById('adminFilterDaerah').value,s=document.getElementById('adminFilterDesa'),k=document.getElementById('adminFilterKelompok');s.innerHTML='<option value="">Semua Desa</option>';k.innerHTML='<option value="">Semua Kelompok</option>';if(d&&masterData.desa[d])masterData.desa[d].forEach(function(i){s.innerHTML+='<option value="'+i+'">'+i+'</option>'});filterAdminWithFilters()}
function onAdminFilterDesaChange(){var d=document.getElementById('adminFilterDesa').value,k=document.getElementById('adminFilterKelompok');k.innerHTML='<option value="">Semua Kelompok</option>';if(d&&masterData.kelompok[d])masterData.kelompok[d].forEach(function(i){k.innerHTML+='<option value="'+i+'">'+i+'</option>'});filterAdminWithFilters()}
function populateDaerah(){var s=document.getElementById('upDaerah');s.innerHTML='<option value="">-- Pilih Daerah --</option>';masterData.daerah.forEach(function(d){s.innerHTML+='<option value="'+d+'">'+d+'</option>'})}
function loadDesa(){var d=document.getElementById('upDaerah').value,s=document.getElementById('upDesa'),k=document.getElementById('upKelompok');s.innerHTML='<option value="">-- Pilih --</option>';k.innerHTML='<option value="">-- Pilih --</option>';if(d&&masterData.desa[d])masterData.desa[d].forEach(function(i){s.innerHTML+='<option value="'+i+'">'+i+'</option>'})}
function loadKelompok(){var d=document.getElementById('upDesa').value,k=document.getElementById('upKelompok');k.innerHTML='<option value="">-- Pilih --</option>';if(d&&masterData.kelompok[d])masterData.kelompok[d].forEach(function(i){k.innerHTML+='<option value="'+i+'">'+i+'</option>'})}

/* ===== PROFIL ===== */
async function prefillProfile(){
    await loadMasterData();populateDaerah();if(!currentUser)return;
    var map={'upNama':currentUser.nama,'upOrtu':currentUser.namaOrtu,'upTTL':currentUser.ttl,'upAnakKe':currentUser.anakKe,'upSuku':currentUser.suku,'upTB':currentUser.tbBerat,'upPendidikan':currentUser.pendidikan,'upPekerjaan':currentUser.pekerjaan,'upHobi':currentUser.hobi,'upDapukan':currentUser.dapukan};
    Object.keys(map).forEach(function(id){var e=document.getElementById(id);if(e&&map[id])e.value=map[id]});
    if(currentUser.gender)document.getElementById('upGender').value=currentUser.gender;
    if(currentUser.menikah)document.getElementById('upMenikah').value=currentUser.menikah;
    if(currentUser.kriteriaPasangan)document.getElementById('upKriteria').value=currentUser.kriteriaPasangan;
    if(currentUser.daerah){document.getElementById('upDaerah').value=currentUser.daerah;loadDesa();setTimeout(function(){if(currentUser.desa){document.getElementById('upDesa').value=currentUser.desa;loadKelompok();setTimeout(function(){if(currentUser.kelompok)document.getElementById('upKelompok').value=currentUser.kelompok},60)}},60)}
    var imgP=document.getElementById('upFotoPreview');if(currentUser.foto){imgP.src=getPhotoUrl(currentUser.foto);imgP.style.display='block'}else imgP.style.display='none';
    updateLockedMenus();
}
async function handleUpdateProfile(e){
    e.preventDefault();var btn=document.getElementById('btnSaveProfile');btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Simpan...';
    var fb=null,fi=document.getElementById('upFoto');
    if(fi&&fi.files&&fi.files[0]){if(fi.files[0].size>2*1024*1024){showToast('Ukuran foto maks 2MB','error');btn.disabled=false;btn.innerHTML='<i class="fas fa-save"></i> Simpan Profil';return}try{fb=await compressImage(fi.files[0],600,.7)}catch(err){showToast('Gagal proses foto','error');btn.disabled=false;btn.innerHTML='<i class="fas fa-save"></i> Simpan Profil';return}}
    var p={email:currentUser.email,nama:document.getElementById('upNama').value.trim()||currentUser.nama,namaOrtu:document.getElementById('upOrtu').value.trim(),ttl:document.getElementById('upTTL').value.trim(),gender:document.getElementById('upGender').value,anakKe:document.getElementById('upAnakKe').value.trim(),suku:document.getElementById('upSuku').value.trim(),tbBerat:document.getElementById('upTB').value.trim(),menikah:document.getElementById('upMenikah').value,pendidikan:document.getElementById('upPendidikan').value.trim(),pekerjaan:document.getElementById('upPekerjaan').value.trim(),hobi:document.getElementById('upHobi').value.trim(),dapukan:document.getElementById('upDapukan').value.trim(),daerah:document.getElementById('upDaerah').value,desa:document.getElementById('upDesa').value,kelompok:document.getElementById('upKelompok').value,foto:fb,kriteriaPasangan:document.getElementById('upKriteria').value.trim()};
    if(!p.gender||!p.daerah){showToast('Jenis Kelamin dan Daerah wajib diisi','error');btn.disabled=false;btn.innerHTML='<i class="fas fa-save"></i> Simpan Profil';return}
    var r=await fetchGAS('updateProfile',{},'POST',p);
    if(r.status==='success'){showToast(r.message);currentUser.isComplete=true;currentUser.gender=p.gender;currentUser.daerah=p.daerah;currentUser.desa=p.desa;currentUser.kelompok=p.kelompok;currentUser.kriteriaPasangan=p.kriteriaPasangan;updateLockedMenus()}
    else showToast(r.message||'Gagal menyimpan','error');
    btn.disabled=false;btn.innerHTML='<i class="fas fa-save"></i> Simpan Profil';
}

/* ===== CARI JODOH ===== */
async function loadDashboard(){
    var c=document.getElementById('dashboard-list'),pg=document.getElementById('dashboard-pagination'),bl=document.getElementById('search-taaruf-blocked'),fa=document.getElementById('search-filters-area'),sw=document.getElementById('screenshotWarn');
    c.innerHTML='';pg.innerHTML='';bl.innerHTML='';bl.classList.add('hidden');fa.classList.add('hidden');sw.classList.add('hidden');
    c.innerHTML='<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat status ta\'aruf...</p></div>';
    searchCurrentPage=1;showWatermark();await loadMasterData();populateFilterDaerah('searchFilterDaerah');
    var tr=await fetchGAS('getMyTaaruf',{email:currentUser.email}),at=null;
    if(tr.status==='success'&&tr.data&&tr.data.length>0)at=tr.data.find(function(r){return r.status==='Pending'||r.status==='Sedang Taaruf'||r.status==='Sedang Proses'});
    if(at){
        allUsers=[];searchIamInTaaruf=true;c.innerHTML='';pg.innerHTML='';fa.classList.add('hidden');sw.classList.add('hidden');bl.classList.remove('hidden');
        bl.innerHTML='<div class="taaruf-blocked-banner"><div class="blocked-icon"><i class="fas fa-heart"></i></div><div class="blocked-title">Anda Sedang dalam Proses Ta\'aruf</div><div class="blocked-desc">Pengajuan ta\'aruf Anda kepada <b>'+esc(at.otherNama)+'</b> saat ini berstatus <b>'+at.status+'</b>.<br><br>Daftar peserta <b>tidak dapat ditampilkan</b> selama proses ta\'aruf berlangsung.<br><br>Daftar peserta akan kembali tersedia jika pengajuan <b>ditolak</b>.<br>Silakan cek status di menu <b>Status Ta\'aruf</b>.</div></div>';
        hideWatermark();return;
    }
    searchIamInTaaruf=false;sw.classList.remove('hidden');fa.classList.remove('hidden');
    c.innerHTML='<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat data peserta...</p></div>';
    var r=await fetchGAS('getUsers',{role:'Personal',email:currentUser.email,gender:currentUser.gender||''});
    if(r.status==='error'){c.innerHTML='<div class="empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--gold-500)"></i><p>Gagal memuat data peserta.</p><button class="btn btn-sm retry-btn" onclick="loadDashboard()"><i class="fas fa-redo"></i> Coba Lagi</button></div>';hideWatermark();return}
    if(r.status==='success'&&r.data&&r.data.length>0){allUsers=r.data;renderCards(allUsers)}
    else{allUsers=[];c.innerHTML='<div class="empty-state"><i class="fas fa-user-friends"></i><p>Belum ada peserta yang tersedia.</p></div>';pg.innerHTML='';hideWatermark()}
}
function getCardFilteredList(){
    var s=(document.getElementById('searchInput')?document.getElementById('searchInput').value:'').toLowerCase(),fd=(document.getElementById('searchFilterDaerah')?document.getElementById('searchFilterDaerah').value:''),fv=(document.getElementById('searchFilterDesa')?document.getElementById('searchFilterDesa').value:''),fk=(document.getElementById('searchFilterKelompok')?document.getElementById('searchFilterKelompok').value:'');
    return allUsers.filter(function(u){if(s&&(u.nama&&u.nama.toLowerCase().indexOf(s)===-1))return false;if(fd&&u.daerah!==fd)return false;if(fv&&u.desa!==fv)return false;if(fk&&u.kelompok!==fk)return false;return true});
}
function renderCards(){
    var c=document.getElementById('dashboard-list'),pg=document.getElementById('dashboard-pagination'),filtered=getCardFilteredList(),tp=Math.max(1,Math.ceil(filtered.length/searchPageSize));
    if(searchCurrentPage>tp)searchCurrentPage=tp;
    var st=(searchCurrentPage-1)*searchPageSize,pi=filtered.slice(st,st+searchPageSize);
    if(filtered.length===0){c.innerHTML='<div class="empty-state"><i class="fas fa-search"></i><p>Tidak ditemukan.</p></div>';pg.innerHTML='';return}
    c.innerHTML=pi.map(function(u){
        var ps=u.foto?getPhotoUrl(u.foto):'',gc=u.gender==='Perempuan'?'badge-f':'badge-m',kr=u.kriteriaPasangan?'<div class="kriteria-box"><div class="kriteria-label">Kriteria Pasangan</div>'+esc(u.kriteriaPasangan)+'</div>':'';
        var ph=ps?'<img data-src="'+ps+'" class="card-img lazy-img" style="cursor:pointer" onclick="openPhotoModal(\''+ps+'\')" alt="'+esc(u.nama)+'">':'<div class="card-avatar">'+getInitials(u.nama)+'</div>';
        return'<div class="card"><div class="card-top">'+ph+'<div class="card-identity"><div class="card-name">'+esc(u.nama)+' <span class="badge '+gc+'">'+u.gender+'</span></div><div class="card-sub"><i class="fas fa-briefcase"></i> '+(u.pekerjaan||'-')+'</div><div class="card-sub"><i class="fas fa-graduation-cap"></i> '+(u.pendidikan||'-')+'</div><div class="card-sub"><i class="fas fa-map-marker-alt"></i> '+(u.daerah||'-')+', '+(u.desa||'-')+'</div></div></div><div class="card-body"><div class="data-grid"><div class="data-item full-col"><div class="data-label">Nama Orang Tua</div><div class="data-value">'+esc(u.namaOrtu)+'</div></div><div class="data-item"><div class="data-label">TTL</div><div class="data-value">'+esc(u.ttl)+'</div></div><div class="data-item"><div class="data-label">Anak Ke</div><div class="data-value">'+esc(u.anakKe)+'</div></div><div class="data-item"><div class="data-label">Suku</div><div class="data-value">'+esc(u.suku)+'</div></div><div class="data-item"><div class="data-label">TB / BB</div><div class="data-value">'+esc(u.tbBerat)+'</div></div><div class="data-item"><div class="data-label">Status Menikah</div><div class="data-value">'+esc(u.menikah)+'</div></div><div class="data-item"><div class="data-label">Hobi</div><div class="data-value">'+esc(u.hobi)+'</div></div><div class="data-item"><div class="data-label">Dapukan</div><div class="data-value">'+esc(u.dapukan)+'</div></div><div class="data-item full-col"><div class="data-label">Kelompok</div><div class="data-value">'+esc(u.kelompok)+'</div></div></div>'+kr+'</div><div class="card-footer"><button class="btn btn-sm btn-wa" style="width:100%" onclick="requestTaaruf(\''+u.email+'\',\''+esc(u.nama)+'\',\''+esc(u.daerah)+'\')"><i class="fab fa-whatsapp"></i> Ajukan Ta\'aruf</button></div></div>';
    }).join('');
    observeLazyImgs(c);generatePagination('dashboard-pagination',searchCurrentPage,tp,filtered.length,searchPageSize,'goToSearchPage');
}
function filterCardsWithFilters(){searchCurrentPage=1;renderCards()}
async function requestTaaruf(email,nama,daerah){
    showLoading();var r=await fetchGAS('requestTaaruf',{},'POST',{pelamarEmail:currentUser.email,targetEmail:email});hideLoading();
    if(r.status==='success'){
        if(r.waNumber&&r.waNumber.length>5){
            var ps="Assalamu'alaikum, saya "+currentUser.nama+" dari kelompok "+(currentUser.kelompok||'-')+". Saya ingin mengajukan ta'aruf dengan "+nama+" ("+(daerah||'-')+") melalui Halalkan. Mohon bimbingannya.";
            var wu="https://wa.me/"+r.waNumber+"?text="+encodeURIComponent(ps);
            var bx=document.getElementById('search-taaruf-blocked');bx.classList.remove('hidden');
            bx.innerHTML='<div class="wa-info-box"><div class="wa-title"><i class="fab fa-whatsapp" style="color:#059669;font-size:1.05rem"></i> Tim Pernikahan '+esc(daerah)+'</div><div class="wa-detail"><b>'+esc(r.teamName)+'</b>'+(r.teamPeran?' ('+esc(r.teamPeran)+')':'')+'<br>Nomor: '+r.waNumber+'</div><div class="wa-btn"><a href="'+wu+'" target="_blank" rel="noopener" class="btn btn-sm btn-wa" style="width:auto;display:inline-flex"><i class="fab fa-whatsapp"></i> Chat WhatsApp Sekarang</a></div></div>';
            showToast('Pengajuan dicatat! Hubungi tim pernikahan via WhatsApp.');window.open(wu,'_blank');
        }else showToast('Pengajuan terkirim! Namun belum ada tim pernikahan untuk daerah ini.','error');
        searchIamInTaaruf=true;hideWatermark();renderCards();refreshNotifCount();
    }else showToast(r.message||'Gagal mengajukan','error');
}

/* ===== STATUS TAARUF ===== */
async function loadMyTaarufStatus(){
    var el=document.getElementById('status-content');el.innerHTML='<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat status...</p></div>';
    var r=await fetchGAS('getMyTaaruf',{email:currentUser.email});
    if(r.status!=='success'){el.innerHTML='<div class="empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--gold-500)"></i><p>Gagal memuat status.</p><button class="btn btn-sm retry-btn" onclick="loadMyTaarufStatus()"><i class="fas fa-redo"></i> Coba Lagi</button></div>';return}
    if(r.data&&r.data.length>0){
        var sd={'Pending':'Menunggu konfirmasi tim pernikahan.','Sedang Taaruf':'Sedang dalam proses ta\'aruf.','Sedang Proses':'Proses ta\'aruf sedang berlanjut.','Sudah Menikah':'Alhamdulillah, proses telah selesai.','Rejected':'Pengajuan ditolak. Anda dapat kembali melihat daftar peserta di menu Temukan Pasangan.'};
        el.innerHTML=r.data.map(function(d){
            var bc='badge-pending';if(d.status==='Sedang Taaruf')bc='badge-taaruf';else if(d.status==='Sedang Proses')bc='badge-proses';else if(d.status==='Sudah Menikah')bc='badge-menikah';else if(d.status==='Rejected')bc='badge-rejected';
            return'<div class="status-card"><div class="status-card-header"><div class="status-card-title">'+esc(d.otherNama)+'</div><span class="badge '+bc+'">'+d.status+'</span></div><div class="status-card-meta"><i class="fas fa-info-circle"></i> '+(d.isPelamar?'Anda mengajukan':'Mengajukan Anda')+'<br><i class="fas fa-calendar"></i> '+d.tanggal+'<br><i class="fas fa-map-marker-alt"></i> '+esc(d.otherDaerah)+', '+esc(d.otherDesa)+'<br><i class="fas fa-users"></i> Kelompok target: '+esc(d.otherKelompok)+'<br><i class="fas fa-user-tag"></i> Kelompok Anda: '+esc(d.myKelompok)+'<br><div style="margin-top:5px;color:'+(d.status==='Rejected'?'#DC2626':'var(--green-700)')+';font-weight:600;font-size:.78rem">'+(sd[d.status]||'')+'</div></div></div>';
        }).join('');
    }else el.innerHTML='<div class="empty-state"><i class="fas fa-heart"></i><p>Belum ada pengajuan ta\'aruf.</p></div>';
}

/* ===== KEGIATAN ===== */
async function loadKegiatanCache(){try{var r=await fetchGAS('getKegiatan');if(r.status==='success')cachedKegiatan=r.data||[]}catch(e){}}
function renderKegiatanCards(data){
    if(!data||!data.length)return'<div class="empty-state"><i class="fas fa-bullhorn"></i><p>Belum ada informasi kegiatan.</p></div>';
    return data.map(function(k){var img=k.foto?'<img src="'+getPhotoUrl(k.foto)+'" loading="lazy" decoding="async" onclick="openPhotoModal(\''+getPhotoUrl(k.foto)+'\')" alt="Foto Kegiatan">':'';return'<div class="kegiatan-card">'+img+'<div class="kegiatan-card-body"><div class="kegiatan-card-title">'+esc(k.judul)+'</div><div class="kegiatan-card-content">'+esc(k.isi)+'</div></div><div class="kegiatan-card-footer"><span><i class="far fa-clock"></i> '+k.tanggal+'</span><span><i class="far fa-user"></i> '+esc(k.postedBy)+'</span></div></div>'}).join('');
}
async function loadKegiatanPage(){var e=document.getElementById('kegiatan-list');e.innerHTML='<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat...</p></div>';await loadKegiatanCache();e.innerHTML=renderKegiatanCards(cachedKegiatan)}
async function loadAdminKegiatan(){var e=document.getElementById('admin-kegiatan-list');e.innerHTML='<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat...</p></div>';await loadKegiatanCache();e.innerHTML=renderKegiatanCards(cachedKegiatan)}
async function handleAddKegiatan(e){
    e.preventDefault();var btn=document.getElementById('btnAddKg');btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Publikasi...';
    var fb=null,fi=document.getElementById('kgFoto');
    if(fi&&fi.files&&fi.files[0]){if(fi.files[0].size>3*1024*1024){showToast('Ukuran foto maks 3MB','error');btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Publikasikan';return}try{fb=await compressImage(fi.files[0],800,.75)}catch(err){showToast('Gagal proses foto','error');btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Publikasikan';return}}
    var r=await fetchGAS('addKegiatan',{},'POST',{judul:document.getElementById('kgJudul').value.trim(),isi:document.getElementById('kgIsi').value.trim(),foto:fb,postedBy:currentUser.nama});
    if(r.status==='success'){showToast(r.message);document.getElementById('kegiatanForm').reset();document.getElementById('kgFotoPreview').style.display='none';cachedKegiatan=[];loadAdminKegiatan()}
    else showToast(r.message||'Gagal mempublikasikan','error');
    btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Publikasikan';
}

/* ===== HOME STATS ===== */
async function loadHomeStats(){
    try{var r=await fetchGAS('getUsers',{role:'Personal',email:currentUser.email,gender:currentUser.gender||''});if(r.status==='success')document.getElementById('statPeserta').textContent=(r.data||[]).length}catch(e){}
    try{var r2=await fetchGAS('getMyTaaruf',{email:currentUser.email});if(r2.status==='success'){var d=r2.data||[];document.getElementById('statTaaruf').textContent=d.filter(function(r){return r.status==='Sedang Taaruf'||r.status==='Sedang Proses'}).length;document.getElementById('statMenikah').textContent=d.filter(function(r){return r.status==='Sudah Menikah'}).length}}catch(e){}
    document.getElementById('statKegiatan').textContent=cachedKegiatan.length||'0';
}

/* ===== ADMIN STATS + CHARTS ===== */
var adminStatsUsers=[];
async function loadAdminStats(){
    adminStatsUsers=[];
    try{var r=await fetchGAS('getUsers',{role:currentUser.role,email:currentUser.email,scope:currentUser.scope});if(r.status==='success'){adminStatsUsers=r.data||[];document.getElementById('statAdminPeserta').textContent=adminStatsUsers.length}}catch(e){}
    try{var r2=await fetchGAS('getAllTaaruf',{role:currentUser.role,email:currentUser.email,scope:currentUser.scope});if(r2.status==='success'){var d=r2.data||[];document.getElementById('statAdminPending').textContent=d.filter(function(r){return r.status==='Pending'}).length;document.getElementById('statAdminProses').textContent=d.filter(function(r){return r.status==='Sedang Taaruf'||r.status==='Sedang Proses'}).length;document.getElementById('statAdminMenikah').textContent=d.filter(function(r){return r.status==='Sudah Menikah'}).length}}catch(e){}
    await loadMasterData();renderAdminCharts(adminStatsUsers);
}
var chartColors=['#059669','#2563EB','#D97706','#DC2626','#7C3AED','#DB2777','#0891B2','#65A30D','#EA580C','#4F46E5','#BE185D','#0D9488','#CA8A04','#9333EA','#E11D48'];
function buildBarChart(title,icon,data,maxBars){
    if(!data||!data.length)return'<div class="chart-card"><div class="chart-card-title"><i class="fas '+icon+'"></i> '+title+'</div><div class="chart-empty">Belum ada data</div></div>';
    if(maxBars)data=data.slice(0,maxBars);
    var maxVal=0;data.forEach(function(d){if(d.count>maxVal)maxVal=d.count});maxVal=Math.max(maxVal,1);
    var h='<div class="chart-card"><div class="chart-card-title"><i class="fas '+icon+'"></i> '+title+'</div><div class="chart-bars">';
    data.forEach(function(d,i){var pct=Math.round((d.count/maxVal)*100);var color=chartColors[i%chartColors.length];h+='<div class="chart-row"><div class="chart-row-label" title="'+esc(d.label)+'">'+esc(d.label)+'</div><div class="chart-row-bar"><div class="chart-row-fill" style="width:'+pct+'%;background:'+color+'"></div></div><div class="chart-row-count">'+d.count+'</div></div>'});
    return h+'</div></div>';
}
function renderAdminCharts(users){
    var el=document.getElementById('admin-stats-charts');
    if(!users||!users.length){el.innerHTML='<div class="empty-state"><i class="fas fa-chart-bar"></i><p>Belum ada data peserta.</p></div>';return}
    var gM={},dM={},sM={},kM={};
    users.forEach(function(u){var g=u.gender||'-';gM[g]=(gM[g]||0)+1;var d=u.daerah||'-';dM[d]=(dM[d]||0)+1;var s=u.desa||'-';sM[s]=(sM[s]||0)+1;var k=u.kelompok||'-';kM[k]=(kM[k]||0)+1});
    function sortM(m){return Object.keys(m).map(function(k){return{label:k,count:m[k]}}).sort(function(a,b){return b.count-a.count})}
    var h='<div class="charts-grid">';
    h+=buildBarChart('Jenis Kelamin','fa-venus-mars',sortM(gM),10);
    h+=buildBarChart('Berdasarkan Daerah','fa-map-marker-alt',sortM(dM),15);
    h+=buildBarChart('Berdasarkan Desa','fa-home',sortM(sM),20);
    h+=buildBarChart('Berdasarkan Kelompok','fa-users',sortM(kM),20);
    h+='</div>';el.innerHTML=h;
}

/* ===== ADMIN DATA PESERTA ===== */
async function loadAdminUsers(){
    var t=document.getElementById('admin-tbody'),m=document.getElementById('admin-users-mobile'),pg=document.getElementById('admin-users-pagination');
    t.innerHTML='<tr><td colspan="5" style="text-align:center"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    m.innerHTML='<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat...</p></div>';
    pg.innerHTML='';adminCurrentPage=1;
    await loadMasterData();populateFilterDaerah('adminFilterDaerah');
    var r=await fetchGAS('getUsers',{role:currentUser.role,email:currentUser.email,scope:currentUser.scope});
    if(r.status==='error'){t.innerHTML='<tr><td colspan="5" style="text-align:center"><i class="fas fa-exclamation-triangle" style="color:var(--gold-500);margin-right:8px"></i>Gagal memuat data. <a class="link" onclick="loadAdminUsers()">Coba Lagi</a></td></tr>';m.innerHTML='';return}
    if(r.status==='success'&&r.data&&r.data.length>0){
        allUsers=r.data;userPhotoMap={};
        allUsers.forEach(function(u){if(u.foto&&u.email)userPhotoMap[u.email]=getPhotoUrl(u.foto)});
        renderAdminUsers();
    }else{allUsers=[];userPhotoMap={};t.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Tidak ada data.</td></tr>';m.innerHTML='<div class="empty-state"><i class="fas fa-users"></i><p>Tidak ada data.</p></div>'}
}
function getAdminFilteredList(){
    var s=(document.getElementById('adminSearchInput')?document.getElementById('adminSearchInput').value:'').toLowerCase(),fd=(document.getElementById('adminFilterDaerah')?document.getElementById('adminFilterDaerah').value:''),fv=(document.getElementById('adminFilterDesa')?document.getElementById('adminFilterDesa').value:''),fk=(document.getElementById('adminFilterKelompok')?document.getElementById('adminFilterKelompok').value:'');
    return allUsers.filter(function(u){if(s&&(u.nama&&u.nama.toLowerCase().indexOf(s)===-1))return false;if(fd&&u.daerah!==fd)return false;if(fv&&u.desa!==fv)return false;if(fk&&u.kelompok!==fk)return false;return true});
}
function renderAdminUsers(){
    var t=document.getElementById('admin-tbody'),m=document.getElementById('admin-users-mobile'),pg=document.getElementById('admin-users-pagination'),filtered=getAdminFilteredList(),tp=Math.max(1,Math.ceil(filtered.length/adminPageSize));
    if(adminCurrentPage>tp)adminCurrentPage=tp;
    var st=(adminCurrentPage-1)*adminPageSize,pi=filtered.slice(st,st+adminPageSize);
    if(!filtered.length){t.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Tidak ditemukan.</td></tr>';m.innerHTML='<div class="empty-state"><i class="fas fa-search"></i><p>Tidak ditemukan.</p></div>';pg.innerHTML='';return}
    
    t.innerHTML=pi.map(function(u){
        var sc=u.isComplete?'badge-approved':'badge-pending',stxt=u.isComplete?'Lengkap':'Belum',ps=u.foto?getPhotoUrl(u.foto):'',gc=u.gender==='Perempuan'?'badge-f':'badge-m';
        var kr=u.kriteriaPasangan?'<div class="data-cell-line" style="margin-top:2px"><b style="color:var(--gold-500)">Kriteria:</b> <span style="font-size:.72rem;color:var(--text-muted)">'+esc(u.kriteriaPasangan).substring(0,70)+(u.kriteriaPasangan.length>70?'...':'')+'</span></div>':'';
        var ph=ps?'<div class="admin-photo-cell"><img data-src="'+ps+'" class="admin-photo lazy-img" onclick="openPhotoModal(\''+ps+'\')"></div>':'<div class="admin-photo-cell"><div class="admin-photo-placeholder">'+getInitials(u.nama)+'</div></div>';
        return'<tr><td><div style="display:flex;align-items:center;gap:9px">'+ph+'<div><div style="font-weight:700;color:var(--text-dark)">'+esc(u.nama)+'</div><div class="sub-text">'+esc(u.email)+'</div><div style="margin-top:2px"><span class="badge '+gc+'">'+esc(u.gender||'-')+'</span></div></div></div></td><td><div class="data-cell-line"><b>Ortu:</b> '+esc(u.namaOrtu)+'</div><div class="data-cell-line"><b>TTL:</b> '+esc(u.ttl)+'</div><div class="data-cell-line"><b>Anak ke:</b> '+esc(u.anakKe)+'</div><div class="data-cell-line"><b>Suku:</b> '+esc(u.suku)+' | <b>TB/BB:</b> '+esc(u.tbBerat)+'</div><div class="data-cell-line"><b>Status:</b> '+esc(u.menikah)+'</div></td><td><div class="data-cell-line"><b>Pendidikan:</b> '+esc(u.pendidikan)+'</div><div class="data-cell-line"><b>Pekerjaan:</b> '+esc(u.pekerjaan)+'</div><div class="data-cell-line"><b>Hobi:</b> '+esc(u.hobi)+'</div><div class="data-cell-line"><b>Dapukan:</b> '+esc(u.dapukan)+'</div>'+kr+'</td><td><div class="data-cell-line">'+esc(u.daerah)+'</div><div class="data-cell-line">'+esc(u.desa)+'</div><div class="data-cell-line">'+esc(u.kelompok)+'</div></td><td><span class="badge '+sc+'">'+stxt+'</span></td></tr>';
    }).join('');
    observeLazyImgs(t);

    m.innerHTML=pi.map(function(u){
        var ps=u.foto?getPhotoUrl(u.foto):'',sc=u.isComplete?'badge-approved':'badge-pending',stxt=u.isComplete?'Lengkap':'Belum',gc=u.gender==='Perempuan'?'badge-f':'badge-m';
        var kr=u.kriteriaPasangan?'<div class="am-kriteria"><b>Kriteria Pasangan</b><br>'+esc(u.kriteriaPasangan)+'</div>':'';
        var ph=ps?'<img data-src="'+ps+'" class="am-header-photo lazy-img" onclick="openPhotoModal(\''+ps+'\')">':'<div class="am-header-ph">'+getInitials(u.nama)+'</div>';
        return'<div class="am-card"><div class="am-header">'+ph+'<div class="am-header-info"><div class="am-header-name">'+esc(u.nama)+'</div><div class="am-header-email">'+esc(u.email)+'</div><div class="am-header-badges"><span class="badge '+gc+'">'+esc(u.gender||'-')+'</span><span class="badge '+sc+'">'+stxt+'</span></div></div></div><div class="am-section"><div class="am-section-title">Data Pribadi</div><div class="am-data-grid"><div class="am-data-item"><div class="am-label">Orang Tua</div><div class="am-value">'+esc(u.namaOrtu)+'</div></div><div class="am-data-item"><div class="am-label">TTL</div><div class="am-value">'+esc(u.ttl)+'</div></div><div class="am-data-item"><div class="am-label">Anak Ke</div><div class="am-value">'+esc(u.anakKe)+'</div></div><div class="am-data-item"><div class="am-label">Suku</div><div class="am-value">'+esc(u.suku)+'</div></div><div class="am-data-item"><div class="am-label">TB / BB</div><div class="am-value">'+esc(u.tbBerat)+'</div></div><div class="am-data-item"><div class="am-label">Status</div><div class="am-value">'+esc(u.menikah)+'</div></div></div></div><div class="am-section"><div class="am-section-title">Pekerjaan & Lainnya</div><div class="am-data-grid"><div class="am-data-item"><div class="am-label">Pendidikan</div><div class="am-value">'+esc(u.pendidikan)+'</div></div><div class="am-data-item"><div class="am-label">Pekerjaan</div><div class="am-value">'+esc(u.pekerjaan)+'</div></div><div class="am-data-item"><div class="am-label">Hobi</div><div class="am-value">'+esc(u.hobi)+'</div></div><div class="am-data-item"><div class="am-label">Dapukan</div><div class="am-value">'+esc(u.dapukan)+'</div></div></div>'+kr+'</div><div class="am-section"><div class="am-section-title">Wilayah</div><div class="am-data-grid"><div class="am-data-item"><div class="am-label">Daerah</div><div class="am-value">'+esc(u.daerah)+'</div></div><div class="am-data-item"><div class="am-label">Desa</div><div class="am-value">'+esc(u.desa)+'</div></div><div class="am-data-item am-full"><div class="am-label">Kelompok</div><div class="am-value">'+esc(u.kelompok)+'</div></div></div></div></div>';
    }).join('');
    observeLazyImgs(m);

    generatePagination('admin-users-pagination',adminCurrentPage,tp,filtered.length,adminPageSize,'goToAdminPage');
}
function filterAdminWithFilters(){adminCurrentPage=1;renderAdminUsers()}

/* ================================================================
   ADMIN TAARUF — Presisi, Mobile-Friendly, Bottom Sheet Modal
   ================================================================ */
var statusMessages={
    'Sedang Taaruf':{icon:'fa-heart',iconClass:'sc-info',title:'Mulai Proses Ta\'aruf',desc:'Pengajuan ta\'aruf akan diterima dan status diubah menjadi <b>Sedang Taaruf</b>. Pastikan kedua pihak sudah dikonfirmasi.',btnClass:'btn-info-sm',btnIcon:'fa-heart',btnText:'Ya, Mulai Ta\'aruf'},
    'Sedang Proses':{icon:'fa-spinner',iconClass:'sc-warning',title:'Ubah ke Sedang Proses',desc:'Status akan diubah menjadi <b>Sedang Proses</b>. Biasanya setelah proses ta\'aruf berlanjut ke tahap selanjutnya.',btnClass:'btn-warning-sm',btnIcon:'fa-spinner',btnText:'Ya, Ubah Status'},
    'Sudah Menikah':{icon:'fa-ring',iconClass:'sc-success',title:'Ubah ke Sudah Menikah',desc:'Status akan diubah menjadi <b>Sudah Menikah</b>. Tindakan ini menandakan proses ta\'aruf telah selesai hingga akad nikah.',btnClass:'btn-success',btnIcon:'fa-ring',btnText:'Ya, Sudah Menikah'},
    'Rejected':{icon:'fa-times-circle',iconClass:'sc-danger',title:'Tolak Pengajuan',desc:'Pengajuan ta\'aruf ini akan <b>ditolak</b>. Pelamar dapat kembali melihat daftar peserta setelah ditolak.',btnClass:'btn-danger-sm',btnIcon:'fa-times',btnText:'Ya, Tolak Pengajuan'}
};
function getBadgeClass(s){var m={'Pending':'badge-pending','Sedang Taaruf':'badge-taaruf','Sedang Proses':'badge-proses','Sudah Menikah':'badge-menikah','Rejected':'badge-rejected'};return m[s]||'badge-pending'}

function renderTaarufSummary(reqs){
    var el=document.getElementById('taaruf-summary'),c={Pending:0,'Sedang Taaruf':0,'Sedang Proses':0,'Sudah Menikah':0,Rejected:0};
    reqs.forEach(function(r){if(c.hasOwnProperty(r.status))c[r.status]++});
    var items=[{l:'Pending',c:c.Pending,b:'badge-pending'},{l:'Taaruf',c:c['Sedang Taaruf'],b:'badge-taaruf'},{l:'Proses',c:c['Sedang Proses'],b:'badge-proses'},{l:'Menikah',c:c['Sudah Menikah'],b:'badge-menikah'},{l:'Ditolak',c:c.Rejected,b:'badge-rejected'}];
    el.innerHTML=items.map(function(i){return'<span class="badge '+i.b+'" style="font-size:.7rem;padding:3px 11px">'+i.l+': <b>'+i.c+'</b></span>'}).join('');
}

function filterTaaruf(btn,filter){currentTaarufFilter=filter;taarufCurrentPage=1;document.querySelectorAll('#taarufFilterTabs .filter-tab').forEach(function(b){b.classList.remove('active')});btn.classList.add('active');renderAdminTaaruf()}

function buildScPersonPhoto(email,nama){
    var ps=userPhotoMap[email]||'';
    if(ps)return'<img src="'+ps+'" class="sc-person-photo" loading="lazy">';
    return'<div class="sc-person-ph">'+getInitials(nama)+'</div>';
}

/* ===== STATUS CHANGE MODAL ===== */
function openScModal(pE,tE,ns){
    var cfg=statusMessages[ns];if(!cfg)return;
    var req=allTaarufRequests.find(function(r){return r.pelamarEmail===pE&&r.targetEmail===tE});if(!req)return;
    var body=document.getElementById('sc-modal-body');
    var ob='<span class="sc-flow-badge badge '+getBadgeClass(req.status)+'">'+req.status+'</span>';
    var nb='<span class="sc-flow-badge badge '+getBadgeClass(ns)+'">'+ns+'</span>';
    body.innerHTML='<div class="sc-modal-icon '+cfg.iconClass+'"><i class="fas '+cfg.icon+'"></i></div><div class="sc-modal-title">'+cfg.title+'</div><div class="sc-modal-desc">'+cfg.desc+'</div><div class="sc-flow">'+ob+'<i class="fas fa-arrow-right sc-flow-arrow"></i>'+nb+'</div><div class="sc-people"><div class="sc-person">'+buildScPersonPhoto(req.pelamarEmail,req.pelamarNama)+'<div class="sc-person-info"><div class="sc-person-label" style="color:var(--gold-500)"><i class="fas fa-paper-plane"></i> Pelamar</div><div class="sc-person-name">'+esc(req.pelamarNama)+'</div><div class="sc-person-sub">'+esc(req.pelamarDaerah)+', '+esc(req.pelamarDesa)+' &middot; '+esc(req.pelamarKelompok)+'</div></div></div><div class="sc-person">'+buildScPersonPhoto(req.targetEmail,req.targetNama)+'<div class="sc-person-info"><div class="sc-person-label" style="color:var(--green-700)"><i class="fas fa-bullseye"></i> Target</div><div class="sc-person-name">'+esc(req.targetNama)+'</div><div class="sc-person-sub">'+esc(req.targetDaerah)+', '+esc(req.targetDesa)+' &middot; '+esc(req.targetKelompok)+'</div></div></div></div><div class="sc-modal-actions"><button class="btn '+cfg.btnClass+'" onclick="confirmScModal(\''+esc(pE)+'\',\''+esc(tE)+'\',\''+ns+'\')"><i class="fas '+cfg.btnIcon+'"></i> '+cfg.btnText+'</button><button class="btn btn-ghost" onclick="closeScModal()"><i class="fas fa-arrow-left"></i> Batal</button></div>';
    document.getElementById('sc-modal').classList.remove('hidden');document.body.style.overflow='hidden';
}
function closeScModal(e){if(e&&e.target!==e.currentTarget)return;document.getElementById('sc-modal').classList.add('hidden');document.body.style.overflow=''}
async function confirmScModal(pE,tE,ns){
    document.getElementById('sc-modal').classList.add('hidden');document.body.style.overflow='';showLoading();
    var r=await fetchGAS('updateTaarufStatus',{},'POST',{pelamarEmail:pE,targetEmail:tE,newStatus:ns});hideLoading();
    if(r.status==='success'){showToast(r.message);loadAdminTaaruf();refreshNotifCount()}else showToast(r.message||'Gagal update','error');
}

/* ===== LOAD & RENDER ADMIN TAARUF ===== */
async function loadAdminTaaruf(){
    var el=document.getElementById('admin-taaruf-list'),pg=document.getElementById('admin-taaruf-pagination');
    el.innerHTML='<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-spinner fa-spin"></i><p>Memuat...</p></div>';
    pg.innerHTML='';taarufCurrentPage=1;
    if(!Object.keys(userPhotoMap).length){try{var ur=await fetchGAS('getUsers',{role:currentUser.role,email:currentUser.email,scope:currentUser.scope});if(ur.status==='success'&&ur.data){userPhotoMap={};ur.data.forEach(function(u){if(u.foto&&u.email)userPhotoMap[u.email]=getPhotoUrl(u.foto)})}}catch(e){}}
    var r=await fetchGAS('getAllTaaruf',{role:currentUser.role,email:currentUser.email,scope:currentUser.scope});
    if(r.status!=='success'){el.innerHTML='<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-exclamation-triangle" style="color:var(--gold-500)"></i><p>Gagal memuat data.</p><button class="btn btn-sm retry-btn" onclick="loadAdminTaaruf()"><i class="fas fa-redo"></i> Coba Lagi</button></div>';return}
    if(r.data&&r.data.length>0){allTaarufRequests=r.data;renderTaarufSummary(allTaarufRequests);renderAdminTaaruf()}
    else{allTaarufRequests=[];renderTaarufSummary([]);el.innerHTML='<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-heart"></i><p>Belum ada pengajuan.</p></div>'}
}

function renderAdminTaaruf(){
    var el=document.getElementById('admin-taaruf-list'),pg=document.getElementById('admin-taaruf-pagination');
    var filtered=currentTaarufFilter?allTaarufRequests.filter(function(r){return r.status===currentTaarufFilter}):allTaarufRequests;
    var tp=Math.max(1,Math.ceil(filtered.length/taarufPageSize));
    if(taarufCurrentPage>tp)taarufCurrentPage=tp;
    var st=(taarufCurrentPage-1)*taarufPageSize,pi=filtered.slice(st,st+taarufPageSize);
    if(!filtered.length){el.innerHTML='<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-filter"></i><p>Tidak ada data untuk filter ini.</p></div>';pg.innerHTML='';return}

    el.innerHTML=pi.map(function(r){
        var pPs=userPhotoMap[r.pelamarEmail]||'';
        var tPs=userPhotoMap[r.targetEmail]||'';
        var pPhoto=pPs?'<img data-src="'+pPs+'" class="taaruf-desk-person-photo lazy-img" onclick="openPhotoModal(\''+pPs+'\')">':'<div class="taaruf-desk-person-ph">'+getInitials(r.pelamarNama)+'</div>';
        var tPhoto=tPs?'<img data-src="'+tPs+'" class="taaruf-desk-person-photo lazy-img" onclick="openPhotoModal(\''+tPs+'\')">':'<div class="taaruf-desk-person-ph">'+getInitials(r.targetNama)+'</div>';
        
        var actionHtml='';
        if(r.status==='Pending')actionHtml='<button class="btn btn-sm btn-info-sm" onclick="openScModal(\''+r.pelamarEmail+'\',\''+r.targetEmail+'\',\'Sedang Taaruf\')"><i class="fas fa-heart"></i> Terima</button><button class="btn btn-sm btn-danger-sm" onclick="openScModal(\''+r.pelamarEmail+'\',\''+r.targetEmail+'\',\'Rejected\')"><i class="fas fa-times"></i> Tolak</button>';
        else if(r.status==='Sedang Taaruf')actionHtml='<button class="btn btn-sm btn-warning-sm" onclick="openScModal(\''+r.pelamarEmail+'\',\''+r.targetEmail+'\',\'Sedang Proses\')"><i class="fas fa-spinner"></i> Proses</button><button class="btn btn-sm btn-danger-sm" onclick="openScModal(\''+r.pelamarEmail+'\',\''+r.targetEmail+'\',\'Rejected\')"><i class="fas fa-times"></i> Tolak</button>';
        else if(r.status==='Sedang Proses')actionHtml='<button class="btn btn-sm btn-success" onclick="openScModal(\''+r.pelamarEmail+'\',\''+r.targetEmail+'\',\'Sudah Menikah\')"><i class="fas fa-ring"></i> Menikah</button><button class="btn btn-sm btn-danger-sm" onclick="openScModal(\''+r.pelamarEmail+'\',\''+r.targetEmail+'\',\'Rejected\')"><i class="fas fa-times"></i> Tolak</button>';
        else if(r.status==='Sudah Menikah')actionHtml='<span style="color:var(--green-700);font-weight:700;font-size:.8rem"><i class="fas fa-check-circle"></i> Selesai</span>';
        else if(r.status==='Rejected')actionHtml='<span style="color:#DC2626;font-weight:600;font-size:.78rem"><i class="fas fa-times-circle"></i> Ditolak</span>';

        return'<div class="taaruf-desk-card">'+
            '<div class="taaruf-desk-header"><div class="taaruf-desk-date"><i class="far fa-calendar"></i> '+r.tanggal+'</div><span class="badge '+getBadgeClass(r.status)+'">'+r.status+'</span></div>'+
            '<div class="taaruf-desk-body"><div class="taaruf-desk-flow">'+
                '<div class="taaruf-desk-person"><div class="taaruf-desk-person-label lbl-pelamar"><i class="fas fa-paper-plane"></i> Pelamar</div><div class="taaruf-desk-person-row">'+pPhoto+'<div class="taaruf-desk-person-info"><div class="taaruf-desk-person-name">'+esc(r.pelamarNama)+'</div><div class="taaruf-desk-person-sub">'+esc(r.pelamarDaerah)+', '+esc(r.pelamarDesa)+' &middot; '+esc(r.pelamarKelompok)+'</div></div></div></div>'+
                '<div class="taaruf-desk-arrow"><i class="fas fa-arrow-right"></i></div>'+
                '<div class="taaruf-desk-person"><div class="taaruf-desk-person-label lbl-target"><i class="fas fa-bullseye"></i> Target</div><div class="taaruf-desk-person-row">'+tPhoto+'<div class="taaruf-desk-person-info"><div class="taaruf-desk-person-name">'+esc(r.targetNama)+'</div><div class="taaruf-desk-person-sub">'+esc(r.targetDaerah)+', '+esc(r.targetDesa)+' &middot; '+esc(r.targetKelompok)+'</div></div></div></div>'+
            '</div></div>'+
            '<div class="taaruf-desk-footer">'+actionHtml+'</div>'+
        '</div>';
    }).join('');
    
    observeLazyImgs(el);
    generatePagination('admin-taaruf-pagination',taarufCurrentPage,tp,filtered.length,taarufPageSize,'goToTaarufPage');
}

/* Keyboard Shortcuts */
document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){var sc=document.getElementById('sc-modal');if(!sc.classList.contains('hidden')){closeScModal();return}var pm=document.querySelector('.photo-modal-overlay');if(pm)closePhotoModal()}
});
