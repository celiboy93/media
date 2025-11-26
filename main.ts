import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  // ၁။ URL မပါရင် အညွှန်းပြမယ်
  if (!targetUrl) {
    return new Response(htmlTemplate(`
      <div class="card">
        <h2>MediaFire Link Opener</h2>
        <form action="/" method="GET">
          <input type="text" name="url" placeholder="Paste MediaFire Link Here..." required />
          <button type="submit">Go</button>
        </form>
      </div>
    `), { headers: { "content-type": "text/html" } });
  }

  try {
    // ၂။ MediaFire ကို Browser တစ်ခုအနေနဲ့ ဟန်ဆောင်ပြီး လှမ်းခေါ်မယ် (အရေးကြီးပါတယ်)
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });
    
    const html = await response.text();

    // ၃။ Direct Link ရှာနည်း (ပိုမိုတိကျသော နည်းလမ်းအသစ်)
    // MediaFire ရဲ့ aria-label="Download file" ပါတဲ့ link ကို ရှာမယ်
    let match = html.match(/aria-label="Download file"\s+href="([^"]+)"/);
    
    // အပေါ်ကနည်းနဲ့ မတွေ့ရင် download server link ပုံစံနဲ့ ထပ်ရှာမယ်
    if (!match) {
      match = html.match(/href="((https?:\/\/download\d+\.mediafire\.com\/[^\"]+))"/);
    }

    // ဖိုင်နာမည်ရှာမယ်
    const nameMatch = html.match(/<div class="filename">([^<]+)<\/div>/) || html.match(/title="([^"]+)"/);
    const fileName = nameMatch ? nameMatch[1].trim() : "Unknown File";

    if (!match) {
      return new Response(htmlTemplate(`
        <div class="card error">
          <h2>Error!</h2>
          <p>Download Link ကို ရှာမတွေ့ပါ။ <br> MediaFire က Link ကို Password ခံထားတာ (သို့) ဖျက်လိုက်တာ ဖြစ်နိုင်ပါတယ်။</p>
          <a href="/" class="btn">Back</a>
        </div>
      `), { headers: { "content-type": "text/html" } });
    }

    const directLink = match[1];

    // ၄။ Download Page ပြမယ်
    return new Response(htmlTemplate(`
      <div class="card">
        <div class="icon">📂</div>
        <h3 style="word-break: break-all;">${fileName}</h3>
        <br>
        <a href="${directLink}" class="btn download">Download Now</a>
        <br><br>
        <div class="note">VPN မလိုဘဲ ဒေါင်းနိုင်ပါပြီ</div>
        <br>
        <a href="/" style="color:#666; text-decoration:none; font-size:0.8rem;">Another File</a>
      </div>
    `), { headers: { "content-type": "text/html" } });

  } catch (error) {
    return new Response(htmlTemplate(`
      <div class="card error">
        <h2>System Error</h2>
        <p>${error.message}</p>
      </div>
    `), { headers: { "content-type": "text/html" } });
  }
});

// HTML ဒီဇိုင်း (CSS)
function htmlTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MediaFire Bypass</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #e9eff5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: white; padding: 2.5rem; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
        input { width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #eee; border-radius: 8px; box-sizing: border-box; font-size: 16px; outline: none; transition: 0.3s; }
        input:focus { border-color: #007bff; }
        button, .btn { background: #007bff; color: white; padding: 12px 30px; border: none; border-radius: 50px; cursor: pointer; text-decoration: none; display: inline-block; font-weight: 600; transition: 0.3s; box-shadow: 0 4px 6px rgba(0,123,255,0.2); }
        .btn.download { background: #28a745; font-size: 1.2rem; width: 100%; box-sizing: border-box; box-shadow: 0 4px 6px rgba(40,167,69,0.2); }
        .btn:hover { transform: translateY(-2px); opacity: 0.9; }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        .error h2 { color: #dc3545; }
        .note { background: #e2e6ea; padding: 8px; border-radius: 5px; font-size: 0.9rem; color: #555; display: inline-block; }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}
