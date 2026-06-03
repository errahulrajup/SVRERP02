import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 50  // process 50 events per run

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST (invoked by pg_cron or manual trigger)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const results = { processed: 0, failed: 0, errors: [] as string[] }

  try {
    // Use the claim_outbox_events RPC which handles locking, skip-locked,
    // and increments attempt count atomically. Filters: processed_at IS NULL
    // and attempts < 10 and next_attempt_at <= now().
    const { data: events, error: claimError } = await supabase
      .rpc('claim_outbox_events', { batch_size: BATCH_SIZE })

    if (claimError) throw claimError
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending events', ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const event of events) {
      try {
        let success = false

        switch (event.event_type) {
          case 'COA_ISSUED': {
            // Send CoA notification (could call email service, push notification, etc.)
            console.log(`[outbox] COA_ISSUED for batch ${event.entity_id}`)
            // TODO: integrate with email provider (Resend, Sendgrid, etc.)
            success = true
            break
          }
          case 'BATCH_COMPLETED': {
            console.log(`[outbox] BATCH_COMPLETED: ${event.entity_id}`)
            success = true
            break
          }
          case 'EXPIRY_ALERT': {
            console.log(`[outbox] EXPIRY_ALERT: lot ${event.entity_id} expiring`)
            // TODO: Send alert to QC team
            success = true
            break
          }
          case 'CAPA_TRIGGERED': {
            console.log(`[outbox] CAPA_TRIGGERED: ${JSON.stringify(event.payload)}`)
            // TODO: Auto-create CAPA record or send notification
            success = true
            break
          }
          case 'DISPATCH_CONFIRMED': {
            console.log(`[outbox] DISPATCH_CONFIRMED: ${event.entity_id}`)
            success = true
            break
          }
          case 'LOW_STOCK_ALERT': {
            console.log(`[outbox] LOW_STOCK_ALERT: ${JSON.stringify(event.payload)}`)
            success = true
            break
          }
          default: {
            console.log(`[outbox] Unknown event type: ${event.event_type}`)
            success = true  // Mark as done to avoid retry loop
          }
        }

        if (success) {
          // Mark processed using the proper RPC
          const { error: markError } = await supabase
            .rpc('mark_outbox_processed', { event_id: event.id })
          if (markError) throw markError
          results.processed++
        }
      } catch (eventErr: unknown) {
        const errMsg = eventErr instanceof Error ? eventErr.message : String(eventErr)
        // Mark as failed using the proper RPC (increments backoff, sets last_error)
        await supabase
          .rpc('mark_outbox_failed', { event_id: event.id, error_message: errMsg })

        results.failed++
        results.errors.push(`Event ${event.id} (${event.event_type}): ${errMsg}`)
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${results.processed} events, ${results.failed} failed`,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: errMsg, ...results }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
