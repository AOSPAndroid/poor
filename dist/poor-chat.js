'use strict';
let poorChatBusy=false,poorChatTimer;
function chatAnswer(text){return esc(text).replace(/\[([^\]\n]+)\]\((https:\/\/[^\s<>]+)\)/g,(_m,label,url)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`).replace(/\n/g,'<br>')}
async function loadPoorChat(){
 clearTimeout(poorChatTimer);try{const r=await fetch('/api/chat'),data=await r.json();if(!r.ok){$('#chatStatus').innerHTML=r.status===401?'<a href="/signin-with-chatgpt?return_to=%2F">Sign in with ChatGPT to chat</a>':esc(data.error||'Chat unavailable');$('#chatSend').disabled=true;$('#chatMessages').innerHTML='';return}
 const pending=data.messages.some(m=>['queued','working'].includes(m.status));$('#chatStatus').textContent=data.online?(pending?'Researching your question…':'Available · grounded equity research'):'Offline · previously completed answers remain available';$('#chatSend').disabled=!data.online||pending||poorChatBusy;
 const html=data.messages.map(m=>`<article class="chat-turn"><div class="chat-question"><b>You</b><p>${esc(m.message)}</p></div><div class="chat-answer"><b>poor</b><p>${m.answer?chatAnswer(m.answer):m.status==='failed'?'This request expired. Please try again.':m.status==='working'?'Checking the evidence…':'Queued for research…'}</p></div></article>`).join('')||'<div class="chat-empty">Ask about a stock’s catalysts, compare two companies, or investigate dividend risks.</div>';
 if($('#chatMessages').innerHTML!==html)$('#chatMessages').innerHTML=html;
 }catch{$('#chatStatus').textContent='Chat connection unavailable. Retry shortly.';$('#chatSend').disabled=true}
 if(view==='chat')poorChatTimer=setTimeout(loadPoorChat,8000);
}
if(typeof window!=='undefined'){
 $('#chatRefresh').onclick=loadPoorChat;
 $('#poorChatForm').onsubmit=async e=>{e.preventDefault();if(poorChatBusy)return;poorChatBusy=true;$('#chatSend').disabled=true;try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:$('#chatQuestion').value,symbol:$('#chatSymbol').value.trim().toUpperCase()})}),d=await r.json();if(!r.ok)throw Error(d.error||'Could not send');$('#chatQuestion').value='';poorChatBusy=false;await loadPoorChat()}catch(err){$('#chatStatus').textContent=err.message;poorChatBusy=false;$('#chatSend').disabled=false}};
}
