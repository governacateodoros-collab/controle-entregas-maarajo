import React,{createContext,useContext,useEffect,useRef,useState}from'react';
import{Check,Upload,X}from'lucide-react';
import{supabase}from'./supabase';

export const ProfileContext=createContext(null);
export const useProfile=()=>useContext(ProfileContext);
export const JOB_TITLES=['Administrador','Gerente','Coordenador','Supervisor','Financeiro','Administrativo','Operador de logística','Captador','Motorista'];
export const avatarKey=userId=>`marajo-avatar:${userId}`;

// A foto fica no banco da aplicação, separada do token de acesso do usuário.
export async function persistAvatar(userId,avatar){
  const{error}=await supabase.from('marajo_app_state').upsert({key:avatarKey(userId),value:{avatar:avatar||null},updated_at:new Date().toISOString()});
  if(error)throw error;
}

export function displayProfile(user,avatar){
  const metadata=user?.user_metadata||{};
  const fullName=typeof metadata.full_name==='string'?metadata.full_name.trim():'';
  const jobTitle=typeof metadata.job_title==='string'?metadata.job_title.trim():'';
  return{fullName:fullName||user?.email?.split('@')[0]||'Meu perfil',jobTitle:jobTitle||'Completar perfil',avatar:avatar||null};
}

export function ProfileAvatar({photo,fullName='',size=''}){
  const words=fullName.trim().split(/\s+/).filter(Boolean);
  const initials=(words.length>1?words[0][0]+words.at(-1)[0]:words[0]?.slice(0,2)||'MP').toUpperCase();
  return <span className={`profile-avatar ${size}`} aria-hidden="true">{photo?<img src={photo} alt=""/>:initials}</span>;
}

// Redimensiona o upload no dispositivo; armazena somente uma foto pequena no banco.
async function preparePhoto(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if(file.size>5*1024*1024)throw new Error('A foto deve ter no máximo 5 MB.');
  const source=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('Não foi possível abrir a foto. Escolha outro arquivo.'));
    reader.readAsDataURL(file);
  });
  const image=await new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Não foi possível abrir a foto. Escolha outro arquivo.'));
    img.src=source;
  });
  if(!image.width||!image.height)throw new Error('A imagem não é válida.');
  const scale=Math.min(1,320/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*scale));
  canvas.height=Math.max(1,Math.round(image.height*scale));
  const context=canvas.getContext('2d');
  context.fillStyle='#ffffff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',0.82);
}

export function PhotoField({photo,fullName,onChange,disabled,onWorkingChange}){
  const[error,setError]=useState('');
  const[processing,setProcessing]=useState(false);
  const upload=async event=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    setError('');setProcessing(true);onWorkingChange?.(true);
    try{onChange(await preparePhoto(file))}catch(err){setError(err.message)}
    finally{setProcessing(false);onWorkingChange?.(false)}
  };
  return <>
    <div className="profile-photo-field">
      <ProfileAvatar photo={photo} fullName={fullName} size="large"/>
      <div className="profile-photo-actions">
        <span>Foto de perfil</span>
        <label className="profile-photo-picker"><Upload size={15}/>{processing?'Preparando foto...':photo?'Alterar foto':'Adicionar foto'}<input aria-label="Foto de perfil" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={disabled||processing}/></label>
        <small>JPG, PNG ou WebP · até 5 MB</small>
        {photo&&<button className="profile-photo-remove" type="button" disabled={disabled||processing} onClick={()=>{setError('');onChange(null)}}>Remover foto</button>}
      </div>
    </div>
    {error&&<div className="profile-feedback error" role="alert">{error}</div>}
  </>;
}

export function ProfileFields({fullName,jobTitle,onNameChange,onJobChange,disabled=false,signup=false}){
  return <div className={signup?'signup-profile-fields':'profile-fields'}>
    <label className={signup?'auth-detail-field':''}><span>Nome completo *</span><input aria-label="Nome completo" autoComplete="name" required minLength={3} maxLength={120} value={fullName} onChange={e=>onNameChange(e.target.value)} disabled={disabled} placeholder="Digite seu nome completo"/></label>
    <label className={signup?'auth-detail-field':''}><span>Cargo *</span><input aria-label="Cargo" list={signup?'signup-cargos':'profile-cargos'} required maxLength={80} value={jobTitle} onChange={e=>onJobChange(e.target.value)} disabled={disabled} placeholder="Selecione ou digite seu cargo"/><datalist id={signup?'signup-cargos':'profile-cargos'}>{JOB_TITLES.map(job=><option key={job} value={job}/>)}</datalist></label>
  </div>;
}

function AccessCreator({onCreate,disabled}){
  const[username,setUsername]=useState(''),[password,setPassword]=useState(''),[fullName,setFullName]=useState(''),[jobTitle,setJobTitle]=useState('Operador de logística');
  const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const submit=async()=>{
    const login=username.trim().toLowerCase();
    setMessage('');setError('');
    if(!/^[a-z0-9._-]{3,60}$/.test(login)){setError('Use um usuário com 3 a 60 letras, números, ponto, hífen ou sublinhado.');return}
    if(password.length<6){setError('A senha deve ter pelo menos 6 caracteres.');return}
    if(fullName.trim().length<3||!jobTitle.trim()){setError('Informe nome completo e cargo.');return}
    setBusy(true);
    try{await onCreate({username:login,password,fullName,jobTitle});setUsername('');setPassword('');setFullName('');setJobTitle('Operador de logística');setMessage('Acesso criado. A pessoa já pode entrar com o usuário e a senha definidos.')}catch(err){setError(err.message==='User already registered'?'Este usuário já está cadastrado.':err.message||'Não foi possível criar o acesso.')}finally{setBusy(false)}
  };
  return <section className="access-creator" aria-label="Cadastrar novo acesso" onKeyDown={event=>event.key==='Enter'&&event.preventDefault()}><div><span>ADMINISTRAÇÃO</span><h3>Cadastrar novo login</h3><p>Somente o Teodoro pode criar acessos para a equipe.</p></div><div className="access-fields"><label><small>Usuário</small><input aria-label="Novo usuário" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Ex.: markiel" disabled={disabled||busy}/></label><label><small>Senha inicial</small><input aria-label="Senha inicial" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" disabled={disabled||busy}/></label><label><small>Nome completo</small><input aria-label="Nome completo do novo usuário" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nome da pessoa" disabled={disabled||busy}/></label><label><small>Cargo</small><select aria-label="Cargo do novo usuário" value={jobTitle} onChange={e=>setJobTitle(e.target.value)} disabled={disabled||busy}>{JOB_TITLES.map(job=><option key={job}>{job}</option>)}</select></label></div>{error&&<p className="profile-feedback error" role="alert">{error}</p>}{message&&<p className="profile-feedback success" role="status">{message}</p>}<button type="button" className="btn primary" disabled={disabled||busy} onClick={submit}>{busy?'Criando acesso...':'Criar login'}</button></section>
}

export function ProfileEditor(){
  const{profile,saveProfile,closeProfile,photoReadError,photoLoading,photoDraft,profileNotice,canManageAccess,createAccess}=useProfile();
  const[fullName,setFullName]=useState(profile.fullName==='Meu perfil'?'':profile.fullName);
  const[jobTitle,setJobTitle]=useState(profile.jobTitle==='Completar perfil'?'':profile.jobTitle);
  const[nameChanged,setNameChanged]=useState(false),[jobChanged,setJobChanged]=useState(false);
  const[photo,setPhoto]=useState(photoDraft!==undefined?photoDraft:profile.avatar);
  const[photoChanged,setPhotoChanged]=useState(photoDraft!==undefined);
  const[busy,setBusy]=useState(false),[processing,setProcessing]=useState(false),[error,setError]=useState('');
  const dialog=useRef(null);
  useEffect(()=>{if(!photoChanged)setPhoto(profile.avatar)},[profile.avatar,photoChanged]);
  useEffect(()=>{if(!nameChanged)setFullName(profile.fullName==='Meu perfil'?'':profile.fullName)},[profile.fullName,nameChanged]);
  useEffect(()=>{if(!jobChanged)setJobTitle(profile.jobTitle==='Completar perfil'?'':profile.jobTitle)},[profile.jobTitle,jobChanged]);
  useEffect(()=>{
    const opener=document.activeElement;
    dialog.current?.querySelector('input[autocomplete="name"]')?.focus();
    return()=>opener?.isConnected&&opener.focus();
  },[]);
  const keyDown=event=>{
    if(event.key==='Escape'&&!busy&&!processing){event.stopPropagation();closeProfile()}
    if(event.key==='Tab'){
      const controls=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(node=>node.getClientRects().length&&node.type!=='file');
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
    }
  };
  const submit=async event=>{
    event.preventDefault();setError('');
    if(fullName.trim().length<3||!jobTitle.trim()){setError('Informe seu nome completo e cargo.');return}
    setBusy(true);
    try{await saveProfile({fullName:fullName.trim(),jobTitle:jobTitle.trim(),avatar:photo,photoChanged});closeProfile()}
    catch(err){setError(err.message)}finally{setBusy(false)}
  };
  return <div className="profile-editor-overlay" onMouseDown={event=>event.target===event.currentTarget&&!busy&&!processing&&closeProfile()}>
    <section className="profile-editor" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" onKeyDown={keyDown}>
      <header className="profile-editor-header"><div><h2 id="profile-editor-title">Meu perfil</h2><p>Atualize seus dados e a foto que aparece no site.</p></div><button type="button" aria-label="Fechar perfil" disabled={busy||processing} onClick={closeProfile}><X size={21}/></button></header>
      <form onSubmit={submit}>
        <PhotoField photo={photo} fullName={fullName} onChange={value=>{setPhoto(value);setPhotoChanged(true)}} disabled={busy||photoLoading} onWorkingChange={setProcessing}/>
        <ProfileFields fullName={fullName} jobTitle={jobTitle} onNameChange={value=>{setNameChanged(true);setFullName(value)}} onJobChange={value=>{setJobChanged(true);setJobTitle(value)}} disabled={busy}/>
        {canManageAccess&&<AccessCreator onCreate={createAccess} disabled={busy||processing||photoLoading}/>}
        {photoLoading&&<p className="profile-feedback" role="status">Carregando sua foto...</p>}
        {(error||profileNotice||photoReadError)&&<p className="profile-feedback error" role="alert">{error||profileNotice||photoReadError}</p>}
        <footer className="profile-editor-footer"><button type="button" className="btn" disabled={busy||processing} onClick={closeProfile}>Cancelar</button><button className="btn primary" disabled={busy||processing||photoLoading}><Check size={17}/>{busy?'Salvando...':'Salvar perfil'}</button></footer>
      </form>
    </section>
  </div>;
}
