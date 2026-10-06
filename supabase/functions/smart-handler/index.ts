import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json"}});
const JOIN_EARLY_MS=2*60*1000;
const JOIN_WINDOW_MS=60*60*1000;
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:CORS});
  try{
    const auth=req.headers.get("Authorization")??"";
    const userClient=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userErr}=await userClient.auth.getUser();
    if(userErr||!user)return out({error:"Unauthorized"},401);
    const {appointment_id}=await req.json();
    if(!appointment_id)return out({error:"appointment_id is required"},400);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:appt,error:apptErr}=await admin.from("appointments").select("id,customer_id,specialist_id,customer_name,scheduled_at,duration_minutes,status,jitsi_room_url,jitsi_room_name,specialist_joined_at,specialist_first_joined_at,customer_joined_at,specialist_left_at,specialist_last_left_at,customer_left_at,session_started_at,specialist_attendance_seconds,customer_attendance_seconds").eq("id",appointment_id).single();
    if(apptErr||!appt)return out({error:"Appointment not found"},404);
    const isCustomer=appt.customer_id===user.id,isSpecialist=appt.specialist_id===user.id;
    if(!isCustomer&&!isSpecialist)return out({error:"Forbidden: You do not have access to this call."},403);
    if(appt.status!=="confirmed")return out({error:`This appointment is ${appt.status} and cannot be joined.`},409);
    const start=new Date(appt.scheduled_at).getTime(),joinStart=start-JOIN_EARLY_MS,joinEnd=start+JOIN_WINDOW_MS,now=Date.now();
    if(now>=joinEnd)return out({error:"This session's one-hour join window has ended."},410);
    if(now<joinStart)return out({error:"The join window opens two minutes before the scheduled time."},425);
    const displayName=isSpecialist?"Specialist":(appt.customer_name??"Customer");
    const dailyKey=Deno.env.get("DAILY_API_KEY"); if(!dailyKey)return out({error:"Server Configuration Error: DAILY_API_KEY not configured"},500);
    const base="https://api.daily.co/v1",roomName=`appt-${appointment_id}`.toLowerCase();
    let roomUrl:string; const roomHeaders={Authorization:`Bearer ${dailyKey}`};
    const getRoom=await fetch(`${base}/rooms/${roomName}`,{headers:roomHeaders});
    if(getRoom.ok){
      const existing=await getRoom.json(); roomUrl=existing.url;
      await fetch(`${base}/rooms/${roomName}`,{method:"POST",headers:{...roomHeaders,"Content-Type":"application/json"},body:JSON.stringify({properties:{enable_prejoin_ui:false,enable_knocking:false,enable_chat:true,enable_screenshare:true}})});
    }else if(getRoom.status===404){
      const exp=Math.floor((joinEnd+5*60000)/1000);
      const create=await fetch(`${base}/rooms`,{method:"POST",headers:{...roomHeaders,"Content-Type":"application/json"},body:JSON.stringify({name:roomName,properties:{exp,enable_prejoin_ui:false,enable_screenshare:true,enable_chat:true,start_video_off:false,start_audio_off:false,enable_knocking:false}})});
      if(!create.ok)return out({error:`Failed to create room: ${await create.text()}`},502);
      roomUrl=(await create.json()).url;
    }else return out({error:`Daily API error: ${await getRoom.text()}`},502);
    const tokenResp=await fetch(`${base}/meeting-tokens`,{method:"POST",headers:{...roomHeaders,"Content-Type":"application/json"},body:JSON.stringify({properties:{room_name:roomName,user_name:displayName,is_owner:isSpecialist,exp:Math.floor(joinEnd/1000)}})});
    if(!tokenResp.ok)return out({error:`Failed to create meeting token: ${await tokenResp.text()}`},502);
    const token=(await tokenResp.json()).token;
    const stamp=new Date().toISOString(); const updates:any={updated_at:stamp};
    if(isSpecialist){
      if(appt.specialist_joined_at&&appt.specialist_left_at){
        const added=Math.max(0,Math.floor((Math.min(now,joinEnd)-new Date(appt.specialist_joined_at).getTime())/1000));
        updates.specialist_attendance_seconds=Math.min(3600,(appt.specialist_attendance_seconds??0)+added);
      }
      updates.specialist_joined_at=stamp; updates.specialist_first_joined_at=appt.specialist_first_joined_at??stamp; updates.specialist_left_at=null; updates.session_started_at=appt.specialist_first_joined_at??stamp;
    }else{
      if(appt.customer_joined_at&&appt.customer_left_at){
        const added=Math.max(0,Math.floor((Math.min(now,joinEnd)-new Date(appt.customer_joined_at).getTime())/1000));
        updates.customer_attendance_seconds=Math.min(3600,(appt.customer_attendance_seconds??0)+added);
      }
      updates.customer_joined_at=stamp; updates.customer_left_at=null; updates.session_started_at=appt.session_started_at??(appt.specialist_joined_at??stamp);
    }
    await admin.from("appointments").update(updates).eq("id",appointment_id);
    return out({room_url:roomUrl,token,display_name:displayName});
  }catch(err){console.error(err);return out({error:err instanceof Error?err.message:"Internal error"},500);}
});