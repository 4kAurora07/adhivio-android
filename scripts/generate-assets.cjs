const http = require('http');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="28" fill="#E05C5C" />
  <g fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 68 126 C 74 126 78 106 82 86 C 85 72 88 66 88 64 A 8 8 0 0 1 104 64 C 104 68 107 72 110 86 C 114 106 118 126 124 126 L 104 126 A 8 8 0 1 1 88 126 L 68 126" />
    <path d="M 54 72 A 48 48 0 0 0 54 120" />
    <path d="M 42 58 A 66 66 0 0 0 42 134" />
    <path d="M 138 72 A 48 48 0 0 1 138 120" />
    <path d="M 150 58 A 66 66 0 0 1 150 134" />
  </g>
</svg>`;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        const saveBase64 = (targetPath, base64Str) => {
          const base64Data = base64Str.replace(/^data:image\/png;base64,/, "");
          const absolutePath = path.resolve(__dirname, '..', targetPath);
          const dir = path.dirname(absolutePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(absolutePath, base64Data, 'base64');
          console.log(`Saved ${targetPath}`);
        };

        saveBase64('assets/icon.png', data.icon1024);
        saveBase64('public/logo.png', data.logo512);
        saveBase64('public/pwa-192x192.png', data.pwa192);
        saveBase64('public/pwa-512x512.png', data.pwa512);

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        
        console.log('All branding assets generated! Stopping server...');
        setTimeout(() => process.exit(0), 1000);
      } catch (err) {
        console.error('Error saving images:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error');
        process.exit(1);
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <body>
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div>Rendering icons...</div>
          <canvas id="c1024" width="1024" height="1024" style="border:1px solid #ccc;"></canvas>
          <canvas id="c512" width="512" height="512" style="border:1px solid #ccc;"></canvas>
          <canvas id="c192" width="192" height="192" style="border:1px solid #ccc;"></canvas>
        </div>
        <script>
          const svgBase64 = 'data:image/svg+xml;base64,' + btoa(\`${svgContent}\`);
          const img = new Image();
          
          img.onload = function() {
            const render = (canvasId, size) => {
              const canvas = document.getElementById(canvasId);
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, size, size);
              ctx.drawImage(img, 0, 0, size, size);
              return canvas.toDataURL('image/png');
            };

            const icon1024 = render('c1024', 1024);
            const logo512 = render('c512', 512);
            const pwa192 = render('c192', 192);
            const pwa512 = logo512; // same resolution

            fetch('/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ icon1024, logo512, pwa192, pwa512 })
            }).then(() => console.log('Successfully requested save.'));
          };

          img.src = svgBase64;
        </script>
      </body>
      </html>
    `);
  }
});

server.listen(8081, () => {
  console.log('Asset generation server running on http://localhost:8081');
});
