(()=>{
'use strict';
function downloadBlob(name,type,blob){
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name||'parkops_export.txt';a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1500);return true;
}
async function copyText(value){
  const text=String(value??'');
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true}}catch{}
  const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();let ok=false;try{ok=document.execCommand('copy')}catch{}t.remove();return ok;
}
if(!window.AndroidBridge){
  window.AndroidBridge={
    async shareText(text){
      const value=String(text??'');
      try{if(navigator.share){await navigator.share({text:value});return true}}catch(e){if(e&&e.name==='AbortError')return false}
      const ok=await copyText(value);if(ok)alert('Contenido copiado al portapapeles.');return ok;
    },
    saveTextFile(fileName,mimeType,content){return downloadBlob(fileName,mimeType,new Blob([String(content??'')],{type:mimeType||'text/plain;charset=utf-8'}))}
  };
}
if(!window.AndroidDownload){
  window.AndroidDownload={
    guardar(fileName,mimeType,b64){
      try{
        const raw=atob(String(b64||''));const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
        return downloadBlob(fileName,mimeType,new Blob([bytes],{type:mimeType||'application/octet-stream'}));
      }catch(e){console.warn('PARKOPS: no se pudo guardar el archivo',e);return false}
    }
  };
}
})();
