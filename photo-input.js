'use strict';
let imageImportBusy=false,captureBusy=false,pendingCapture=null,capturePreviewUrl=null;
function photoEditorReady(){return !!state.active&&$('editor').open&&!state.photoBusy&&!imageImportBusy&&!captureBusy&&!pendingCapture;}
async function importPhotoFile(file){
 if(!file||!photoEditorReady()){say('사진 작업이 끝난 뒤 다시 시도해 주세요.');return;}
 imageImportBusy=true;
 try{await photo(file);}finally{imageImportBusy=false;}
}
function transferImage(data){return Array.from(data?.files||[]).find(f=>f.type.startsWith('image/'))||Array.from(data?.items||[]).find(i=>i.kind==='file'&&i.type.startsWith('image/'))?.getAsFile();}
const dropZone=$('photoPreview');
dropZone.addEventListener('dragover',e=>{if(!state.active)return;e.preventDefault();e.dataTransfer.dropEffect=photoEditorReady()?'copy':'none';dropZone.classList.add('drag-active');});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('drag-active'));
dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('drag-active');const f=transferImage(e.dataTransfer);if(f)act(()=>importPhotoFile(f));else say('이미지 파일을 끌어다 놓아 주세요. 웹 이미지는 복사한 뒤 Ctrl+V로 붙여넣을 수도 있어요.');});
$('editor').addEventListener('dragover',e=>{if(Array.from(e.dataTransfer?.types||[]).includes('Files'))e.preventDefault();});
$('editor').addEventListener('drop',e=>{if(Array.from(e.dataTransfer?.types||[]).includes('Files'))e.preventDefault();});
document.addEventListener('paste',e=>{if(!$('editor').open||!state.active||$('capturePreview').open)return;const f=transferImage(e.clipboardData);if(!f)return;e.preventDefault();act(()=>importPhotoFile(f));});
$('photo').onchange=e=>act(()=>importPhotoFile(e.target.files[0]));
function discardCapture(){pendingCapture=null;if(capturePreviewUrl)URL.revokeObjectURL(capturePreviewUrl);capturePreviewUrl=null;$('capturedImage').removeAttribute('src');$('capturePreview').close();}
async function captureScreen(){
 if(!photoEditorReady())return;
 if(!navigator.mediaDevices?.getDisplayMedia||!window.ImageCapture){say('이 브라우저에서는 Windows + Shift + S로 캡처한 뒤 Ctrl+V로 붙여넣어 주세요.');return;}
 const recordId=state.active.id;let stream,bitmap;captureBusy=true;$('screenCapture').disabled=true;
 try{
  stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
  bitmap=await new ImageCapture(stream.getVideoTracks()[0]).grabFrame();
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('CAPTURE_FAILED');
  if(state.active?.id!==recordId||!$('editor').open)return;
  pendingCapture={recordId,file:new File([blob],'화면-캡처.png',{type:'image/png'})};capturePreviewUrl=URL.createObjectURL(blob);$('capturedImage').src=capturePreviewUrl;$('capturePreview').showModal();
 }catch(e){say(e.name==='NotAllowedError'?'화면 캡처를 취소했거나 허용하지 않았어요.':'화면을 가져오지 못했어요. Windows + Shift + S로 캡처한 뒤 Ctrl+V로 붙여넣어 주세요.');}
 finally{stream?.getTracks().forEach(t=>t.stop());bitmap?.close();captureBusy=false;$('screenCapture').disabled=false;}
}
$('screenCapture').onclick=()=>captureScreen();
$('cancelCapture').onclick=discardCapture;$('capturePreview').addEventListener('cancel',e=>{e.preventDefault();discardCapture();});
$('useCapture').onclick=()=>{const p=pendingCapture;discardCapture();if(p&&state.active?.id===p.recordId)act(()=>importPhotoFile(p.file));};
