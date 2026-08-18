import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://eyvitviyjykgqawuwhzl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2];

if (!SUPABASE_KEY) {
  console.error("Falta la Service Role Key. Ejecutar como: node fix-chats.js <SUPABASE_SERVICE_ROLE_KEY>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixDuplicateConversations() {
  console.log("Iniciando limpieza de chats duplicados...");

  // Obtener todas las conversaciones
  const { data: convs, error } = await supabase.from('conversations').select('*').order('created_at', { ascending: true });
  if (error) { console.error("Error obteniendo conversaciones", error); return; }

  // Agrupar por customer_id
  const convsByCustomer = {};
  for (const c of convs) {
    if (!convsByCustomer[c.customer_id]) convsByCustomer[c.customer_id] = [];
    convsByCustomer[c.customer_id].push(c);
  }

  let fixesApplied = 0;

  for (const [customerId, customerConvs] of Object.entries(convsByCustomer)) {
    if (customerConvs.length > 1) {
      console.log(`Encontrados ${customerConvs.length} chats para el cliente ${customerId}. Unificando...`);
      
      // Tomamos la primera (la más antigua) como la principal
      const mainConv = customerConvs[0];
      const dupConvs = customerConvs.slice(1);

      for (const dup of dupConvs) {
        // Mover todos los mensajes de la duplicada a la principal
        const { error: updateErr } = await supabase
          .from('messages')
          .update({ conversation_id: mainConv.id })
          .eq('conversation_id', dup.id);
        
        if (updateErr) {
          console.error(`Error moviendo mensajes del chat ${dup.id}:`, updateErr);
          continue;
        }

        // Si la duplicada estaba escalada, marcamos la principal como escalada
        if (dup.status === 'escalated') {
          await supabase.from('conversations').update({ status: 'escalated' }).eq('id', mainConv.id);
        }

        // Eliminar la conversación duplicada
        const { error: delErr } = await supabase.from('conversations').delete().eq('id', dup.id);
        if (delErr) {
          console.error(`Error borrando chat duplicado ${dup.id}:`, delErr);
        } else {
          console.log(`Chat duplicado ${dup.id} eliminado correctamente. Mensajes movidos al principal.`);
          fixesApplied++;
        }
      }
    }
  }

  console.log(`Limpieza terminada. Se eliminaron ${fixesApplied} chats duplicados.`);
}

fixDuplicateConversations();
