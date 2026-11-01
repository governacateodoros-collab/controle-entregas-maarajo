import {useEffect,useState}from'react';
import {supabase}from'./supabase';

// Mantém uma cópia local para abrir rápido e sincroniza a fonte oficial no Supabase.
export function useCloudState(key,fallback){
  const [value,setValue]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}});
  const [ready,setReady]=useState(false);
  useEffect(()=>{let alive=true;supabase.from('marajo_app_state').select('value').eq('key',key).maybeSingle().then(({data,error})=>{if(!alive)return;if(!error&&data?.value!==undefined){setValue(data.value);localStorage.setItem(key,JSON.stringify(data.value))}setReady(true)});return()=>{alive=false}},[key]);
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(key,JSON.stringify(value))}catch{}supabase.from('marajo_app_state').upsert({key,value,updated_at:new Date().toISOString()}).then(()=>{})},[key,value,ready]);
  return[value,setValue];
}
