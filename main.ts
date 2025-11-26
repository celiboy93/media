import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Usage: /?url=MEDIAFIRE_LINK", { status: 400 });
  }

  try {
    // ၁။ MediaFire Page ကို အရင်သွားပြီး Direct Link ယူမယ်
    // (ပထမဆုံး စမ်းတုန်းက အလုပ်လုပ်တဲ့ နည်းလမ်းအတိုင်း)
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36";
    
    const pageResponse = await fetch(targetUrl, {
      headers: { "User-Agent": userAgent }
    });
    const html = await pageResponse.text();

    // Direct Link ရှာမယ့် Regex (ဒါက အတိကျဆုံးပါပဲ)
    const match = html.match(/aria-label="Download file"\s+href="([^"]+)"/);
    
    if (!match) {
      return new Response("Download Link ရှာမတွေ့ပါ။ Link မှန်မမှန် ပြန်စစ်ပါ။", { status: 404 });
    }

    const directLink = match[1];

    // ၂။ Video Streaming အပိုင်း (အရေးကြီးဆုံးနေရာ)
    // Player က တောင်းတဲ့ Range (ဥပမာ - 50MB ကနေစပြပါ) ကို ဖမ်းယူမယ်
    const range = req.headers.get("range");
    
    const videoHeaders = new Headers({
      "User-Agent": userAgent,
    });

    // Player က ရှေ့ကျော်ချင်လို့ Range ပို့လိုက်ရင် MediaFire ကို လက်ဆင့်ကမ်းမယ်
    if (range) {
      videoHeaders.set("Range", range);
    }

    // MediaFire ဆီကနေ ဖိုင်ကို လှမ်းဆွဲမယ် (Stream)
    const videoResponse = await fetch(directLink, {
      headers: videoHeaders
    });

    // ၃။ MediaFire က ပြန်ပို့တဲ့ Header တွေကို Player ဆီ ပြန်ပို့မယ်
    // (Content-Range, Content-Length ပါမှ ရှေ့ကျော်လို့ရမှာပါ)
    const responseHeaders = new Headers();
    
    // အရေးကြီးတဲ့ Header တွေကို ကူးထည့်မယ်
    if (videoResponse.headers.has("Content-Type")) {
      responseHeaders.set("Content-Type", videoResponse.headers.get("Content-Type")!);
    }
    if (videoResponse.headers.has("Content-Length")) {
      responseHeaders.set("Content-Length", videoResponse.headers.get("Content-Length")!);
    }
    if (videoResponse.headers.has("Content-Range")) {
      responseHeaders.set("Content-Range", videoResponse.headers.get("Content-Range")!);
    }
    if (videoResponse.headers.has("Accept-Ranges")) {
      responseHeaders.set("Accept-Ranges", videoResponse.headers.get("Accept-Ranges")!);
    }
    
    responseHeaders.set("Access-Control-Allow-Origin", "*"); // CORS ဖွင့်မယ်

    // Video Data ကို Deno က ကိုင်မထားဘဲ တန်းပြီး လွှတ်ပေးမယ် (206 Partial Content)
    return new Response(videoResponse.body, {
      status: videoResponse.status, // 200 (Full) သို့မဟုတ် 206 (Partial)
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
