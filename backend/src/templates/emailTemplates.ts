export const getEmailHtml = (subject: string, message: string) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; color: #333; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 40px; line-height: 1.6; }
        .content p { margin-bottom: 20px; font-size: 16px; color: #4b5563; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #f9fafb; border-top: 1px solid #f3f4f6; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI Finance Advisor</h1>
        </div>
        <div class="content">
            <h2 style="color: #111827; margin-top: 0;">${subject}</h2>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <a href="http://localhost:5173" class="btn">View Dashboard</a>
        </div>
        <div class="footer">
            &copy; 2026 AI Finance Advisor. All rights reserved.
        </div>
    </div>
</body>
</html>
`;
`,Description:
