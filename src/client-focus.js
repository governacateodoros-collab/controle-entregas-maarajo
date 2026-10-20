// Mantém o cursor no campo de busca de cliente após o React atualizar o formulário.
document.addEventListener('input',event=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.list?.id!=='lista-clientes')return;
  const position=input.selectionStart??input.value.length;
  window.setTimeout(()=>{
    const active=document.querySelector('input[list="lista-clientes"]');
    if(active instanceof HTMLInputElement){
      active.focus();
      active.setSelectionRange(position,position);
    }
  },0);
},true);
