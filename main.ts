import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  const reqUrl = new URL(req.url);
  const targetUrl = reqUrl.searchParams.get("url");

  // ၁။ ပင်မစာမျက်နှာ (URL ထည့်ရန် Box ပြမယ်)
  if (!targetUrl) {
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MediaFire Proxy</title>
        <style>
          body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f2f5;margin:0;}
          form{background:white;padding:30px;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,0.1);width:90%;max-width:400px;text-align:center;}
          input{width:90%;padding:12px;border:1px solid #ccc;border-radius:5px;margin-bottom:15px;}
          button{background:#0070f3;color:white;border:none;padding:12px 20px;border-radius:5px;cursor:pointer;font-weight:bold;width:100%;}
        </style>
      </head>
      <body>
        <form action="/" method="GET">
          <h2>MediaFire Proxy</h2>
          <input type="text" name="url" placeholder="Enter MediaFire Link..." required />
          <button type="submit">Go to Site</button>
        </form>
      </body>
      </html>
    `, { headers: { "content-type": "text/html" } });
  }

  try {
    // ၂။ MediaFire ဆီကို Browser အနေနဲ့ ဟန်ဆောင်ပြီး လှမ်းခေါ်မယ်
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // ၃။ (က) အကယ်၍ ဖိုင်ဒေါင်းလုပ်ဖြစ်နေရင် (Stream လုပ်ပေးမယ်)
    if (contentType.includes("application/octet-stream") || contentType.includes("video") || targetUrl.includes("download")) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      // Deno ကနေ ဖြတ်ဒေါင်းမယ့် Stream
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    }

    // ၃။ (ခ) အကယ်၍ ဝဘ်ဆိုက်စာမျက်နှာ (HTML) ဖြစ်နေရင် (Link ပြင်မယ်)
    let html = await response.text();

    // CSS/Images တွေ ပေါ်အောင် Base Tag ထည့်မယ်
    html = html.replace('<head>', `<head><base href="https://www.mediafire.com/">`);

    // *** အဓိကအချက်: Download Button ကို ရှာပြီး Deno Proxy Link နဲ့ အစားထိုးမယ် ***
    // MediaFire ရဲ့ Download Link ကို ရှာခြင်း
    const downloadLinkMatch = html.match(/aria-label="Download file"\s+href="([^"]+)"/);
    
    if (downloadLinkMatch) {
      const originalDownloadLink = downloadLinkMatch[1];
      // Deno ရဲ့ Proxy Link အဖြစ် ပြောင်းလိုက်မယ်
      const proxyLink = `${reqUrl.origin}/?url=${encodeURIComponent(originalDownloadLink)}`;
      
      // HTML ထဲမှာ Link အဟောင်းကို အသစ်နဲ့ လဲလိုက်မယ်
      html = html.replace(originalDownloadLink, proxyLink);
    }

    // ပြင်ပြီးသား HTML ကို ပြန်ထုတ်ပေးမယ်
    return new Response(html, {
      headers: { "content-type": "text/html" }
    });

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
