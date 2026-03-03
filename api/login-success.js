// api/login-success.js
// Recebe token via query string, salva no localStorage via HTML/JS e redireciona

export default function handler(req, res) {
  const token = req.query?.token ?? "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Entrando...</title>
  <style>
    body { min-height:100vh; display:flex; align-items:center; justify-content:center;
           background: linear-gradient(135deg,#19385C,#0f2240); font-family:system-ui,sans-serif; }
    .box { color:white; text-align:center; }
    .spinner { width:48px; height:48px; border:4px solid rgba(255,255,255,0.2);
               border-top-color:#E8B84B; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 16px; }
    @keyframes spin { to { transform:rotate(360deg); } }
    p { color:rgba(255,255,255,0.7); font-size:14px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <p>Entrando no painel...</p>
  </div>
  <script>
    // Salvar token no localStorage e redirecionar para o dashboard
    const token = ${JSON.stringify(token)};
    if (token) {
      localStorage.setItem('admin_token', token);
    }
    window.location.href = '/dashboard';
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(html);
}
