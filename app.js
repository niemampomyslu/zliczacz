"use strict";
const KEY="fence-counter-v1";
const ELEMENTS=[["panels","Panele (siatka)","szt."],["bases","Podwaliny betonowe","szt."],["channels","Ceowniki","szt."],["clamps","Obejmy","szt."],["posts","Słupki","szt."]];
const empty=()=>Object.fromEntries(ELEMENTS.map(([k])=>[k,0]));
const initial=()=>({selected:0,sides:[empty(),empty(),empty()]});
function valid(x){return x&&Array.isArray(x.sides)&&x.sides.length===3&&x.sides.every(s=>ELEMENTS.every(([k])=>Number.isSafeInteger(s[k])&&s[k]>=0));}
let state;try{const v=JSON.parse(localStorage.getItem(KEY));state=valid(v)?v:initial();}catch{state=initial();}
if(!Number.isInteger(state.selected)||state.selected<0||state.selected>2)state.selected=0;
let history=[];
const $=id=>document.getElementById(id);
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function toast(t){$("toast").textContent=t;$("toast").style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("toast").style.display="none",1800);}
function render(){
 $("tabs").innerHTML=state.sides.map((_,i)=>`<button class="tab ${i===state.selected?"active":""}" data-side="${i}" aria-pressed="${i===state.selected}">Strona ${i+1}</button>`).join("");
 const current=state.sides[state.selected];
 $("summary").textContent=`Strona ${state.selected+1} • ${Object.values(current).reduce((a,b)=>a+b,0)} elementów łącznie`;
 $("items").innerHTML=ELEMENTS.map(([key,name,unit])=>`<article class="item"><div><div class="name">${name}</div><div class="sub">${unit}</div></div><div class="controls"><button class="btn minus" data-key="${key}" data-delta="-1" aria-label="Odejmij: ${name}">−</button><output class="count">${current[key]}</output><button class="btn plus" data-key="${key}" data-delta="1" aria-label="Dodaj: ${name}">+</button></div></article>`).join("");
 $("totals").innerHTML=ELEMENTS.map(([key,name])=>`<div class="totalrow"><span>${name}</span><strong>${state.sides.reduce((a,s)=>a+s[key],0)}</strong></div>`).join("");
}
function snapshot(){history.push(JSON.stringify(state));if(history.length>100)history.shift();}
$("tabs").addEventListener("click",e=>{const b=e.target.closest("[data-side]");if(!b)return;state.selected=Number(b.dataset.side);save();render();});
$("items").addEventListener("click",e=>{const b=e.target.closest("[data-key]");if(!b)return;const k=b.dataset.key,d=Number(b.dataset.delta),s=state.sides[state.selected];if(s[k]+d<0||s[k]+d>Number.MAX_SAFE_INTEGER)return;snapshot();s[k]+=d;save();render();});
$("undo").onclick=()=>{if(!history.length)return toast("Brak zmian do cofnięcia");state=JSON.parse(history.pop());save();render();toast("Cofnięto");};
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("export").onclick=()=>{const rows=[["Strona","Element","Ilość"],...state.sides.flatMap((s,i)=>ELEMENTS.map(([k,n])=>[i+1,n,s[k]])),...ELEMENTS.map(([k,n])=>["SUMA",n,state.sides.reduce((a,s)=>a+s[k],0)])];const csv="\ufeff"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\r\n");download(csv,"ogrodzenie.csv","text/csv;charset=utf-8");};
$("backup").onclick=()=>download(JSON.stringify(state,null,2),"ogrodzenie-kopia.json","application/json");
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const v=JSON.parse(await f.text());if(!valid(v))throw Error("format");if(!confirm("Zastąpić obecne wyniki danymi z kopii?"))return;snapshot();state=v;state.selected=Number.isInteger(v.selected)&&v.selected>=0&&v.selected<3?v.selected:0;save();render();toast("Wczytano kopię");}catch{alert("Nieprawidłowy plik kopii JSON.");}finally{e.target.value="";}};
$("reset").onclick=()=>{if(!confirm(`Wyzerować wszystkie liczniki strony ${state.selected+1}?`))return;snapshot();state.sides[state.selected]=empty();save();render();toast("Wyzerowano stronę");};
render();
