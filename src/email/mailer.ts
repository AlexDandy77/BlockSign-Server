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
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px;">
                            <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Verify your email</h2>
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">Please use the verification code below to confirm your email address:</p>
                            
                            <!-- OTP Code Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <div style="display: inline-block; background-color: #f8f9fa; border: 2px solid #6266ea; border-radius: 10px; padding: 20px 40px;">
                                            <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #6266ea; font-family: 'Courier New', monospace;">${escapedCode}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b6b6b;">This code expires in <strong>10 minutes</strong>. If you didn't request this code, you can safely ignore this email.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 10px; font-size: 12px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 12px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
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
    const url = `${linkBase.replace(/\/$/, '')}/register/finish?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    const escapedUrl = escapeHtml(url);
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
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px;">
                            <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Finish your BlockSign registration</h2>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">Great news! Your registration request has been approved. Click the button below to finalize your account setup and complete your registration:</p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="${url}" style="display: inline-block; background-color: #6266ea; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">Finish Registration</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #6b6b6b;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="margin: 10px 0 0; font-size: 13px; line-height: 1.6; color: #6266ea; word-break: break-all; font-family: 'Courier New', monospace; background-color: #f8f9fa; padding: 12px; border-radius: 6px;">${escapedUrl}</p>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b6b6b;">This link expires in <strong>30 minutes</strong>. Please complete your registration before it expires.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 10px; font-size: 12px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 12px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
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
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px;">
                            <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">New Document to Review & Sign</h2>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">You have been added as a participant to review and sign a new document:</p>
                            
                            <!-- Document Info Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #6266ea; border-radius: 6px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 10px; font-size: 18px; font-weight: 600; color: #1a1a1a;">${escapedTitle}</p>
                                        <p style="margin: 0; font-size: 14px; color: #6b6b6b;">Please log in to your BlockSign account to review and sign this document.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #6b6b6b;"><strong>Important:</strong> Please verify that the document's SHA-256 hash matches the payload shown in the app before signing.</p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0 0;">
                                        <a href="${appUrl}" style="display: inline-block; background-color: #6266ea; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">View Document</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 10px; font-size: 12px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 12px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
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
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #6266ea; border-radius: 6px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #1a1a1a;">Blockchain Transaction</p>
                                        <p style="margin: 0 0 10px; font-size: 14px; color: #4a4a4a;">Your document has been anchored to the Polygon blockchain for permanent verification.</p>
                                        <p style="margin: 10px 0 0;">
                                            <a href="${blockchainInfo.explorerUrl}" style="color: #6266ea; text-decoration: none; font-size: 13px; font-family: 'Courier New', monospace; word-break: break-all;">${escapeHtml(blockchainInfo.txId)}</a>
                                        </p>
                                        <p style="margin: 10px 0 0;">
                                            <a href="${blockchainInfo.explorerUrl}" style="display: inline-block; color: #6266ea; text-decoration: none; font-size: 14px; font-weight: 600;">View on PolygonScan →</a>
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
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="display: inline-block; width: 64px; height: 64px; background-color: #10b981; border-radius: 50%; line-height: 64px; font-size: 32px; color: #ffffff;">✓</div>
                            </div>
                            
                            <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3; text-align: center;">All Parties Signed</h2>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a; text-align: center;">Your document has been fully signed by all required parties.</p>
                            
                            <!-- Document Info Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 6px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 10px; font-size: 18px; font-weight: 600; color: #1a1a1a;">${escapedTitle}</p>
                                        <p style="margin: 0; font-size: 14px; color: #166534;">Status: <strong>Fully Signed</strong></p>
                                    </td>
                                </tr>
                            </table>
                            ${blockchainSection}
                            
                            <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #6b6b6b;">You can verify this document at any time by uploading the PDF version in the app${verifyText}.</p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0 0;">
                                        <a href="${appUrl}" style="display: inline-block; background-color: #6266ea; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">View Document</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 10px; font-size: 12px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 12px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
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
    const rejecterSection = escapedRejecterName ? `<p style="margin: 10px 0 0; font-size: 14px; color: #4a4a4a;">Rejected by: <strong>${escapedRejecterName}</strong></p>` : '';
    const reasonSection = escapedReason ? `
                            <!-- Rejection Reason Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 6px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #1a1a1a;">Reason:</p>
                                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">${escapedReason}</p>
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
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #6266ea; letter-spacing: -0.5px;">BlockSign</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="display: inline-block; width: 64px; height: 64px; background-color: #ef4444; border-radius: 50%; line-height: 64px; font-size: 32px; color: #ffffff;">✕</div>
                            </div>
                            
                            <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3; text-align: center;">Document Rejected</h2>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a; text-align: center;">A document you were involved with has been rejected by a participant.</p>
                            
                            <!-- Document Info Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 10px; font-size: 18px; font-weight: 600; color: #1a1a1a;">${escapedTitle}</p>
                                        <p style="margin: 0 0 10px; font-size: 14px; color: #991b1b;">Status: <strong>Rejected</strong></p>
                                        ${rejecterSection}
                                    </td>
                                </tr>
                            </table>
                            ${reasonSection}
                            
                            <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #6b6b6b;">The document signing process has been cancelled. If you have any questions, please contact the document owner or our support team.</p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0 0;">
                                        <a href="${appUrl}" style="display: inline-block; background-color: #6266ea; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">View Details</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0 0 10px; font-size: 12px; color: #8b8b8b; line-height: 1.5;">This email was sent by BlockSign</p>
                            <p style="margin: 0; font-size: 12px; color: #8b8b8b;">If you have any questions, please contact our support team.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
