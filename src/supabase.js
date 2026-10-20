import {createClient} from '@supabase/supabase-js';

// Chave pública do projeto: as regras do banco protegem os dados.
export const supabase=createClient(
  'https://caqhxmwedvgswjlhykbk.supabase.co',
  'sb_publishable_UiFZMmlspgctdkozImzN0A_6Ca4wDre'
);
