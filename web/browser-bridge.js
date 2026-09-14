(()=>{
'use strict';
if(!window.AndroidBridge){
  window.AndroidBridge={
    async shareText(text){
      const value=String(text??'');
      try{
        if(navigator.share){await navigator.share({text:value});return true;}
        if(navigator.clipboard){await navigator.clipboard.writeText(value);alert('Contenido copiado al portapapeles.');return true;}
      }catch(e){}
      const t=document.createElement('textarea');t.value=value;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();alert('Contenido copiado al portapapeles.');return true;
    },
    saveTextFile(fileName,content,mimeType){
      const blob=new Blob([String(content??'')],{type:mimeType||'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName||'parkops.txt';a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);return true;
    }
  };
}
})();