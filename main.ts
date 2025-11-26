import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// 🔥 ဒီနေရာမှာ ကိုယ်ကြိုက်တဲ့ Password ပြောင်းထည့်ပါ 🔥
const ACCESS_PASSWORD = "123456"; 

serve(async (req: Request) => {
  const reqUrl = new URL(req.url);
  const targetUrl = reqUrl.searchParams.get("url");
  const customName = reqUrl.searchParams.get("name");
  const isStream = reqUrl.searchParams.get("stream") === "yes";
  const authKey = reqUrl.searchParams.get("key");

  // ---------------------------------------------------------
  // အပိုင်း (၁) - Generator UI (Home Page)
  // ---------------------------------------------------------
  if (!targetUrl) {
    return new Response(renderUI(), { headers: { "content-type": "text/html" } });
  }

  // ---------------------------------------------------------
  // အပိုင်း (၂) - လုံခြုံရေး စစ်ဆေးခြင်း (Security Check)
  // ---------------------------------------------------------
  if (authKey !== ACCESS_PASSWORD) {
    return new Response("Access Denied: Incorrect Password!", { status: 403 });
  }

  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

  try {
    // ---------------------------------------------------------
    // အပိုင်း (၃) - Streaming Mode (Video ဒေါင်းမည့်အချိန်)
    // ---------------------------------------------------------
    if (isStream) {
      // Direct Link ရှာမယ်
      const pageResp = await fetch(targetUrl, { headers: { "User-Agent": userAgent } });
      const pageHtml = await pageResp.text();
      const match = pageHtml.match(/aria-label="Download file"\s+href="([^"]+)"/);
      
      if (!match) return new Response("Download Link Not Found", { status: 404 });
      
      const directLink = match[1];

      // Range Support (ရှေ့ကျော်လို့ရအောင်)
      const range = req.headers.get("range");
      const fetchHeaders = new Headers({ "User-Agent": userAgent });
      if (range) fetchHeaders.set("Range", range);

      const videoResponse = await fetch(directLink, { headers: fetchHeaders });

      // Headers ပြန်စီမယ်
      const responseHeaders = new Headers(videoResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      // ဖိုင်နာမည် ပြောင်းမည့်နေရာ (Custom Filename)
      let finalName = "video.mp4";
      if (customName) {
          finalName = customName.endsWith(".mp4") ? customName : `${customName}.mp4`;
      } else {
          // Custom Name မပါရင် Original Name ရှာမယ်
          const nameMatch = pageHtml.match(/<div class="filename">([^<]+)<\/div>/);
          if (nameMatch) finalName = nameMatch[1].trim();
      }

      // App ထဲမှာ တန်းပွင့်ချင်ရင် inline, ဒေါင်းချင်ရင် attachment
      responseHeaders.set("Content-Disposition", `inline; filename="${finalName}"`);

      return new Response(videoResponse.body, {
        status: videoResponse.status,
        headers: responseHeaders,
      });
    }

    // ---------------------------------------------------------
    // အပိုင်း (၄) - MediaFire Page အတု (Proxy Page)
    // ---------------------------------------------------------
    const response = await fetch(targetUrl, { headers: { "User-Agent": userAgent } });
    let html = await response.text();

    html = html.replace('<head>', `<head><base href="https://www.mediafire.com/">`);

    const downloadLinkMatch = html.match(/aria-label="Download file"\s+href="([^"]+)"/);
    
    if (downloadLinkMatch) {
      const originalDownloadLink = downloadLinkMatch[1];
      
      // Proxy Link ဖန်တီးရာတွင် Password နှင့် Custom Name ကိုပါ ထည့်ပေးလိုက်သည်
      let myProxyLink = `${reqUrl.origin}/?url=${encodeURIComponent(targetUrl)}&stream=yes&key=${ACCESS_PASSWORD}`;
      if (customName) myProxyLink += `&name=${encodeURIComponent(customName)}`;
      
      html = html.replace(originalDownloadLink, myProxyLink);
    }

    // မလိုအပ်သော Script များကို ဖယ်ရှားခြင်း (Page ပေါ့ပါးစေရန်)
    html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "");

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" }
    });

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
});

// ---------------------------------------------------------
// UI ဒီဇိုင်း (Generator Page)
// ---------------------------------------------------------
function renderUI() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Secure MediaFire Link Generator</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #121212; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .container { background: #1e1e1e; padding: 2rem; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); width: 90%; max-width: 450px; }
        h2 { text-align: center; color: #4dabf7; margin-top: 0; }
        label { display: block; margin-bottom: 5px; font-size: 0.9rem; color: #aaa; }
        input { width: 100%; padding: 12px; margin-bottom: 15px; background: #2c2c2c; border: 1px solid #444; border-radius: 6px; color: #fff; box-sizing: border-box; }
        input:focus { border-color: #4dabf7; outline: none; }
        button { width: 100%; padding: 12px; background: #4dabf7; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 1rem; transition: 0.2s; }
        button:hover { background: #3b8dd4; }
        
        .result-box { margin-top: 20px; padding: 15px; background: #252525; border-radius: 6px; border: 1px solid #333; display: none; }
        .result-box p { margin: 0 0 5px; font-size: 0.85rem; color: #888; }
        #outputLink { font-family: monospace; color: #74c0fc; width: 100%; background: #111; border: none; padding: 8px; border-radius: 4px; }
        .copy-btn { margin-top: 10px; background: #2c2c2c; color: #fff; border: 1px solid #555; }
        .copy-btn:hover { background: #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Link Generator</h2>
        
        <label>MediaFire URL:</label>
        <input type="text" id="mfUrl" placeholder="https://mediafire.com/..." required>
        
        <label>Custom Filename (Optional):</label>
        <input type="text" id="customName" placeholder="Example: my_movie.mp4">
        
        <label>Secret Password:</label>
        <input type="password" id="passKey" placeholder="Enter your secret key">

        <button onclick="generateLink()">Generate Link</button>

        <div class="result-box" id="resultArea">
          <p>Generated Link:</p>
          <input type="text" id="outputLink" readonly>
          <button class="copy-btn" onclick="copyToClipboard()">Copy Link</button>
        </div>
      </div>

      <script>
        function generateLink() {
          const url = document.getElementById('mfUrl').value.trim();
          const name = document.getElementById('customName').value.trim();
          const key = document.getElementById('passKey').value.trim();
          const resultArea = document.getElementById('resultArea');
          const output = document.getElementById('outputLink');

          if (!url || !key) {
            alert("URL and Password are required!");
            return;
          }

          // လက်ရှိ Deno URL ကိုယူမယ်
          const currentOrigin = window.location.origin;
          
          // Link တည်ဆောက်မယ်
          let finalLink = \`\${currentOrigin}/?url=\${encodeURIComponent(url)}&key=\${encodeURIComponent(key)}\`;
          
          if (name) {
            finalLink += \`&name=\${encodeURIComponent(name)}\`;
          }

          output.value = finalLink;
          resultArea.style.display = "block";
        }

        function copyToClipboard() {
          const copyText = document.getElementById("outputLink");
          copyText.select();
          document.execCommand("copy");
          alert("Copied to clipboard!");
        }
      </script>
    </body>
    </html>
  `;
}
