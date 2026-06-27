import { Resend } from 'resend'
import { BLURB, CONTACT_EMAIL } from '@/components/ui/landing/landing-content'

const CHROMIE_TAGLINE =
    'The deterministic stack for web agents. Intelligence and reliability on the live web.'

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
     * Send branded magic-link sign-in email
     * @param {string} email - Recipient email
     * @param {string} magicLinkUrl - Supabase action link
     * @returns {Promise<Object>} Email sending result
     */
    async sendMagicLinkEmail(email, magicLinkUrl) {
        if (!process.env.RESEND_API_KEY) {
            console.warn('RESEND_API_KEY not configured, skipping magic link email')
            return { success: false, error: 'Email service not configured' }
        }

        try {
            const payload = {
                from: this.from,
                to: [email],
                subject: 'Sign in to chromie.dev',
                html: this.generateMagicLinkEmailHTML(magicLinkUrl),
                text: this.generateMagicLinkEmailText(magicLinkUrl),
            }
            if (this.replyTo?.length) payload.replyTo = this.replyTo

            const { data, error } = await resend.emails.send(payload)

            if (error) {
                console.error('Failed to send magic link email:', error)
                return { success: false, error }
            }

            console.log('[email] magic link sent', email)
            return { success: true, data }
        } catch (error) {
            console.error('Error sending magic link email:', error)
            return { success: false, error: error.message }
        }
    }

    generateMagicLinkEmailHTML(magicLinkUrl) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chromie.dev'

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>Sign in to chromie.dev</title>
</head>
<body style="margin:0;padding:24px 16px;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fafafa;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto;">
        <tr>
            <td style="padding:28px 32px 20px;background-color:#141414;border:1px solid #27272a;border-radius:12px 12px 0 0;">
                <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                    chromie<span style="font-weight:400;color:#71717a;">.dev</span>
                </div>
                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#a1a1aa;">
                    ${CHROMIE_TAGLINE}
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding:28px 32px;background-color:#141414;border-left:1px solid #27272a;border-right:1px solid #27272a;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 28px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="border-radius:8px;background-color:#ffffff;">
                                        <a href="${magicLinkUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#0a0a0a;text-decoration:none;">
                                            Sign in to chromie
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#71717a;text-align:center;">
                    ${BLURB}
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;text-align:center;">
                    If the button does not work, copy and paste this link into your browser:<br>
                    <a href="${magicLinkUrl}" style="color:#d4d4d8;word-break:break-all;">${magicLinkUrl}</a>
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding:20px 32px 24px;background-color:#0a0a0a;border:1px solid #27272a;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#71717a;">
                    Did not request this email? You can safely ignore it.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
                    <a href="${appUrl}" style="color:#ffffff;text-decoration:none;">chromie.dev</a>
                    ·
                    <a href="mailto:${CONTACT_EMAIL}" style="color:#a1a1aa;text-decoration:none;">${CONTACT_EMAIL}</a>
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim()
    }

    generateMagicLinkEmailText(magicLinkUrl) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chromie.dev'

        return `
Sign in to chromie.dev

${CHROMIE_TAGLINE}

Use this secure link to sign in to your chromie account:

${magicLinkUrl}

This link expires soon and can only be used once.

${BLURB}

If you did not request this email, you can safely ignore it.

${appUrl}
${CONTACT_EMAIL}
        `.trim()
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
                welcome to chromie! this is ${senderName}, one of the founders. i'm excited you've joined our community of teams running reliable browser automations with ai.
            </p>
            
            <p class="intro-text">
                chromie helps you schedule, inspect, and improve browser workflows without stitching together brittle scripts. whether you're monitoring opportunities, extracting data, or operating repeated web tasks, chromie has you covered.
            </p>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-title">⚡ productivity tools</div>
                    <div class="feature-desc">automate repetitive tasks and streamline your workflow with intelligent automation</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">📊 data collection</div>
                    <div class="feature-desc">scrape and organize web data effortlessly with powerful extraction tools</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">🧭 gov opportunity monitoring</div>
                    <div class="feature-desc">track and review relevant contract opportunities from your contractor profile</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">🔁 workflow runs</div>
                    <div class="feature-desc">review execution history, replays, and run status from one hub</div>
                </div>
            </div>
            
            <p class="intro-text">
                we'd love to hear what you're planning to build! feel free to reach out if you have any questions or need help getting started.
            </p>
            
            <p class="intro-text">
                best,<br>${senderName}
            </p>
            
            <div class="cta-section">
                <p class="cta-text">ready to run your first automation?</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chromie.dev'}" class="cta-button">
                    open chromie →
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
chromie - reliable browser automations

hey ${firstName}! 👋

welcome to chromie! this is ${senderName}, one of the founders. i'm excited you've joined our community of teams running reliable browser automations with ai.

chromie helps you schedule, inspect, and improve browser workflows without stitching together brittle scripts. whether you're monitoring opportunities, extracting data, or operating repeated web tasks, chromie has you covered.

⚡ what you can build with chromie:

• productivity tools - automate repetitive tasks and streamline your workflow with intelligent automation
• data collection - scrape and organize web data effortlessly with powerful extraction tools
• gov opportunity monitoring - track and review relevant contract opportunities from your contractor profile
• workflow runs - review execution history, replays, and run status from one hub

we'd love to hear what you're planning to build! feel free to reach out if you have any questions or need help getting started.

best,
${senderName}

ready to run your first automation? visit: https://chromie.dev

p.s. reply to this email with feedback and we'll send you free credits!

---
you're receiving this email because you signed up for chromie.
chromie • building the future of browser automation

unsubscribe: https://chromie.dev/unsubscribe?email=${encodeURIComponent(user.email)}
    `
    }
}

export default new EmailService()
