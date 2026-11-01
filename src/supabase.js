import {createClient} from '@supabase/supabase-js';

// Chave pública do projeto: as regras do banco protegem os dados.
export const SUPABASE_URL='https://caqhxmwedvgswjlhykbk.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY='sb_publishable_UiFZMmlspgctdkozImzN0A_6Ca4wDre';
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
