/**
 * Cloudflare Worker for pakzy-o
 * Redirects all traffic permanently (301) to the new qokhims website
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, 'https://qokhims.wo-nad.workers.dev');

    return new Response(
      `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>ร้านย้ายไป qokhims เรียบร้อยแล้วค่ะ ♡</title>
  <meta http-equiv="refresh" content="0; url=${targetUrl.toString()}">
  <link rel="canonical" href="${targetUrl.toString()}">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px; background: #fdf8f5; color: #4a3228;">
  <p style="font-size: 1.25rem; font-weight: bold; margin-bottom: 12px;">ร้าน pakzy.o ได้เปลี่ยนชื่อแบรนด์เป็น <strong>qokhims</strong> เรียบร้อยแล้วค่ะ ♡</p>
  <p style="font-size: 1rem; color: #7a5c50; margin-bottom: 24px;">กำลังพาท่านไปยังเว็บไซต์ใหม่โดยอัตโนมัติ...</p>
  <p><a href="${targetUrl.toString()}" style="display: inline-block; padding: 10px 20px; background: #ec7a9a; color: #fff; border-radius: 9999px; text-decoration: none; font-weight: 500;">คลิกที่นี่หากหน้าเว็บไม่เปลี่ยนอัตโนมัติ</a></p>
</body>
</html>`,
      {
        status: 301,
        headers: {
          'Location': targetUrl.toString(),
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      }
    );
  },
};
