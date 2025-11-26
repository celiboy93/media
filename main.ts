import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  const reqUrl = new URL(req.url);
  const targetUrl = reqUrl.searchParams.get("url");
  const isStream = reqUrl.searchParams.get("stream") === "yes"; // Stream လုပ်မလား စစ်မယ်

  // ၁။ URL မပါရင် Usage ပြမယ်
  if (!targetUrl) {
    return new Response(htmlPage(`
      <h2>MediaFire Proxy</h2>
      <form action="/" method="GET">
        <input type="text" name="url" placeholder="MediaFire Link ထည့်ပါ..." required />
        <button type="submit">Go to Page</button>
      </form>
    `), { headers: { "content-type": "text/html" } });
  }

  try {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

    // ၂။ MediaFire ကနေ Direct Link အရင်သွားယူမယ်
    const pageResponse = await fetch(targetUrl, {
      headers: { "User-Agent": userAgent }
    });
    const html = await pageResponse.text();

    // Direct Link ရှာမယ်
    const match = html.match(/aria-label="Download file"\s+href="([^"]+)"/);
    const nameMatch = html.match(/<div class="filename">([^<]+)<\/div>/);
    const fileName = nameMatch ? nameMatch[1].trim() : "Video File";

    if (!match) {
      return new Response("Error: Download Link not found.", { status: 404 });
    }

    const directLink = match[1];

    // ---------------------------------------------------------
    // အပိုင်း (၃) - Download ခလုတ်နှိပ်လိုက်မှ အလုပ်လုပ်မည့် Streaming အပိုင်း
    // ---------------------------------------------------------
    if (isStream) {
      // Player က တောင်းတဲ့ Range (ရှေ့ကျော်မယ့် အပိုင်း) ကို ယူမယ်
      const range = req.headers.get("range");
      const fetchHeaders = new Headers({ "User-Agent": userAgent });

      // Range ပါရင် MediaFire ဆီ လက်ဆင့်ကမ်းမယ် (Data သက်သာဖို့ အဓိကအချက်)
      if (range) {
        fetchHeaders.set("Range", range);
      }

      const videoResponse = await fetch(directLink, {
        headers: fetchHeaders
      });

      // MediaFire ဆီက Header တွေကို ပြန်ယူမယ်
      const responseHeaders = new Headers(videoResponse.headers);
      
      // အရေးကြီးတဲ့ Header တွေ (ကျော်ကြည့်ဖို့အတွက်)
      responseHeaders.set("Accept-Ranges", "bytes");
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      // Browser/App က Download မလုပ်ဘဲ Play အောင် Content-Disposition ကို ပြင်မယ်
      responseHeaders.set("Content-Disposition", `inline; filename="${fileName}"`);

      return new Response(videoResponse.body, {
        status: videoResponse.status, // 200 သို့မဟုတ် 206 (Partial) ပြန်ပို့မယ်
        headers: responseHeaders,
      });
    }

    // ---------------------------------------------------------
    // အပိုင်း (၄) - ပထမဆုံးမြင်ရမည့် Download Page (UI)
    // ---------------------------------------------------------
    // ဒီမှာ Deno ရဲ့ Stream Link ကို ဖန်တီးလိုက်မယ်
    const streamLink = `${reqUrl.origin}/?url=${encodeURIComponent(targetUrl)}&stream=yes`;

    return new Response(htmlPage(`
      <div class="icon">🎬</div>
      <h3>${fileName}</h3>
      <p style="color:#666; font-size:0.9rem;">Ready to Stream/Download</p>
      <br>
      
      <!-- ဒီခလုတ်ကို နှိပ်မှ အပေါ်က Streaming အပိုင်းကို ရောက်မယ် -->
      <a href="${streamLink}" class="btn download">Download / Play</a>
      
      <br><br>
      <div class="note">VPN မလိုပါ | ရှေ့ကျော်၍ ရသည်</div>
    `), { headers: { "content-type": "text/html" } });

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});

// HTML ဒီဇိုင်း
function htmlPage(content: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MediaFire Player</title>
      <style>
        body { font-family: sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; width: 90%; max-width: 400px; }
        input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 5px; margin-bottom: 10px; box-sizing: border-box; }
        button, .btn { background: #007bff; color: white; padding: 12px 25px; border: none; border-radius: 50px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
        .btn.download { background: #28a745; width: 100%; box-sizing: border-box; box-shadow: 0 4px 10px rgba(40,167,69,0.3); }
        .btn:active { transform: scale(0.98); }
        .icon { font-size: 3rem; margin-bottom: 10px; }
        .note { background: #e9ecef; padding: 5px 10px; border-radius: 5px; font-size: 0.8rem; color: #555; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        ${content}
      </div>
    </body>
    </html>
  `;
}
