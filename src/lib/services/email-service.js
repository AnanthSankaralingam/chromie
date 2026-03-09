import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export class EmailService {
    constructor() {
        const fromRaw = process.env.RESEND_FROM_EMAIL || 'Chromie <welcome@chromie.dev>'
        this.fromParts = fromRaw.includes('|') ? fromRaw.split('|').map((s) => s.trim()).filter(Boolean) : [fromRaw]
        this.from = this.fromParts[0]
        // Reply-To: comma-separated so replies go to both founders. Falls back to extracting emails from From if not set
        this.replyTo = process.env.RESEND_REPLY_TO_EMAIL
            ? process.env.RESEND_REPLY_TO_EMAIL.split(',').map((e) => e.trim()).filter(Boolean)
            : this.fromParts.length > 1
                ? this.fromParts.map((p) => p.match(/<([^>]+)>/)?.[1] || p).filter(Boolean)
                : null
    }

    /**
     * Send welcome email to new user
     * @param {Object} user - User object with email, name, etc.
     * @returns {Promise<Object>} Email sending result
     */
    async sendWelcomeEmail(user) {
        if (!process.env.RESEND_API_KEY) {
            console.warn('RESEND_API_KEY not configured, skipping welcome email')
            return { success: false, error: 'Email service not configured' }
        }

        try {
            const from = this.fromParts.length > 1
                ? this.fromParts[Math.floor(Math.random() * this.fromParts.length)]
                : this.from
            const senderName = (from.match(/^([^<]+)</)?.[1]?.trim() || 'chromie').toLowerCase()
            const payload = {
                from,
                to: [user.email],
                subject: 'welcome to chromie! 🎉',
                html: this.generateWelcomeEmailHTML(user, senderName),
                text: this.generateWelcomeEmailText(user, senderName)
            }
            if (this.replyTo?.length) payload.replyTo = this.replyTo
            const { data, error } = await resend.emails.send(payload)

            if (error) {
                console.error('Failed to send welcome email:', error)
                return { success: false, error }
            }

            console.log('Welcome email sent successfully:', data)
            return { success: true, data }
        } catch (error) {
            console.error('Error sending welcome email:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Generate HTML version of welcome email
     * @param {Object} user - User object
     * @returns {string} HTML email content
     */
    generateWelcomeEmailHTML(user, senderName = 'chromie') {
        const userName = user.name || user.user_metadata?.full_name || user.user_metadata?.name || 'there'
        const firstName = userName.split(' ')[0] || 'there'

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>welcome to chromie!</title>
    <style>
        :root { color-scheme: light dark; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            min-height: 100vh;
            padding: 20px;
        }
        
        .email-wrapper {
            max-width: 700px;
            margin: 0 auto;
            background: #ffffff !important;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
        }
        
        .hero-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 60px 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .hero-section::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .logo {
            font-size: 48px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 16px;
            position: relative;
            z-index: 2;
            text-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            font-weight: 400;
            position: relative;
            z-index: 2;
        }
        
        .content {
            padding: 50px 40px;
        }
        
        .greeting {
            font-size: 32px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 24px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .intro-text {
            font-size: 18px;
            color: #4a5568;
            margin-bottom: 32px;
            line-height: 1.7;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 40px 0;
        }
        
        .feature-card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 24px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
        }
        
        .feature-icon {
            font-size: 24px;
            margin-bottom: 12px;
            display: block;
        }
        
        .feature-title {
            font-size: 18px;
            font-weight: 600;
            color: #e2e8f0;
            margin-bottom: 8px;
        }
        
        .feature-desc {
            color: #94a3b8;
            font-size: 15px;
            line-height: 1.6;
        }
        
        .cta-section {
            text-align: center;
            margin: 50px 0;
            padding: 40px;
            background: #1e293b;
            border-radius: 20px;
            border: 1px solid #334155;
        }
        
        .cta-text {
            font-size: 20px;
            font-weight: 500;
            color: #e2e8f0;
            margin-bottom: 24px;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .cta-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }
        
        .cta-button:hover::before {
            left: 100%;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
        }
        
        .ps-note {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            list-style: none;
        }
        
        .ps-note p {
            margin: 0;
            color: #c53030;
        }
        
        .ps-note strong {
            color: #c53030;
        }
        
        .footer {
            background: #1a202c;
            color: #a0aec0;
            padding: 40px;
            text-align: center;
            font-size: 14px;
        }
        
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        .footer-brand {
            color: #ffffff;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        @media (max-width: 700px) {
            .email-wrapper {
                margin: 10px;
                border-radius: 16px;
            }
            
            .hero-section, .content {
                padding: 30px 20px;
            }
            
            .logo {
                font-size: 36px;
            }
            
            .greeting {
                font-size: 28px;
            }
            
            .cta-section {
                padding: 30px 20px;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
            }
        }
        
        @media (prefers-color-scheme: light) {
            .feature-card {
                background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%) !important;
                border-color: #e2e8f0 !important;
            }
            .feature-title { color: #2d3748 !important; }
            .feature-desc { color: #718096 !important; }
            .cta-section {
                background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%) !important;
                border-color: #e2e8f0 !important;
            }
            .cta-text { color: #2d3748 !important; }
        }
        
        @media (prefers-color-scheme: dark) {
            body {
                background: #1a1a2e !important;
            }
            
            .hero-section {
                background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%) !important;
            }
            
            .logo, .subtitle {
                color: #ffffff !important;
            }
            
            .email-wrapper {
                background: #0f172a !important;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5) !important;
            }
            
            .content {
                background: #0f172a !important;
            }
            
            .greeting {
                color: #a5b4fc !important;
                -webkit-text-fill-color: #a5b4fc !important;
                background: none !important;
                background-clip: unset !important;
            }
            
            .intro-text {
                color: #94a3b8 !important;
            }
            
            .feature-card {
                background: #1e293b !important;
                border-color: #334155 !important;
            }
            
            .feature-card::before {
                background: linear-gradient(90deg, #6366f1, #8b5cf6) !important;
            }
            
            .feature-title {
                color: #e2e8f0 !important;
            }
            
            .feature-desc {
                color: #94a3b8 !important;
            }
            
            .cta-section {
                background: #1e293b !important;
                border-color: #334155 !important;
            }
            
            .cta-text {
                color: #e2e8f0 !important;
            }
            
            .ps-note {
                background: #450a0a !important;
                border-color: #7f1d1d !important;
            }
            
            .ps-note p {
                color: #fca5a5 !important;
            }
            
            .ps-note strong {
                color: #fecaca !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="hero-section">
            <div class="logo">chromie</div>
            <div class="subtitle">next gen web browsing</div>
        </div>
        
        <div class="content">
            <h1 class="greeting">hey ${firstName}! 👋</h1>
            
            <p class="intro-text">
                welcome to chromie! this is ${senderName}, one of the founders. i'm excited you've joined our community of developers building amazing chrome extensions with ai.
            </p>
            
            <p class="intro-text">
                chromie makes it effortless to create powerful chrome extensions without writing a single line of code. whether you're looking to automate tasks, integrate with your favorite tools, or build productivity solutions, chromie has you covered.
            </p>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-title">⚡ productivity tools</div>
                    <div class="feature-desc">automate repetitive tasks and streamline your workflow with intelligent automation</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">🔗 google workspace integration</div>
                    <div class="feature-desc">connect seamlessly with gmail, drive, calendar, and all your favorite google services</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">📊 data collection</div>
                    <div class="feature-desc">scrape and organize web data effortlessly with powerful extraction tools</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">🎨 custom dashboards</div>
                    <div class="feature-desc">build personalized browser experiences tailored to your specific needs</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">🔌 api integrations</div>
                    <div class="feature-desc">connect with any service or tool you use through our extensive api library</div>
                </div>
            </div>
            
            <p class="intro-text">
                we'd love to hear what you're planning to build! feel free to reach out if you have any questions or need help getting started.
            </p>
            
            <p class="intro-text">
                best,<br>${senderName}
            </p>
            
            <div class="cta-section">
                <p class="cta-text">ready to build your first extension?</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chromie.dev'}" class="cta-button">
                    start building →
                </a>
            </div>
            
            <div class="ps-note">
                <p><strong>p.s.</strong> reply to this email with feedback and we'll send you free credits!</p>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-brand">chromie</div>
            <p>building the future of browser automation</p>
            <p style="margin-top: 16px;">
                you're receiving this email because you signed up for chromie.<br>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chromie.dev'}/unsubscribe?email=${encodeURIComponent(user.email)}">unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
    `
    }

    /**
     * Generate text version of welcome email
     * @param {Object} user - User object
     * @returns {string} Text email content
     */
    generateWelcomeEmailText(user, senderName = 'chromie') {
        const userName = user.name || user.user_metadata?.full_name || user.user_metadata?.name || 'there'
        const firstName = userName.split(' ')[0] || 'there'

        return `
chromie - chrome extensions in seconds

hey ${firstName}! 👋

welcome to chromie! this is ${senderName}, one of the founders. i'm excited you've joined our community of developers building amazing chrome extensions with ai.

chromie makes it effortless to create powerful chrome extensions without writing a single line of code. whether you're looking to automate tasks, integrate with your favorite tools, or build productivity solutions, chromie has you covered.

⚡ what you can build with chromie:

• productivity tools - automate repetitive tasks and streamline your workflow with intelligent automation
• google workspace integration - connect seamlessly with gmail, drive, calendar, and all your favorite google services  
• data collection - scrape and organize web data effortlessly with powerful extraction tools
• custom dashboards - build personalized browser experiences tailored to your specific needs
• api integrations - connect with any service or tool you use 

we'd love to hear what you're planning to build! feel free to reach out if you have any questions or need help getting started.

best,
${senderName}

ready to build your first extension? visit: https://chromie.dev

p.s. reply to this email with feedback and we'll send you free credits!

---
you're receiving this email because you signed up for chromie.
chromie • building the future of browser automation

unsubscribe: https://chromie.dev/unsubscribe?email=${encodeURIComponent(user.email)}
    `
    }
}

export default new EmailService()
