'use strict';
let visitorCode='',visitorIssuedClass=null,commentRecord=null,commentRows=[],commentRequest=0;
async function visitorRequest(action,extra={}){
 const response=await fetch(cfg.url+'/functions/v1/museum-visitor',{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.publishableKey},body:JSON.stringify({code:visitorCode,action,...extra})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'REQUEST_FAILED');return data;
}
function communityError(e){const s=String(e?.message||e);if(s.includes('INVALID_VISITOR_CODE'))return '관람 코드가 올바르지 않거나 관람이 중지되었습니다. 선생님께 새 코드를 확인해 주세요.';if(s.includes('COMMENT_DUPLICATE'))return '같은 댓글이 이미 접수되었습니다. 교사 승인을 기다려 주세요.';if(s.includes('COMMENT_LIMIT'))return '댓글이 많이 접수되고 있어요. 잠시 뒤 다시 시도해 주세요.';if(s.includes('EXHIBIT_UNAVAILABLE'))return '현재 전시 중인 작품이 아닙니다. 새로 확인해 주세요.';if(s.includes('VERSION_CONFLICT'))return '다른 곳에서 댓글 상태가 바뀌었습니다. 댓글을 다시 열어 주세요.';return '처리하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.';}
async function communityAct(fn,button,target='message'){if(button?.disabled)return;try{if(button)button.disabled=true;await fn();}catch(e){$(target).textContent=communityError(e);}finally{if(button)button.disabled=false;}}
function resetVisitor(){visitorCode='';state.visitor=false;$('parentCode').value='';$('parentLoginMessage').textContent='';$('visitorCredentials').hidden=true;$('visitorLink').value='';$('visitorQr').replaceChildren();visitorIssuedClass=null;commentRequest++;$('commentsDialog').close();}
async function enterVisitor(){
 visitorCode=$('parentCode').value.replace(/[\s-]/g,'').toUpperCase();const data=await visitorRequest('view');
 if(client)await client.auth.signOut({scope:'local'});
 state.demo=false;state.teacher=false;state.visitor=true;state.user={id:'visitor'};state.classroom=data.classroom;state.classes=[data.classroom];state.records=data.records;state.feedback=[];state.members=[];state.active=null;state.gallery='all';
 $('welcome').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;$('demoWarning').hidden=true;$('teacherTab').hidden=true;
 document.querySelector('[data-tab="mine"]').hidden=true;document.querySelector('[data-tab="backup"]').hidden=true;
 $('parentCode').value='';$('classLabel').textContent=data.classroom.name+' · 학부모 관람';$('hello').textContent='우리 아이들의 발견을 함께 감상해요';render();tab('gallery');
}
async function loadVisitor(){try{const data=await visitorRequest('view');state.records=data.records;imageURLs.clear();render();}catch(e){state.records=[];render();throw e;}}
async function refreshVisitorAdmin(){
 if(visitorIssuedClass!==state.classroom?.id){$('visitorCredentials').hidden=true;$('visitorLink').value='';$('visitorQr').replaceChildren();visitorIssuedClass=null;}
 if(state.demo){$('visitorStatus').textContent='연습 공간에서는 관람 코드가 발급되지 않습니다.';return;}
 if(!state.teacher||!state.classroom)return;
 const info=await api('museum_visitor_admin',{p_classroom:state.classroom.id,p_action:'info'});$('visitorStatus').textContent=info.active?'학부모 관람이 열려 있습니다.':'학부모 관람이 닫혀 있습니다.';
 const r=await client.from('museum_comments').select('id',{count:'exact',head:true}).eq('classroom_id',state.classroom.id).eq('status','pending');if(r.error)throw r.error;$('commentQueue').textContent='댓글 승인 대기 '+(r.count||0)+'개';
}
async function issueVisitor(){
 if(state.demo){say('실제 교사 계정에서 관람 코드를 발급해 주세요.');return;}if(!state.classroom)return;
 if(!confirm('새 관람 코드를 발급할까요? 기존 관람 코드와 링크는 사용할 수 없게 됩니다.'))return;
 const cid=state.classroom.id,info=await api('museum_visitor_admin',{p_classroom:cid,p_action:'issue'});if(state.classroom?.id!==cid)return;
 const u=new URL(location.href);u.search='';u.hash='visit='+info.code;$('visitorLink').value=u.href;$('visitorCodeDisplay').textContent=info.code.match(/.{1,4}/g).join('-');
 $('visitorCredentials').hidden=false;visitorIssuedClass=cid;$('visitorQr').replaceChildren();if(typeof qrcode==='function'){const qr=qrcode(0,'M');qr.addData(u.href);qr.make();$('visitorQr').innerHTML=qr.createSvgTag({cellSize:4,margin:4});}await refreshVisitorAdmin();
}
async function disableVisitor(){if(state.demo||!state.classroom)return;if(!confirm('학부모 관람을 중지할까요? 다시 열려면 새 코드를 발급해야 합니다.'))return;await api('museum_visitor_admin',{p_classroom:state.classroom.id,p_action:'disable'});visitorIssuedClass=null;$('visitorCredentials').hidden=true;$('visitorLink').value='';await refreshVisitorAdmin();}
function commentItem(c){return `<article class="feedback"><b>${esc(c.author_kind==='teacher'?'선생님':c.display_name+' · 학부모 입력 이름')}</b><p class="comment-text">${esc(c.body)}</p><small>${esc(new Date(c.created_at).toLocaleString('ko-KR'))}${state.teacher?' · '+esc({pending:'승인 대기',approved:'공개 중',rejected:'비공개'}[c.status]||''):''}</small>${state.teacher?`<div class="actions">${c.status!=='approved'?`<button class="secondary" data-comment-approve="${esc(c.id)}">공개 승인</button>`:''}${c.status!=='rejected'?`<button class="quiet" data-comment-reject="${esc(c.id)}">${c.status==='approved'?'공개 취소':'비공개 처리'}</button>`:''}</div>`:''}</article>`;}
async function fetchComments(record){if(state.demo)return (await cache('get','practice-comments')||[]).filter(c=>c.exhibit_id===record.id&&(state.teacher||c.status==='approved'));if(state.visitor)return visitorRequest('comments',{exhibit:record.id});const r=await client.from('museum_comments').select('*').eq('exhibit_id',record.id).order('created_at');if(r.error)throw r.error;return r.data;}
async function openComments(record){
 const request=++commentRequest;commentRecord=record;$('commentsTitle').textContent=(record.content.title||'이름 없는 발견')+' · 댓글';$('commentsList').textContent='댓글을 불러오는 중…';$('commentMessage').textContent='';$('commentForm').hidden=true;$('commentBody').value='';if(!$('commentsDialog').open)$('commentsDialog').showModal();
 const rows=await fetchComments(record);if(request!==commentRequest)return;commentRows=rows;$('commentsList').innerHTML=rows.map(commentItem).join('')||'<p>아직 공개된 댓글이 없습니다.</p>';
 $('commentForm').hidden=!(state.teacher||state.visitor)||record.status!=='published';$('commentNameLabel').hidden=!state.visitor;$('commentName').required=!!state.visitor;
}
async function sendComment(){
 const body=$('commentBody').value.trim(),name=$('commentName').value.trim(),record=commentRecord;if(!body||!record)return;if(state.visitor&&!name)return;
 if(state.demo){const rows=await cache('get','practice-comments')||[];await cache('put','practice-comments',[...rows,{id:crypto.randomUUID(),exhibit_id:record.id,display_name:'선생님',author_kind:'teacher',body,status:'pending',version:1,created_at:new Date().toISOString()}]);}
 else if(state.visitor)await visitorRequest('add',{exhibit:record.id,name,body});else if(state.teacher)await api('museum_comment_add',{p_exhibit:record.id,p_body:body});else return;
 await openComments(record);$('commentMessage').textContent='댓글을 접수했습니다. 교사가 공개 승인한 뒤에 보입니다.';if(state.teacher&&!state.demo)await refreshVisitorAdmin();
}
async function moderateComment(id,status){
 const c=commentRows.find(x=>x.id===id);if(!c||!state.teacher)return;
 if(state.demo){const rows=await cache('get','practice-comments')||[];await cache('put','practice-comments',rows.map(x=>x.id===id?{...x,status,version:x.version+1}:x));}
 else await api('museum_comment_review',{p_id:id,p_version:c.version,p_status:status});
 if(commentRecord)await openComments(commentRecord);else await openCommentQueue();if(!state.demo)await refreshVisitorAdmin();
}
async function openCommentQueue(){
 const request=++commentRequest;commentRecord=null;$('commentsTitle').textContent='댓글 승인 대기';$('commentForm').hidden=true;$('commentMessage').textContent='';$('commentsList').textContent='불러오는 중…';if(!$('commentsDialog').open)$('commentsDialog').showModal();
 let rows;if(state.demo)rows=(await cache('get','practice-comments')||[]).filter(x=>x.status==='pending');else{const r=await client.from('museum_comments').select('*').eq('classroom_id',state.classroom.id).eq('status','pending').order('created_at');if(r.error)throw r.error;rows=r.data;}
 if(request!==commentRequest)return;commentRows=rows;$('commentsList').innerHTML=rows.map(c=>'<h3>'+esc(state.records.find(r=>r.id===c.exhibit_id)?.content.title||'학생 작품')+'</h3>'+commentItem(c)).join('')||'<p>승인 대기 중인 댓글이 없습니다.</p>';
}
$('parentLogin').onsubmit=e=>{e.preventDefault();communityAct(enterVisitor,e.submitter,'parentLoginMessage');};
$('issueVisitor').onclick=e=>communityAct(issueVisitor,e.target);$('disableVisitor').onclick=e=>communityAct(disableVisitor,e.target);$('commentQueue').onclick=e=>communityAct(openCommentQueue,e.target,'commentMessage');
$('copyVisitorLink').onclick=e=>communityAct(async()=>{try{await navigator.clipboard.writeText($('visitorLink').value);say('학부모 관람 링크를 복사했습니다.');}catch{$('visitorLink').focus();$('visitorLink').select();say('선택된 링크를 복사해 주세요.');}},e.target);
$('downloadVisitorQr').onclick=()=>{const svg=$('visitorQr').querySelector('svg');if(svg)download(new XMLSerializer().serializeToString(svg),'학부모-관람-QR.svg','image/svg+xml');};
$('commentForm').onsubmit=e=>{e.preventDefault();communityAct(sendComment,e.submitter,'commentMessage');};
$('closeComments').onclick=()=>{commentRequest++;$('commentsDialog').close();};$('commentsDialog').addEventListener('cancel',()=>commentRequest++);
document.addEventListener('click',e=>{const b=e.target.closest('[data-comments],[data-comment-approve],[data-comment-reject]');if(!b)return;if(b.dataset.comments){const r=state.records.find(x=>x.id===b.dataset.comments);if(r)communityAct(()=>openComments(r),b,'commentMessage');}else communityAct(()=>moderateComment(b.dataset.commentApprove||b.dataset.commentReject,b.dataset.commentApprove?'approved':'rejected'),b,'commentMessage');});
const visitFragment=new URLSearchParams(location.hash.slice(1)).get('visit');if(visitFragment){$('parentCode').value=visitFragment;history.replaceState(null,'',location.pathname+location.search);$('parentEntry').open=true;}
