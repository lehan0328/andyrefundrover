export const getConfirmationEmailHtml = (confirmationUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your Auren account</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Base Reset */
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #334155; 
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 60px 0;
    }

    .container {
      max-width: 520px;
      margin: 0 auto;
      padding: 0 20px;
    }

    /* Main Card */
    .card {
      background-color: #ffffff;
      border-radius: 24px;
      box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.1), 
        0 8px 10px -6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      text-align: center;
      position: relative;
    }
    
    /* Top Decorative Gradient Line */
    .accent-bar {
      height: 8px;
      width: 100%;
      background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
    }

    .content-padding {
      padding: 48px;
    }

    /* Typography */
    h1 {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
      letter-spacing: -0.03em;
    }
    
    p.lead {
      font-size: 16px;
      color: #64748b;
      margin: 0 auto 32px auto;
      max-width: 400px;
    }

    /* Enhanced Button */
    .button-container {
      margin-bottom: 24px;
    }

    .button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #0284c7 100%);
      color: #ffffff !important; 
      padding: 16px 48px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.25);
      letter-spacing: 0.01em;
    }
    
    .expiry-note {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 16px;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      text-align: center;
    }
    
    .footer-text {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    
    .footer a {
      color: #64748b;
      text-decoration: none;
      font-weight: 500;
    }

    .fallback-link {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #f1f5f9;
    }
    
    .fallback-link p {
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 8px;
    }
    
    .fallback-link a {
        color: #3b82f6;
        font-size: 12px;
        word-break: break-all;
    }

  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">

      <div class="card">
        <div class="accent-bar"></div>
        
        <div class="content-padding">
          
          <div style="text-align: center; margin-bottom: 40px;">
            <img src="https://nlthnciekgauhuvjyhpw.supabase.co/storage/v1/object/public/static%20asset/IconOnly_Transparent_NoBuffer%20(1).png" alt="Auren Logo" width="120" height="100" style="display: inline-block; opacity: 0.9;">
          </div>

          <h1>Confirm your email</h1>
          <p class="lead">
            Welcome to Auren! You're just one step away from automating your Amazon reimbursements.
          </p>
          
          <div class="button-container">
            <a href="${confirmationUrl}" class="button">Confirm Email Address &rarr;</a>
          </div>
          
          <div class="expiry-note">
            This confirmation link is secure and will expire in 24 hours.
          </div>

          <div class="fallback-link">
            <p>Button not working? Copy and paste this link:</p>
            <a href="${confirmationUrl}">${confirmationUrl}</a>
          </div>

        </div>
      </div>

      <div class="footer">
        <p class="footer-text">
          <span style="display:inline-block; vertical-align:middle; font-size:14px;">&#128274;</span> 
          Securely sent by Auren System
        </p>
        <p class="footer-text">
          &copy; 2024 Auren LLC • Yonkers, NY<br>
          <a href="#">Privacy Policy</a> &nbsp;|&nbsp; <a href="#">Terms of Service</a> &nbsp;|&nbsp; <a href="#">Help Center</a>
        </p>
      </div>
      
    </div>
  </div>
</body>
</html>
`;