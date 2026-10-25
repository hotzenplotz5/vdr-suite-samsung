// Tizen KeyManager: Device secret only in platform storage, never localStorage.
// Tizen >=3.0 MUST NOT declare keymanager privilege (Samsung API docs).
export function createDeviceVault(environment) {
  var manager = environment && environment.tizen && environment.tizen.keymanager;
  var alias = {name:"vdr-suite-samsung-device-v1"};
  var probeAlias = {name:"vdr-suite-samsung-vault-check"};
  function supported() {
    return !!(manager && typeof manager.getData === "function" &&
      typeof manager.getDataAliasList === "function" &&
      typeof manager.saveData === "function" &&
      typeof manager.removeData === "function");
  }
  function read() {
    if (!supported()) return {ok:false,kind:"unsupported"};
    try {
      var aliases=manager.getDataAliasList();
      var found=false;
      for (var i=0;i<aliases.length;i+=1) {
        if (aliases[i] && aliases[i].name===alias.name) {found=true;break;}
      }
      if (!found) return {ok:true,credential:null};
      var data=JSON.parse(manager.getData(alias));
      if (!data || data.version!==1 ||
          typeof data.base!=="string" || typeof data.deviceId!=="string" ||
          typeof data.actorId!=="string" || typeof data.credentialId!=="string" ||
          typeof data.credentialSecret!=="string" || !data.credentialSecret) {
        return {ok:false,kind:"corrupt"};
      }
      return {ok:true,credential:data};
    } catch (_) {return {ok:false,kind:"storage"};}
  }
  function preflight(done) {
    var prior=read();
    if (!prior.ok || prior.credential) {done(prior);return;}
    var challenge="vdr-suite-keymanager-v1";
    try {
      manager.saveData(probeAlias.name,challenge,null,function () {
        try {
          var ok=manager.getData(probeAlias)===challenge;
          manager.removeData(probeAlias);
          done(ok ? {ok:true,credential:null} : {ok:false,kind:"storage"});
        } catch (_) {done({ok:false,kind:"storage"});}
      },function () {done({ok:false,kind:"storage"});});
    } catch (_) {done({ok:false,kind:"storage"});}
  }
  function store(credential,done) {
    var existing=read();
    if (existing.ok && existing.credential &&
        existing.credential.credentialId===credential.credentialId &&
        existing.credential.credentialSecret===credential.credentialSecret &&
        existing.credential.base===credential.base) {
      done({ok:true,credential:existing.credential});return;
    }
    if (!existing.ok || existing.credential) {
      done({ok:false,kind:existing.ok?"occupied":existing.kind});return;
    }
    var data=JSON.stringify({
      version:1,base:credential.base,actorId:credential.actorId,deviceId:credential.deviceId,
      credentialId:credential.credentialId,credentialSecret:credential.credentialSecret
    });
    try {
      manager.saveData(alias.name,data,null,function () {
        // Read back the exact secret before claiming pairing has succeeded.
        var check=read();
        if (!check.ok || !check.credential ||
            check.credential.credentialId!==credential.credentialId ||
            check.credential.credentialSecret!==credential.credentialSecret) {
          done({ok:false,kind:"storage"});return;
        }
        done({ok:true,credential:check.credential});
      },function () {done({ok:false,kind:"storage"});});
    } catch (_) {done({ok:false,kind:"storage"});}
  }
  return {read:read,preflight:preflight,store:store,supported:supported};
}
