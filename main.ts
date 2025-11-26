import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  // ၁။ URL မပါရင် Usage ပြမယ်
  if (!targetUrl) {
    return new Response("Usage: https://your-project.deno.dev/?url=MEDIAFIRE_LINK", {
      status: 400,
    });
  }

  try {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

    // ၂။ MediaFire Link အမှန် (Direct Link) ကို အရင်ရှာမယ်
    const pageResponse = await fetch(targetUrl, {
      headers: { "User-Agent": userAgent }
    });
    const html = await pageResponse.text();

    // Direct Link ရှာနည်း
    const match = html.match(/aria-label="Download file"\s+href="([^"]+)"/);
    
    if (!match) {
      return new Response("Error: Download Link Not Found (MediaFire might have blocked or deleted it).", { status: 404 });
    }

    const directVideoLink = match[1];

    // ၃။ Video Stream လုပ်ပေးမယ့်အပိုင်း (Data သက်သာစေမည့် Range Support ပါဝင်သည်)
    
    // Player (Movie App) က တောင်းတဲ့ Range (ဥပမာ - 10MB နေရာကနေ စပြပါ) ကို ယူမယ်
    const range = req.headers.get("range");
    const fetchHeaders = new Headers({
      "User-Agent": userAgent
    });

    // Range ပါရင် MediaFire ဆီကိုလည်း အဲ့ဒီ Range အတိုင်းပဲ လှမ်းတောင်းပေးမယ်
    if (range) {
      fetchHeaders.set("Range", range);
    }

    // MediaFire ဆီက Video ကို လှမ်းဆွဲမယ်
    const videoResponse = await fetch(directVideoLink, {
      headers: fetchHeaders
    });

    // MediaFire က ပြန်ပို့တဲ့ Header တွေကို ပြန်ယူမယ် (Content-Length, Content-Range, etc.)
    const responseHeaders = new Headers(videoResponse.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*"); // Player တွေအတွက် CORS ဖွင့်မယ်
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    // Video Data ကို Player ဆီ တိုက်ရိုက်ပြန်ပို့မယ် (Streaming)
    return new Response(videoResponse.body, {
      status: videoResponse.status, // 200 (Full) or 206 (Partial/Seeking)
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
