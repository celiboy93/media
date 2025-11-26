import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  const reqUrl = new URL(req.url);
  const targetUrl = reqUrl.searchParams.get("url");
  const isStream = reqUrl.searchParams.get("stream") === "yes";

  // ၁။ URL မပါရင် Usage ပြမယ်
  if (!targetUrl) {
    return new Response("Usage: https://your-project.deno.dev/?url=MEDIAFIRE_LINK", {
      headers: { "content-type": "text/plain" }
    });
  }

  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

  try {
    // ------------------------------------------------------------------
    // အပိုင်း (၂) - Download ခလုတ်နှိပ်ပြီးနောက် အလုပ်လုပ်မည့် Streaming
    // ------------------------------------------------------------------
    if (isStream) {
      // MediaFire Direct Link ကိုအရင်ရှာမယ်
      const pageResp = await fetch(targetUrl, { headers: { "User-Agent": userAgent } });
      const pageHtml = await pageResp.text();
      
      // Direct Link ရှာမတွေ့ရင် Error ပြမယ်
      const match = pageHtml.match(/aria-label="Download file"\s+href="([^"]+)"/);
      if (!match) return new Response("Download Link Not Found", { status: 404 });
      
      const directLink = match[1];

      // Player ကတောင်းတဲ့ Range ကို လက်ဆင့်ကမ်းမယ် (ရှေ့ကျော်လို့ရအောင်)
      const range = req.headers.get("range");
      const fetchHeaders = new Headers({ "User-Agent": userAgent });
      if (range) fetchHeaders.set("Range", range);

      const videoResponse = await fetch(directLink, { headers: fetchHeaders });

      // Headers ပြန်စီမယ်
      const responseHeaders = new Headers(videoResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      // ဖိုင်နာမည်မှန်အောင် Original Page ကနေယူမယ်
      const nameMatch = pageHtml.match(/<div class="filename">([^<]+)<\/div>/);
      const fileName = nameMatch ? nameMatch[1].trim() : "video.mp4";
      
      // Browser/App မှာ Play စေချင်ရင် inline, Download စေချင်ရင် attachment
      // ဒီမှာတော့ Original အတိုင်း download ခလုတ်နှိပ်တာမို့ attachment ထားလည်းရ၊ inline ထားလည်းရ
      // App ထဲမှာတန်းပွင့်ချင်ရင် inline က ပိုကောင်းပါတယ်
      responseHeaders.set("Content-Disposition", `inline; filename="${fileName}"`);

      return new Response(videoResponse.body, {
        status: videoResponse.status,
        headers: responseHeaders,
      });
    }

    // ------------------------------------------------------------------
    // အပိုင်း (၃) - MediaFire စာမျက်နှာအတိုင်း (Original Page) ပြပေးခြင်း
    // ------------------------------------------------------------------
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": userAgent }
    });

    let html = await response.text();

    // (က) CSS/Images တွေ ပုံမှန်အတိုင်းပေါ်အောင် Base URL ထည့်မယ်
    html = html.replace('<head>', `<head><base href="https://www.mediafire.com/">`);

    // (ခ) Download ခလုတ်ကို ရှာပြီး Deno Link နဲ့ လဲလိုက်မယ်
    // ဒါမှ User က ခလုတ်နှိပ်ရင် VPN မလိုဘဲ Deno ကနေ ဖြတ်ဒေါင်းမှာ
    const downloadLinkMatch = html.match(/aria-label="Download file"\s+href="([^"]+)"/);
    
    if (downloadLinkMatch) {
      const originalDownloadLink = downloadLinkMatch[1];
      
      // Deno ရဲ့ Stream Link ကို ဖန်တီးမယ်
      // မူရင်း Page URL ကိုပဲ ပြန်ပို့ပေးရမယ် (Direct Link မဟုတ်ဘူး)
      const myProxyLink = `${reqUrl.origin}/?url=${encodeURIComponent(targetUrl)}&stream=yes`;
      
      // HTML ထဲမှာ Link အဟောင်းကိုဖြုတ်ပြီး ကိုယ့် Link ထည့်မယ်
      html = html.replace(originalDownloadLink, myProxyLink);
    }

    // (ဂ) ကြော်ငြာတွေ/မလိုတာတွေ နည်းနည်းရှင်းမယ် (Optional)
    html = html.replace(/<div id="ads".*?<\/div>/gs, ""); 

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" }
    });

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
});
