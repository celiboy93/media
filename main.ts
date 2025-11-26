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
          <button type="submit">Go to Page</button>
        </form>
      </div>
    `), { headers: { "content-type": "text/html" } });
  }

  try {
    // ၂။ MediaFire ကို Deno ကနေ လှမ်းကြည့်မယ်
    const response = await fetch(targetUrl);
    const html = await response.text();

    // ၃။ Direct Link နဲ့ ဖိုင်နာမည်ကို ရှာမယ်
    const linkMatch = html.match(/id="downloadButton"\s+href="([^"]+)"/);
    const nameMatch = html.match(/<div class="filename">([^<]+)<\/div>/);
    const sizeMatch = html.match(/<li>File size: <span>([^<]+)<\/span><\/li>/); // Size ရှာတာ (optional)

    if (!linkMatch) {
      return new Response(htmlTemplate(`
        <div class="card error">
          <h2>Error!</h2>
          <p>Download Link ကို ရှာမတွေ့ပါ။ Link မှားနေခြင်း (သို့) MediaFire ဘက်က ပိတ်ထားခြင်း ဖြစ်နိုင်ပါတယ်။</p>
          <a href="/" class="btn">Back</a>
        </div>
      `), { headers: { "content-type": "text/html" } });
    }

    const directLink = linkMatch[1];
    const fileName = nameMatch ? nameMatch[1].trim() : "Unknown File";
    // Size ကိုရှာမတွေ့ရင် regex အနီးစပ်ဆုံးနဲ့ ပြမယ်
    const fileSize = sizeMatch ? sizeMatch[1] : "Unknown Size";

    // ၄။ သင့်အတွက် Download Page အသစ် ဖန်တီးပေးမယ်
    return new Response(htmlTemplate(`
      <div class="card">
        <div class="icon">📂</div>
        <h2>${fileName}</h2>
        <p>File Size: <strong>${fileSize}</strong></p>
        <br>
        <a href="${directLink}" class="btn download">Download Now</a>
        <br><br>
        <small>VPN မလိုဘဲ ဒေါင်းနိုင်ပါပြီ</small>
        <br>
        <a href="/" style="color:#666; text-decoration:none; font-size:0.8rem; margin-top:10px; display:block;">Another File</a>
      </div>
    `), { headers: { "content-type": "text/html" } });

  } catch (error) {
    return new Response(htmlTemplate(`
      <div class="card error">
        <h2>Error</h2>
        <p>${error.message}</p>
      </div>
    `), { headers: { "content-type": "text/html" } });
  }
});

// HTML ဒီဇိုင်းပုံစံ (CSS)
function htmlTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MediaFire Unblocker</title>
      <style>
        body { font-family: sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
        input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
        button, .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; font-weight: bold; }
        .btn.download { background: #28a745; font-size: 1.1rem; padding: 12px 25px; }
        .btn:hover { opacity: 0.9; }
        .icon { font-size: 3rem; margin-bottom: 1rem; }
        .error h2 { color: #dc3545; }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}
