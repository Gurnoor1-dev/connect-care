import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json"}});
const JOIN_WINDOW_MS=60*60*1000;
const ATTENDANCE_THRESHOLD_SECONDS=50*60;
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:CORS});
  try{
    const auth=req.headers.get("Authorization")??"";
    if(!auth)return json({error:"Missing Authorization header"},401);
    const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user)return json({error:"Unauthorized"},401);
    const {appointment_id,action}=await req.json();
    if(!appointment_id||!["heartbeat","leave","finalize"].includes(action))return json({error:"appointment_id and action are required"},400);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:appt,error:apptError}=await admin.from("appointments").select("id,customer_id,specialist_id,scheduled_at,status,specialist_joined_at,specialist_first_joined_at,specialist_left_at,specialist_last_left_at,specialist_last_seen_at,customer_joined_at,customer_left_at,customer_last_seen_at,specialist_attendance_seconds,customer_attendance_seconds,session_started_at,session_ended_at").eq("id",appointment_id).single();
    if(apptError||!appt)return json({error:"Appointment not found"},404);
    const isCustomer=appt.customer_id===user.id,isSpecialist=appt.specialist_id===user.id;
    if(!isCustomer&&!isSpecialist)return json({error:"Forbidden"},403);
    const start=new Date(appt.scheduled_at).getTime(),joinEnd=start+JOIN_WINDOW_MS,now=Date.now();

    if(action==="heartbeat"&&now<joinEnd){
      const stamp=new Date().toISOString(),updates:any={updated_at:stamp};
      if(isSpecialist&&appt.specialist_joined_at&&!appt.specialist_left_at){
        const added=Math.max(0,Math.floor((Math.min(now,joinEnd)-new Date(appt.specialist_joined_at).getTime())/1000));
        updates.specialist_attendance_seconds=Math.min(3600,(appt.specialist_attendance_seconds??0)+added);
        updates.specialist_joined_at=stamp; updates.specialist_last_seen_at=stamp;
      }
      if(isCustomer&&appt.customer_joined_at&&!appt.customer_left_at){
        const added=Math.max(0,Math.floor((Math.min(now,joinEnd)-new Date(appt.customer_joined_at).getTime())/1000));
        updates.customer_attendance_seconds=Math.min(3600,(appt.customer_attendance_seconds??0)+added);
        updates.customer_joined_at=stamp; updates.customer_last_seen_at=stamp;
      }
      const {error}=await admin.from("appointments").update(updates).eq("id",appointment_id);
      if(error)return json({error:error.message},500);
    }

    if(action==="leave"&&now<joinEnd){
      const stamp=new Date().toISOString(),updates:any={updated_at:stamp};
      if(isSpecialist&&appt.specialist_joined_at&&!appt.specialist_left_at){
        const added=Math.max(0,Math.floor((Math.min(now,joinEnd)-new Date(appt.specialist_joined_at).getTime())/1000));
        updates.specialist_attendance_seconds=Math.min(3600,(appt.specialist_attendance_seconds??0)+added);
        updates.specialist_left_at=stamp; updates.specialist_last_left_at=stamp; updates.specialist_last_seen_at=stamp;
      }
      if(isCustomer&&appt.customer_joined_at&&!appt.customer_left_at){
        const added=Math.max(0,Math.floor((Math.min(now,joinEnd)-new Date(appt.customer_joined_at).getTime())/1000));
        updates.customer_attendance_seconds=Math.min(3600,(appt.customer_attendance_seconds??0)+added);
        updates.customer_left_at=stamp; updates.customer_last_seen_at=stamp;
      }
      const {error}=await admin.from("appointments").update(updates).eq("id",appointment_id);
      if(error)return json({error:error.message},500);
    }

    const {data:latest,error:latestError}=await admin.from("appointments").select("id,scheduled_at,status,specialist_joined_at,specialist_last_left_at,specialist_last_seen_at,customer_joined_at,specialist_left_at,customer_left_at,customer_last_seen_at,specialist_attendance_seconds,customer_attendance_seconds,session_started_at,session_ended_at").eq("id",appointment_id).single();
    if(latestError||!latest)return json({error:latestError?.message??"Could not reload appointment"},500);
    const latestStart=new Date(latest.scheduled_at).getTime(),latestEnd=latestStart+JOIN_WINDOW_MS;

    if(latest.status==="confirmed"&&Date.now()>=latestEnd){
      const specialistActiveAdded=latest.specialist_joined_at&&!latest.specialist_left_at?Math.max(0,Math.floor((Math.min(latestEnd,new Date(latest.specialist_last_seen_at??latest.specialist_joined_at).getTime())-new Date(latest.specialist_joined_at).getTime())/1000)):0;
      const customerActiveAdded=latest.customer_joined_at&&!latest.customer_left_at?Math.max(0,Math.floor((Math.min(latestEnd,new Date(latest.customer_last_seen_at??latest.customer_joined_at).getTime())-new Date(latest.customer_joined_at).getTime())/1000)):0;
      const specialistSeconds=Math.min(3600,(latest.specialist_attendance_seconds??0)+specialistActiveAdded);
      const customerSeconds=Math.min(3600,(latest.customer_attendance_seconds??0)+customerActiveAdded);
      const status=specialistSeconds>=ATTENDANCE_THRESHOLD_SECONDS?"completed":(specialistSeconds>0||customerSeconds>0?"partially_completed":"no_show");
      const sessionEndStamp=new Date(latestEnd).toISOString();
      const specialistEnd=latest.specialist_left_at??latest.specialist_last_seen_at??sessionEndStamp;
      const customerEnd=latest.customer_left_at??latest.customer_last_seen_at??sessionEndStamp;
      const {error}=await admin.from("appointments").update({
        specialist_attendance_seconds:specialistSeconds,customer_attendance_seconds:customerSeconds,status,
        specialist_left_at:latest.specialist_left_at??(latest.specialist_joined_at?specialistEnd:null),
        specialist_last_left_at:latest.specialist_left_at??(latest.specialist_joined_at?specialistEnd:null),
        customer_left_at:latest.customer_left_at??(latest.customer_joined_at?customerEnd:null),
        session_ended_at:sessionEndStamp,updated_at:new Date().toISOString()
      }).eq("id",appointment_id).eq("status","confirmed");
      if(error)return json({error:error.message},500);
      return json({success:true,status,specialist_attendance_seconds:specialistSeconds,customer_attendance_seconds:customerSeconds,attendance_threshold_minutes:50});
    }
    return json({success:true,status:latest.status,specialist_attendance_seconds:latest.specialist_attendance_seconds??0,customer_attendance_seconds:latest.customer_attendance_seconds??0});
  }catch(error){console.error("[session-presence]",error);return json({error:error instanceof Error?error.message:"Internal server error"},500);}
});