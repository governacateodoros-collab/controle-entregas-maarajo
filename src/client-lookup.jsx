import React,{useEffect,useMemo,useRef,useState}from'react';
import{Search,UserRound}from'lucide-react';
import'./client-lookup.css';

const normalize=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const clean=value=>String(value||'').trim();

export function ClientLookup({clients,query,onQueryChange,onSelect}){
  const[input,setInput]=useState(query||'');
  const[open,setOpen]=useState(false);
  const root=useRef(null);
  useEffect(()=>setInput(query||''),[query]);
  useEffect(()=>{
    const close=event=>{if(!root.current?.contains(event.target))setOpen(false)};
    document.addEventListener('pointerdown',close);
    return()=>document.removeEventListener('pointerdown',close);
  },[]);
  const matches=useMemo(()=>{
    const term=normalize(input);
    if(!term)return [];
    const score=client=>{
      const name=normalize(client.cliente),sacado=normalize(client.sacado);
      if(name.startsWith(term))return 0;
      if(sacado.startsWith(term))return 1;
      if(name.includes(term))return 2;
      if(sacado.includes(term))return 3;
      return 4;
    };
    return clients.filter(client=>normalize(`${client.cliente} ${client.sacado} ${client.fazenda} ${client.loja}`).includes(term)).sort((a,b)=>score(a)-score(b)||normalize(a.cliente).localeCompare(normalize(b.cliente),'pt-BR')).slice(0,8);
  },[clients,input]);
  const choose=client=>{
    const label=`${clean(client.cliente)} · Sacado ${clean(client.sacado)}`;
    setInput(label);onQueryChange(label);onSelect(client);setOpen(false);
  };
  const change=value=>{
    setInput(value);setOpen(true);onQueryChange(value);
    const exact=clients.filter(client=>normalize(client.cliente)===normalize(value)||normalize(client.sacado)===normalize(value));
    const sameClient=new Set(exact.map(client=>normalize(client.cliente))).size===1;
    const sameSacado=new Set(exact.map(client=>normalize(client.sacado))).size===1;
    if(exact.length&&(sameClient||sameSacado))choose(exact[0]);
  };
  return <div className="client-lookup" ref={root}>
    <Search size={17}/>
    <input value={input} onFocus={()=>setOpen(true)} onChange={event=>change(event.target.value)} placeholder="Digite nome ou número do sacado" autoComplete="off" aria-autocomplete="list" aria-expanded={open&&matches.length>0}/>
    {open&&input&&<div className="client-lookup-results" role="listbox">{matches.length?matches.map(client=><button type="button" key={client.id} role="option" onClick={()=>choose(client)}><span className="client-lookup-icon"><UserRound size={15}/></span><span><b>{client.cliente}</b><small>Sacado {client.sacado} · Loja {client.loja}{client.fazenda?` · ${client.fazenda}`:''}</small></span></button>):<p>Nenhum cliente ou sacado encontrado.</p>}</div>}
  </div>;
}
