// Minimal Firebase compat mock (in-memory, prunes empty objects like RTDB)
(function(){
  var tree=window.__SEED?JSON.parse(JSON.stringify(window.__SEED)):{}, listeners=[]; window.__reads=[];
  function prune(o){ if(o===null||typeof o!=='object') return o; var r={},n=0; Object.keys(o).forEach(function(k){var v=prune(o[k]); if(v!==null&&v!==undefined){r[k]=v;n++;}}); return n?r:null; }
  function get(path){ var o=tree; path.split('/').filter(Boolean).forEach(function(p){ o=(o&&typeof o==='object')?o[p]:undefined; }); return o===undefined?null:JSON.parse(JSON.stringify(o)); }
  function setP(path,val){ var parts=path.split('/').filter(Boolean),o=tree; for(var i=0;i<parts.length-1;i++){ if(!o[parts[i]]||typeof o[parts[i]]!=='object')o[parts[i]]={}; o=o[parts[i]]; } var l=parts[parts.length-1]; if(val===null)delete o[l]; else o[l]=JSON.parse(JSON.stringify(val)); tree=prune(tree)||{}; }
  function fire(){ setTimeout(function(){ listeners.forEach(function(L){ L.cb({val:function(){return get(L.path);}}); }); },5); }
  window.__fbTree=function(){return tree;};
  window.__fbWrites=0;
  function ref(path){ return {
    on:function(ev,cb,err){ window.__reads.push(['on',path,JSON.stringify(get(path)||'').length]); listeners.push({path:path,cb:cb}); setTimeout(function(){cb({val:function(){return get(path);}});},10); },
    set:function(v){ window.__fbWrites++; setP(path,v); fire(); return Promise.resolve(); },
    update:function(m){ window.__fbWrites++; Object.keys(m).forEach(function(k){ setP(path+'/'+k,m[k]); }); fire(); return Promise.resolve(); },
    once:function(){ var v=get(path); window.__reads.push(['once',path,JSON.stringify(v||'').length]); return Promise.resolve({val:function(){return v;},exists:function(){return v!==null;}}); },
    off:function(){ listeners=listeners.filter(function(L){return L.path!==path;}); },
    limitToFirst:function(){ return this; }
  };}
  var authCbs=[];
  window.firebase={apps:[],initializeApp:function(){this.apps.push(1);},database:function(){return {ref:ref};},
    auth:function(){return {onAuthStateChanged:function(cb){authCbs.push(cb);},signInAnonymously:function(){setTimeout(function(){authCbs.forEach(function(c){c({uid:'u1'});});},10);return Promise.resolve();}};}};
})();
