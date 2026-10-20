import React,{useEffect,useMemo,useRef,useState}from'react';
import{CheckCircle2,LogIn,LockKeyhole,User,UserPlus}from'lucide-react';
import{supabase}from'./supabase';
import{Brand}from'./Brand';
import{ProfileContext,ProfileEditor,ProfileFields,PhotoField,avatarKey,displayProfile,persistAvatar}from'./profile';
import'./auth.css';

function authError(error){
  if(error?.message==='Invalid login credentials')return 'Usuário ou senha inválidos.';
  if(error?.message==='User already registered')return 'Este usuário já está cadastrado. Entre com sua senha.';
  if(error?.message==='Email not confirmed')return 'Este acesso ainda não foi liberado. Verifique a configuração da conta.';
  return 'Não foi possível concluir o acesso. Confira os dados e tente novamente.';
}

function Login({onBusyChange,onPendingPhoto}){
  const[mode,setMode]=useState('login'),[login,setLogin]=useState(''),[password,setPassword]=useState('');
  const[fullName,setFullName]=useState(''),[jobTitle,setJobTitle]=useState(''),[photo,setPhoto]=useState(null);
  const[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[processing,setProcessing]=useState(false);
  const signup=mode==='signup';
  const submit=async event=>{
    event.preventDefault();setMessage('');
    const username=login.trim().toLowerCase();
    if(!/^[a-z0-9._-]{3,60}$/.test(username)){setMessage('Use um usuário com 3 a 60 letras, números, ponto, hífen ou sublinhado, sem espaços.');return}
    if(signup&&(fullName.trim().length<3||!jobTitle.trim())){setMessage('Informe seu nome completo e cargo.');return}
    setBusy(true);onBusyChange(true);
    try{
      const credentials={email:username+'@grupomarajo.local',password};
      const result=signup?await supabase.auth.signUp({...credentials,options:{data:{full_name:fullName.trim(),job_title:jobTitle.trim()}}}):await supabase.auth.signInWithPassword(credentials);
      if(result.error){setMessage(authError(result.error));return}
      if(signup){
        if(photo&&result.data.user){
          if(result.data.session){
            try{await persistAvatar(result.data.user.id,photo)}
            catch{onPendingPhoto(result.data.user.id,photo,'Sua conta foi criada. Não foi possível salvar a foto; tente novamente aqui.')}
          }else onPendingPhoto(result.data.user.id,photo,'Sua conta foi criada. Salve sua foto para concluir o perfil.');
        }
        if(!result.data.session){setMessage('Conta criada. Entre com seu usuário e senha para concluir o acesso.');setMode('login');setPassword('')}
      }
    }catch{setMessage('Não foi possível conectar. Confira sua conexão e tente novamente.')}
    finally{setBusy(false);onBusyChange(false)}
  };
  return <main className="auth-page"><section className={`auth-card ${signup?'auth-mode-signup':''}`}>
    <Brand/>
    <h1>{signup?'Crie seu acesso':'Acesse sua operação'}</h1>
    <p>{signup?'Informe seus dados para criar o perfil da sua conta.':'Entre com o usuário e a senha definidos para sua equipe.'}</p>
    <form onSubmit={submit}>
      {signup&&<>
        <PhotoField photo={photo} fullName={fullName} onChange={setPhoto} disabled={busy} onWorkingChange={setProcessing}/>
        <ProfileFields signup fullName={fullName} jobTitle={jobTitle} onNameChange={setFullName} onJobChange={setJobTitle} disabled={busy}/>
      </>}
      <label><User size={18}/><input aria-label="Usuário" required minLength={3} maxLength={60} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Usuário" value={login} onChange={e=>setLogin(e.target.value)} disabled={busy}/></label>
      <label><LockKeyhole size={18}/><input aria-label="Senha" required minLength={6} autoComplete={signup?'new-password':'current-password'} type="password" placeholder="Senha (mínimo 6 caracteres)" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
      {message&&<div className="auth-message" role="alert">{message}</div>}
      <button disabled={busy||processing}>{signup?<UserPlus size={18}/>:<LogIn size={18}/>} {busy?'Aguarde...':signup?'Criar conta':'Entrar'}</button>
    </form>
    <button className="auth-switch" disabled={busy||processing} onClick={()=>{setMode(signup?'login':'signup');setMessage('')}}>{signup?'Já possui acesso? Entrar':'Ainda não tem acesso? Criar usuário'}</button>
  </section></main>;
}

export function SecureApp({children}){
  const[session,setSession]=useState(undefined),[authPending,setAuthPending]=useState(false);
  const[avatarState,setAvatarState]=useState({userId:null,avatar:null});
  const[photoLoading,setPhotoLoading]=useState(false),[photoReadError,setPhotoReadError]=useState('');
  const[profileOpen,setProfileOpen]=useState(false),[pendingPhoto,setPendingPhoto]=useState(null),[savedMessage,setSavedMessage]=useState('');
  const profileRevision=useRef(0);
  const userId=session?.user?.id;
  const avatar=avatarState.userId===userId?avatarState.avatar:null;
  const profile=useMemo(()=>displayProfile(session?.user,avatar),[session?.user,avatar]);

  useEffect(()=>{
    let active=true;
    supabase.auth.getSession().then(({data})=>{if(active)setSession(data.session)}).catch(()=>{if(active)setSession(null)});
    // Não faz consultas dentro do callback: o SDK mantém o bloqueio da sessão aqui.
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{if(active)setSession(next)});
    return()=>{active=false;subscription.unsubscribe()};
  },[]);

  useEffect(()=>{
    if(!userId||authPending)return;
    let active=true;
    const revision=profileRevision.current;
    // Consulta o usuário atualizado para recuperar alterações feitas em outro dispositivo.
    supabase.auth.getUser().then(({data})=>{
      if(active&&revision===profileRevision.current&&data?.user)setSession(current=>current?.user?.id===userId?{...current,user:data.user}:current);
    }).catch(()=>{});
    setPhotoLoading(true);setPhotoReadError('');
    supabase.from('marajo_app_state').select('value').eq('key',avatarKey(userId)).maybeSingle().then(({data,error})=>{
      if(!active||revision!==profileRevision.current)return;
      if(error){setPhotoReadError('Não foi possível carregar sua foto de perfil. Tente novamente mais tarde.');return}
      const photo=data?.value?.avatar;
      setAvatarState({userId,avatar:typeof photo==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(photo)?photo:null});
    }).catch(()=>{if(active&&revision===profileRevision.current)setPhotoReadError('Não foi possível carregar sua foto de perfil. Tente novamente mais tarde.')})
      .finally(()=>{if(active)setPhotoLoading(false)});
    return()=>{active=false};
  },[userId,authPending]);

  useEffect(()=>{
    if(!savedMessage)return;
    const timer=setTimeout(()=>setSavedMessage(''),4000);
    return()=>clearTimeout(timer);
  },[savedMessage]);

  const closeProfile=()=>{setProfileOpen(false);setPendingPhoto(null)};
  const saveProfile=async({fullName,jobTitle,avatar:photo,photoChanged})=>{
    if(!userId)throw new Error('Entre novamente para atualizar seu perfil.');
    profileRevision.current+=1;
    let photoSaved=false;
    if(photoChanged){
      try{await persistAvatar(userId,photo);setAvatarState({userId,avatar:photo});setPhotoReadError('');photoSaved=true}
      catch{throw new Error('Não foi possível salvar a foto. Seus dados não foram alterados. Confira a conexão e tente novamente.')}
    }
    try{
      const{data,error}=await supabase.auth.updateUser({data:{full_name:fullName,job_title:jobTitle}});
      if(error||!data.user)throw error||new Error('User unavailable');
      setSession(current=>current?.user?.id===userId?{...current,user:data.user}:current);
      setSavedMessage('Perfil atualizado com sucesso.');
    }catch{throw new Error(photoSaved?'A foto foi salva, mas não foi possível atualizar nome e cargo. Tente novamente.':'Não foi possível salvar nome e cargo. Confira a conexão e tente novamente.')}
  };

  if(session===undefined)return <div className="auth-loading">Carregando acesso seguro…</div>;
  if(!session||authPending)return <Login onBusyChange={setAuthPending} onPendingPhoto={(id,photo,message)=>{setPendingPhoto({userId:id,avatar:photo,message});setProfileOpen(true)}}/>;
  const activeDraft=pendingPhoto?.userId===userId?pendingPhoto:null;
  return <ProfileContext.Provider value={{user:session.user,profile,photoLoading,photoReadError,photoDraft:activeDraft?activeDraft.avatar:undefined,profileNotice:activeDraft?.message,saveProfile,openProfile:()=>{setPendingPhoto(null);setProfileOpen(true)},closeProfile}}>
    <button className="auth-signout" onClick={()=>{closeProfile();setSavedMessage('');supabase.auth.signOut()}}>Sair</button>
    {children}
    {profileOpen&&(!pendingPhoto||activeDraft)&&<ProfileEditor/>}
    {savedMessage&&<div className="toast" role="status"><CheckCircle2 size={19}/>{savedMessage}</div>}
  </ProfileContext.Provider>;
}
