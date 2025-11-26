import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

// 🔥 ၁။ Admin Password (Link ထုတ်တဲ့စာမျက်နှာကို ဝင်ဖို့)
const ADMIN_PASSWORD = "183110"; 

// 🔥 ၂။ Secret Key (လင့်ခ်တွေကို လက်မှတ်ထိုးဖို့ - ဘယ်သူမှမသိစေနဲ့)
const SECRET_KEY = "Romeo_dyler_soe_kyawwin";

// Signature တွက်တဲ့ Function
async function createSignature(text: string): Promise<string> {
  const data = new TextEncoder().encode(text + SECRET_KEY);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

serve(async (req: Request) => {
  const reqUrl = new URL(req.url);
  
  // Parameters
  const mode = reqUrl.searchParams.get("mode"); // 'admin'
  const pass = reqUrl.searchParams.get("pass"); // admin password
  
  const targetUrl = reqUrl.searchParams.get("url");
  const signature = reqUrl.searchParams.get("sign");
  const customName = reqUrl.searchParams.get("name");
  const isStream = reqUrl.searchParams.get("stream") === "yes";

  // API: Admin က Signature လှမ်းတောင်းတဲ့နေရာ
  const action = reqUrl.searchParams.get("action");
  if (action === "sign" && pass === ADMIN_PASSWORD) {
      const urlToSign = reqUrl.searchParams.get("target") || "";
      const sig = await createSignature(urlToSign);
      return new Response(JSON.stringify({ signature: sig }), { headers: { "content-type": "application/json" }});
  }

  // ---------------------------------------------------------
  // (၁) Admin Generator Page ဝင်ခြင်း
  // Usage: https://project.deno.dev/?mode=admin&pass=123
  // ---------------------------------------------------------
  if (mode === "admin") {
    if (pass !== ADMIN_PASSWORD) return new Response("Wrong Password", { status: 403 });
    return new Response(renderUI(reqUrl.origin, ADMIN_PASSWORD), { headers: { "content-type": "text/html" } });
  }

  // ---------------------------------------------------------
  // (၂) Public Access (Link ဖွင့်ခြင်း)
  // ---------------------------------------------------------
  if (!targetUrl) return new Response("No URL provided", { status: 400 });

  // Signature စစ်ဆေးခြင်း (Security Check)
  const expectedSign = await createSignature(targetUrl);
  if (signature !== expectedSign) {
      return new Response("⚠️ Access Denied: Invalid Signature!\n(Password မပါတော့ဘဲ Signature စစ်တာမို့ Link အမှန်မှပဲ ကြည့်လို့ရပါမယ်)", { status: 403 });
  }

  // အလုပ်စလုပ်မယ် (Proxy)
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

  try {
    // Video Streaming Mode
    if (isStream) {
      const pageResp = await fetch(targetUrl, { headers: { "User-Agent": userAgent } });
      const pageHtml = await pageResp.text();
      const match = pageHtml.match(/aria-label="Download file"\s+href="([^"]+)"/);
      
      if (!match) return new Response("Link Not Found", { status: 404 });
      
      const directLink = match[1];
      const range = req.headers.get("range");
      const fetchHeaders = new Headers({ "User-Agent": userAgent });
      if (range) fetchHeaders.set("Range", range);

      const videoResponse = await fetch(directLink, { headers: fetchHeaders });
      const responseHeaders = new Headers(videoResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      let finalName = "video.mp4";
      if (customName) finalName = customName.endsWith(".mp4") ? customName : `${customName}.mp4`;
      
      responseHeaders.set("Content-Disposition", `inline; filename="${finalName}"`);

      return new Response(videoResponse.body, {
        status: videoResponse.status,
        headers: responseHeaders,
      });
    }

    // Web Page Proxy Mode
    const response = await fetch(targetUrl, { headers: { "User-Agent": userAgent } });
    let html = await response.text();
    html = html.replace('<head>', `<head><base href="https://www.mediafire.com/">`);

    const downloadLinkMatch = html.match(/aria-label="Download file"\s+href="([^"]+)"/);
    if (downloadLinkMatch) {
      const originalDownloadLink = downloadLinkMatch[1];
      // Proxy Link ထဲမှာ Signature ထည့်ပေးလိုက်မယ်
      // User က Download နှိပ်ရင် ဒီ Signature ပါမှ ဒေါင်းလို့ရမယ်
      const sign = await createSignature(targetUrl);
      let myProxyLink = `${reqUrl.origin}/?url=${encodeURIComponent(targetUrl)}&stream=yes&sign=${sign}`;
      if (customName) myProxyLink += `&name=${encodeURIComponent(customName)}`;
      html = html.replace(originalDownloadLink, myProxyLink);
    }
    
    html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "");
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});

// UI Function
function renderUI(origin: string, adminPass: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Link Gen</title>
      <style>
        body { font-family: sans-serif; background: #121212; color: #fff; padding: 20px; display: flex; justify-content: center; }
        .box { background: #222; padding: 20px; border-radius: 8px; width: 100%; max-width: 500px; }
        input { width: 100%; padding: 10px; margin: 5px 0 15px; background: #333; border: 1px solid #444; color: #fff; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #228be6; color: white; border: none; cursor: pointer; }
        textarea { width: 100%; height: 80px; background: #111; color: #0f0; margin-top: 10px; box-sizing: border-box; }
      </style>
    </head>
    <body>
      <div class="box">
        <h3>MediaFire Secure Link Generator</h3>
        <label>MediaFire URL:</label>
        <input type="text" id="url" placeholder="Paste URL here">
        <label>Filename (Optional):</label>
        <input type="text" id="name" placeholder="movie.mp4">
        <button onclick="gen()">Generate Public Link</button>
        <textarea id="out" readonly></textarea>
        <button onclick="copy()" style="margin-top:5px; background:#444">Copy</button>
      </div>
      <script>
        async function gen() {
          const url = document.getElementById('url').value;
          const name = document.getElementById('name').value;
          if(!url) return alert('No URL');
          
          // Server ကိုလှမ်းပြီး Signature တောင်းမယ်
          const res = await fetch(window.location.href + "&action=sign&target=" + encodeURIComponent(url));
          const data = await res.json();
          
          let link = "${origin}/?url=" + encodeURIComponent(url) + "&sign=" + data.signature;
          if(name) link += "&name=" + encodeURIComponent(name);
          
          document.getElementById('out').value = link;
        }
        function copy() { document.getElementById('out').select(); document.execCommand('copy'); }
      </script>
    </body>
    </html>
  `;
}
