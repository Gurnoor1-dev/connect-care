import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json"}});
const JOIN_WINDOW_MS=60*60*1000;
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{headers:CORS});
 try{
  const auth=req.headers.get("Authorization")??""; if(!auth)return json({error:"Missing Authorization header"},401);
  const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await client.auth.getUser(); if(userError||!user)return json({error:"Unauthorized"},401);
  const {appointment_id,action}=await req.json();
  if(!appointment_id||!["leave","finalize"].includes(action))return json({error:"appointment_id and action are required"},400);
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:appt,error:apptError}=await admin.from("appointments").select("id,customer_id,specialist_id,scheduled_at,duration_minutes,status,specialist_joined_at,customer_joined_at,specialist_left_at,customer_left_at").eq("id",appointment_id).single();
  if(apptError||!appt)return json({error:"Appointment not found"},404);
  const isCustomer=appt.customer_id===user.id,isSpecialist=appt.specialist_id===user.id;if(!isCustomer&&!isSpecialist)return json({error:"Forbidden"},403);
  const joinEnd=new Date(appt.scheduled_at).getTime()+JOIN_WINDOW_MS;
  if(action==="leave"&&Date.now()<joinEnd){
    const field=isSpecialist?"specialist_left_at":"customer_left_at";
    const {error}=await admin.from("appointments").update({[field]:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",appointment_id);
    if(error)return json({error:error.message},500);
  }
  const {data:latest,error:latestError}=await admin.from("appointments").select("id,scheduled_at,duration_minutes,status,specialist_joined_at,customer_joined_at,specialist_left_at,customer_left_at").eq("id",appointment_id).single();
  if(latestError||!latest)return json({error:latestError?.message??"Could not reload appointment"},500);
  const latestEnd=new Date(latest.scheduled_at).getTime()+JOIN_WINDOW_MS;
  if(latest.status==="confirmed"&&Date.now()>=latestEnd){
    const bothJoined=!!latest.specialist_joined_at&&!!latest.customer_joined_at;
    const earlyExit=!!(latest.specialist_left_at&&new Date(latest.specialist_left_at).getTime()<latestEnd)||!!(latest.customer_left_at&&new Date(latest.customer_left_at).getTime()<latestEnd);
    const status=bothJoined&&!earlyExit?"completed":(latest.specialist_joined_at||latest.customer_joined_at?"partially_completed":"no_show");
    const {error}=await admin.from("appointments").update({status,session_ended_at:new Date(latestEnd).toISOString(),updated_at:new Date().toISOString()}).eq("id",appointment_id).eq("status","confirmed");
    if(error)return json({error:error.message},500);
    return json({success:true,status});
  }
  return json({success:true,status:latest.status});
 }catch(error){console.error("[session-presence]",error);return json({error:error instanceof Error?error.message:"Internal server error"},500);}
});