// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const PURGE_SECRET = Deno.env.get('PURGE_SECRET') ?? '';
const TRASH_RETENTION_MS = 72 * 60 * 60 * 1000; // 72 horas

// Los file_url son links públicos tipo:
// https://<project>.supabase.co/storage/v1/object/public/chat-media/<path-dentro-del-bucket>
function extractStoragePath(fileUrl) {
  const marker = '/chat-media/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.substring(idx + marker.length);
}

// Función interna, invocada solo por la tarea programada (pg_cron + pg_net), no por usuarios.
// Se protege con un secreto compartido en vez de JWT de Supabase, porque quien la llama
// es la propia base de datos, no un usuario logueado.
serve(async (req) => {
  const secretHeader = req.headers.get('x-purge-secret');
  if (!PURGE_SECRET || secretHeader !== PURGE_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS).toISOString();

    const { data: expired, error } = await supabase
      .from('media_library')
      .select('id, file_url')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff);

    if (error) throw error;

    let purged = 0;
    for (const row of expired || []) {
      const path = extractStoragePath(row.file_url);
      if (path) {
        const { error: storageError } = await supabase.storage.from('chat-media').remove([path]);
        if (storageError) {
          console.error(`Error borrando del storage (id ${row.id}, path ${path}):`, storageError);
        }
      }

      const { error: deleteError } = await supabase.from('media_library').delete().eq('id', row.id);
      if (deleteError) {
        console.error(`Error borrando fila media_library (id ${row.id}):`, deleteError);
        continue;
      }
      purged++;
    }

    console.log(`Purga de papelera completada: ${purged} archivo(s) eliminados definitivamente.`);
    return new Response(JSON.stringify({ success: true, purged }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error purgando papelera:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
