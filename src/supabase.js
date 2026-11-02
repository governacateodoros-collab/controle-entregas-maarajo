import {createClient} from '@supabase/supabase-js';

// Chave pública do projeto: as regras do banco protegem os dados.
export const SUPABASE_URL='https://dzfesxcajefcqfckaivo.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY='sb_publishable_3SemslOKXDijYmWdc6h_pQ_1GwiyUvF';
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
