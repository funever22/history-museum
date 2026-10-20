(function(root){
'use strict';
const galleries=[['goguryeo','고구려','🏹'],['baekje','백제','🌸'],['silla','신라','👑'],['gaya','가야','⚒️'],['balhae','발해','🌊'],['goryeo','고려','🏺'],['joseon','조선','📜']];
const fields=[
 ['title','유물 이름','박물관 자료에 나온 유물 이름을 적어요.',80],
 ['museum','만난 장소','어느 박물관에서 만났나요?',100],
 ['observation','자세히 보니','모양·색·재료·무늬에서 직접 발견한 것을 적어요.',1500],
 ['reason','내가 고른 이유','이 유물을 선택한 이유는 ___입니다.',1500],
 ['facts','자료로 알아낸 사실','이 유물은 ___에 사용했습니다. 특징은 ___입니다. 자료에서 확인한 사실을 1~2문장으로 적어요.',2000],
 ['meaning','역사적 의미','이 유물을 통해 ___을 알 수 있습니다. 생활·기술·문화나 다른 나라와의 교류를 생각해 보세요. 어려우면 비워 두고 발표 후 함께 완성해요.',2000],
 ['thought','발표를 마치며','새롭게 알게 된 점이나 더 궁금한 점을 적어요.',1500],
 ['source','참고한 자료','사진과 설명의 출처를 남겨요. 예: 국립중앙박물관, 유물 이름, 자료 링크',1000]
];
const studentFields=fields.filter(([k])=>['title','facts','meaning','source'].includes(k));
const statuses={draft:'작성 중',submitted:'선생님 확인 중',revision:'피드백을 보고 보완해요',published:'우리 반 전시 중',hidden:'전시를 잠시 쉬어요'};
const required=[];
function clean(input){const c={};for(const [k,,,max] of fields){if(input[k]!=null&&typeof input[k]!=='string')throw Error('글 형식이 올바르지 않습니다.');c[k]=(input[k]||'').slice(0,max);}return c;}
function missing(r){return [];}
function validateBackup(value){
 if(!value||value.format!=='history-museum-visit'||value.version!==3||!Array.isArray(value.records)||value.records.length>300)throw Error('이 버전의 백업 파일이 아닙니다.');
 return value.records.map(r=>{if(!r||!galleries.some(g=>g[0]===r.gallery_id)||!r.content||typeof r.content!=='object')throw Error('작품 형식을 확인해 주세요.');
 if(r.photo!=null&&(typeof r.photo!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(r.photo)||r.photo.length>5000000))throw Error('백업 사진 형식이나 크기를 확인해 주세요.');
 return {gallery_id:r.gallery_id,content:clean(r.content),photo:r.photo||null};});
}
function legacy(input){const arr=Array.isArray(input)?input:input?.records;if(!Array.isArray(arr))throw Error('이전 작품 배열을 찾지 못했습니다.');return arr.slice(0,2000).filter(r=>r&&typeof r==='object').map(r=>({gallery_id:galleries.find(g=>g[1]===r.kingdom||g[0]===r.gallery_id)?.[0]||'goguryeo',content:clean({title:r.title||'',facts:r.facts||'',meaning:r.meaning||'',source:r.source||'',reason:'',museum:'',observation:r.evidence||'',thought:''}),photo:null}));}
function slides(r){return [['유물을 소개합니다',`${r.content.title||'나의 유물'} · ${galleries.find(g=>g[0]===r.gallery_id)?.[1]||''}`,r.content.museum],['자세히 보니',r.content.observation,'내가 직접 관찰한 것'],['내가 고른 이유',r.content.reason,'왜 이 유물에 마음이 갔나요?'],['자료로 알아낸 사실',r.content.facts,r.content.source],['역사적 의미',r.content.meaning,'그 시대 사람들의 생활과 연결해요'],['발표를 마치며',r.content.thought,'새롭게 알게 된 점 · 더 궁금한 점']].filter((s,i)=>i===0||s[1]?.trim());}
const api={galleries,fields,studentFields,statuses,required,clean,missing,validateBackup,legacy,slides};if(typeof module==='object')module.exports=api;else root.Museum=api;
})(typeof window==='object'?window:globalThis);
