import nodemailer from 'nodemailer';

const {
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
    console.warn('[mailer] SMTP env vars not fully set; emails may fail in dev.');
}

export const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
});

export async function sendEmail(to: string, subject: string, html: string, extra?: Partial<nodemailer.SendMailOptions>) {
    const info = await transporter.sendMail({
        from: MAIL_FROM || `BlockSign <${SMTP_USER}>`,
        to,
        subject,
        html,
        ...extra
    });
    console.log('[mailer] sent:', info.messageId);
}

function escapeHtml(input: string) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

export function otpTemplate(code: string) {
    const escapedCode = escapeHtml(code);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - BlockSign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 30px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px;">
                            <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 600; color: #1a1a1a; line-height: 1.3; text-align: center;">Verify your email</h2>
                            <p style="margin: 0 0 40px; font-size: 20px; line-height: 1.6; color: #4a4a4a; text-align: center;">Please use the verification code below to confirm your email address:</p>
                            
                            <!-- OTP Code Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <div style="display: inline-block; background-color: #f8f9fa; border: 2px solid #6266ea; border-radius: 10px; padding: 24px 48px;">
                                            <p style="margin: 0; font-size: 48px; font-weight: 700; letter-spacing: 12px; color: #6266ea; font-family: 'Courier New', monospace;">${escapedCode}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 40px 0 0; font-size: 18px; line-height: 1.6; color: #6b6b6b; text-align: center;">This code expires in <strong>10 minutes</strong>. If you didn't request this code, you can safely ignore this email.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 12px; font-size: 14px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 14px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function finalizeTemplate(email: string, token: string, linkBase: string) {
    const webUrl = `${linkBase.replace(/\/$/, '')}/register/finish?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    const mobileUrl = `blocksign://complete-registration?token=${encodeURIComponent(token)}`;
    const escapedWebUrl = escapeHtml(webUrl);
    const escapedMobileUrl = escapeHtml(mobileUrl);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Finish Your Registration - BlockSign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 30px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px;">
                            <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 600; color: #1a1a1a; line-height: 1.3; text-align: center;">Finish your BlockSign registration</h2>
                            <p style="margin: 0 0 32px; font-size: 20px; line-height: 1.6; color: #4a4a4a; text-align: center;">Great news! Your registration request has been approved. Click the button below to finalize your account setup and complete your registration:</p>
                            
                            <!-- Mobile App CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0 10px;">
                                        <a href="${mobileUrl}" style="display: inline-block; background-color: #6266ea; color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 10px; font-size: 20px; font-weight: 600; letter-spacing: 0.3px;">Open in BlockSign App</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 16px 0; font-size: 16px; line-height: 1.6; color: #8b8b8b; text-align: center;">— or —</p>
                            
                            <!-- Web Fallback Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 10px 0 20px;">
                                        <a href="${webUrl}" style="display: inline-block; background-color: #ffffff; color: #6266ea; text-decoration: none; padding: 16px 36px; border-radius: 10px; font-size: 18px; font-weight: 600; letter-spacing: 0.3px; border: 2px solid #6266ea;">Continue on Web</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 32px 0 0; font-size: 18px; line-height: 1.6; color: #6b6b6b; text-align: center;">If the buttons don't work, copy and paste either of those links:</p>
                            <p style="margin: 16px 0 0; font-size: 14px; line-height: 1.4; color: #8b8b8b; text-align: center;">Mobile App:</p>
                            <p style="margin: 8px 0 0; font-size: 16px; line-height: 1.6; color: #6266ea; word-break: break-all; font-family: 'Courier New', monospace; background-color: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center;">${escapedMobileUrl}</p>
                            <p style="margin: 16px 0 0; font-size: 14px; line-height: 1.4; color: #8b8b8b; text-align: center;">Web Browser:</p>
                            <p style="margin: 8px 0 0; font-size: 16px; line-height: 1.6; color: #6266ea; word-break: break-all; font-family: 'Courier New', monospace; background-color: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center;">${escapedWebUrl}</p>
                            
                            <p style="margin: 40px 0 0; font-size: 18px; line-height: 1.6; color: #6b6b6b; text-align: center;">This link expires in <strong>30 minutes</strong>. Please complete your registration before it expires.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 12px; font-size: 14px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 14px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function documentReviewSignTemplate(documentTitle: string, appUrl: string) {
    const escapedTitle = escapeHtml(documentTitle);
    const escapedAppUrl = escapeHtml(appUrl);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document to Review & Sign - BlockSign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 30px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px;">
                            <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 600; color: #1a1a1a; line-height: 1.3; text-align: center;">New Document to Review & Sign</h2>
                            <p style="margin: 0 0 32px; font-size: 20px; line-height: 1.6; color: #4a4a4a; text-align: center;">You have been added as a participant to review and sign a new document:</p>
                            
                            <!-- Document Info Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #6266ea; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 12px; font-size: 24px; font-weight: 600; color: #1a1a1a;">${escapedTitle}</p>
                                        <p style="margin: 0; font-size: 18px; color: #6b6b6b;">Please log in to your BlockSign account to review and sign this document.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 32px 0; font-size: 18px; line-height: 1.6; color: #6b6b6b; text-align: center;"><strong>Important:</strong> Please verify that the document's SHA-256 hash matches the payload shown in the app before signing.</p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0 0;">
                                        <a href="${escapedAppUrl}" style="display: inline-block; background-color: #6266ea; color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 10px; font-size: 20px; font-weight: 600; letter-spacing: 0.3px;">View Document</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 12px; font-size: 14px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 14px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function documentSignedTemplate(documentTitle: string, appUrl: string, blockchainInfo?: { txId: string; explorerUrl: string }) {
    const escapedTitle = escapeHtml(documentTitle);
    const escapedAppUrl = escapeHtml(appUrl);
    const hasBlockchain = blockchainInfo && blockchainInfo.txId && blockchainInfo.explorerUrl;
    const blockchainSection = hasBlockchain ? `
                            <!-- Blockchain Info Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #6266ea; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 12px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Blockchain Transaction</p>
                                        <p style="margin: 0 0 16px; font-size: 18px; color: #4a4a4a;">Your document has been anchored to the Polygon blockchain for permanent verification.</p>
                                        <p style="margin: 16px 0 0;">
                                            <a href="${blockchainInfo.explorerUrl}" style="color: #6266ea; text-decoration: none; font-size: 16px; font-family: 'Courier New', monospace; word-break: break-all;">${escapeHtml(blockchainInfo.txId)}</a>
                                        </p>
                                        <p style="margin: 16px 0 0;">
                                            <a href="${blockchainInfo.explorerUrl}" style="display: inline-block; color: #6266ea; text-decoration: none; font-size: 18px; font-weight: 600;">View on PolygonScan →</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>` : '';
    const verifyText = hasBlockchain ? ' or viewing the transaction on PolygonScan' : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Fully Signed - BlockSign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 30px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px;">
                            <div style="text-align: center; margin-bottom: 40px;">
                                <div style="display: inline-block; width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; line-height: 80px; font-size: 40px; color: #ffffff;">✓</div>
                            </div>
                            
                            <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 600; color: #1a1a1a; line-height: 1.3; text-align: center;">All Parties Signed</h2>
                            <p style="margin: 0 0 32px; font-size: 20px; line-height: 1.6; color: #4a4a4a; text-align: center;">Your document has been fully signed by all required parties.</p>
                            
                            <!-- Document Info Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 12px; font-size: 24px; font-weight: 600; color: #1a1a1a;">${escapedTitle}</p>
                                        <p style="margin: 0; font-size: 18px; color: #166534;">Status: <strong>Fully Signed</strong></p>
                                    </td>
                                </tr>
                            </table>
                            ${blockchainSection}
                            
                            <p style="margin: 32px 0 0; font-size: 18px; line-height: 1.6; color: #6b6b6b; text-align: center;">You can verify this document at any time by uploading the PDF version in the app${verifyText}.</p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0 0;">
                                        <a href="${escapedAppUrl}" style="display: inline-block; background-color: #6266ea; color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 10px; font-size: 20px; font-weight: 600; letter-spacing: 0.3px;">View Document</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 12px; font-size: 14px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 14px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function documentRejectedTemplate(documentTitle: string, appUrl: string, rejecterName?: string, rejectionReason?: string) {
    const escapedTitle = escapeHtml(documentTitle);
    const escapedAppUrl = escapeHtml(appUrl);
    const escapedRejecterName = rejecterName ? escapeHtml(rejecterName) : '';
    const escapedReason = rejectionReason ? escapeHtml(rejectionReason) : '';
    const rejecterSection = escapedRejecterName ? `<p style="margin: 16px 0 0; font-size: 18px; color: #4a4a4a;">Rejected by: <strong>${escapedRejecterName}</strong></p>` : '';
    const reasonSection = escapedReason ? `
                            <!-- Rejection Reason Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #1a1a1a;">Reason:</p>
                                        <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #4a4a4a;">${escapedReason}</p>
                                    </td>
                                </tr>
                            </table>` : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Rejected - BlockSign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 30px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px;">
                            <div style="text-align: center; margin-bottom: 40px;">
                                <div style="display: inline-block; width: 80px; height: 80px; background-color: #ef4444; border-radius: 50%; line-height: 80px; font-size: 40px; color: #ffffff;">✕</div>
                            </div>
                            
                            <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 600; color: #1a1a1a; line-height: 1.3; text-align: center;">Document Rejected</h2>
                            <p style="margin: 0 0 32px; font-size: 20px; line-height: 1.6; color: #4a4a4a; text-align: center;">A document you were involved with has been rejected by a participant.</p>
                            
                            <!-- Document Info Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 12px; font-size: 24px; font-weight: 600; color: #1a1a1a;">${escapedTitle}</p>
                                        <p style="margin: 0 0 0; font-size: 18px; color: #991b1b;">Status: <strong>Rejected</strong></p>
                                        ${rejecterSection}
                                    </td>
                                </tr>
                            </table>
                            ${reasonSection}
                            
                            <p style="margin: 32px 0 0; font-size: 18px; line-height: 1.6; color: #6b6b6b; text-align: center;">The document signing process has been cancelled. If you have any questions, please contact the document owner or our support team.</p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0 0;">
                                        <a href="${escapedAppUrl}" style="display: inline-block; background-color: #6266ea; color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 10px; font-size: 20px; font-weight: 600; letter-spacing: 0.3px;">View Details</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 12px; font-size: 14px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 14px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function adminNotificationTemplate(pendingCount: number) {
    const escapedCount = escapeHtml(pendingCount.toString());
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Registration Request - BlockSign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 30px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px;">
                            <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 600; color: #1a1a1a; line-height: 1.3; text-align: center;">New User Registration Request</h2>
                            <p style="margin: 0 0 32px; font-size: 20px; line-height: 1.6; color: #4a4a4a; text-align: center;">A new user has registered and is awaiting your approval.</p>
                            
                            <!-- Info Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #6266ea; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0; font-size: 20px; line-height: 1.6; color: #4a4a4a;">There are currently <strong>${escapedCount}</strong> pending request${pendingCount !== 1 ? 's' : ''} awaiting admin decision.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 32px 0 0; font-size: 18px; line-height: 1.6; color: #6b6b6b; text-align: center;">Please log in to the admin panel to review and approve or decline the registration request.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 12px; font-size: 14px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 14px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function registrationDeclinedTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Request Declined - BlockSign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 30px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px;">
                            <div style="text-align: center; margin-bottom: 40px;">
                                <div style="display: inline-block; width: 80px; height: 80px; background-color: #ef4444; border-radius: 50%; line-height: 80px; font-size: 40px; color: #ffffff;">✕</div>
                            </div>
                            
                            <h2 style="margin: 0 0 24px; font-size: 32px; font-weight: 600; color: #1a1a1a; line-height: 1.3; text-align: center;">Registration Request Declined</h2>
                            <p style="margin: 0 0 32px; font-size: 20px; line-height: 1.6; color: #4a4a4a; text-align: center;">We regret to inform you that your registration request has been declined by the administrator.</p>
                            
                            <!-- Info Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #4a4a4a;">If you believe this was an error or have any questions, please contact our support team for assistance.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 32px 0 0; font-size: 18px; line-height: 1.6; color: #6b6b6b; text-align: center;">Thank you for your interest in BlockSign.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 12px; font-size: 14px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 14px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
