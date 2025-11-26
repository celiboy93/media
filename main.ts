import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  const reqUrl = new URL(req.url);
  const targetUrl = reqUrl.searchParams.get("url");
  const isStream = reqUrl.searchParams.get("stream") === "true";

  // ၁။ URL မပါရင် Home Page ပြမယ်
  if (!targetUrl) {
    return new Response("Please provide a MediaFire URL", { status: 400 });
  }

  try {
    // ၂။ Streaming Mode (ဗီဒီယိုဖိုင် အစစ်ကို Deno ကနေ ဖြတ်ပို့ပေးမယ့်အပိုင်း)
    if (isStream) {
      // Player က တောင်းဆိုတဲ့ Range (ဥပမာ - ဗီဒီယိုရဲ့ အလယ်ကစပြပါ) ကို ယူမယ်
      const range = req.headers.get("range");
      const headers = new Headers({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36"
      });

      // Range ပါရင် MediaFire ဆီကို အဲ့ဒီ range အတိုင်း လှမ်းတောင်းမယ်
      if (range) {
        headers.set("Range", range);
      }

      const videoResponse = await fetch(targetUrl, { headers });

      // MediaFire က ပြန်ပို့တဲ့ Header တွေကို ပြန်ယူပြီး Player ဆီ ပို့မယ်
      const responseHeaders = new Headers(videoResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Cache-Control", "public, max-age=3600"); // Cache လုပ်ခိုင်းမယ်

      // Video Stream ပြန်ပို့ခြင်း (206 Partial Content သို့မဟုတ် 200 OK)
      return new Response(videoResponse.body, {
        status: videoResponse.status,
        headers: responseHeaders,
      });
    }

    // ၃။ MediaFire Page ကို ဖတ်ပြီး Direct Link ရှာမယ့်အပိုင်း
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36"
      }
    });

    let html = await response.text();

    // Direct Download Link ကို ရှာမယ်
    const downloadLinkMatch = html.match(/aria-label="Download file"\s+href="([^"]+)"/);

    if (downloadLinkMatch) {
      const originalDownloadLink = downloadLinkMatch[1];
      
      // Deno Proxy Link အဖြစ် ပြောင်းမယ် (stream=true ထည့်ပေးလိုက်မယ်)
      // ဒါမှ အပေါ်က Streaming Mode ထဲကို ဝင်သွားမှာ
      const proxyLink = `${reqUrl.origin}/?url=${encodeURIComponent(originalDownloadLink)}&stream=true`;
      
      // အကယ်၍ ဒါက Browser မဟုတ်ဘဲ Player (Exoplayer/VLC) က တိုက်ရိုက်ခေါ်တာဆိုရင်
      // Video Link ကို တန်းလွှဲပေးလိုက်မယ် (Redirect)
      const userAgent = req.headers.get("user-agent") || "";
      if (!userAgent.includes("Mozilla")) { 
         return Response.redirect(proxyLink, 302);
      }

      // HTML Page ထဲက Link ကို Proxy Link နဲ့ လဲမယ်
      html = html.replace('<head>', `<head><base href="https://www.mediafire.com/">`);
      html = html.replace(originalDownloadLink, proxyLink);
      
      return new Response(html, {
        headers: { "content-type": "text/html" }
      });
    }

    // Link ရှာမတွေ့ရင် မူရင်းအတိုင်း ပြန်ပို့ (Fallback)
    return new Response(html, {
      headers: { "content-type": "text/html" }
    });

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
