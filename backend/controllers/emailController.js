import { google } from 'googleapis';
import {
  loadTokens,
  checkTokenExpiry,
  refreshAccessToken,
} from '../helpers/tokenStore.js';
import axios from 'axios';

// Helper function to ensure we have a valid access token
async function ensureValidToken(userEmail) {
  try {
    // Check token expiry status first
    const expiryCheck = await checkTokenExpiry(userEmail);

    if (expiryCheck.needsRefresh) {
      console.log(
        `🔄 Token refresh needed for ${userEmail}: ${expiryCheck.reason}`
      );
      return await refreshAccessToken(userEmail);
    }

    // Load existing valid token
    return await loadTokens(userEmail);
  } catch (error) {
    console.error(
      `❌ Token validation failed for ${userEmail}:`,
      error.message
    );
    throw new Error(`Token validation failed: ${error.message}`);
  }
}

async function listSubscriptions(storedTokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials(storedTokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const { data: list } = await gmail.users.messages.list({
    userId: 'me',
    q: 'in:inbox',
    maxResults: 30,
  });

  const results = [];
  for (const m of list.messages ?? []) {
    const { data: msg } = await gmail.users.messages.get({
      userId: 'me',
      id: m.id,
      format: 'full',
    });

    const headersArray = msg.payload.headers || [];
    const headers = Object.fromEntries(
      headersArray.map((h) => [h.name, h.value])
    );

    const unsubscribeHeader = headers['List-Unsubscribe'];
    if (!unsubscribeHeader) continue;

    const body = extractBodyFromPayload(msg.payload);

    results.push({
      id: m.id,
      from: headers.From || '',
      subject: headers.Subject || '',
      date: headers.Date || '',
      unsubscribe: unsubscribeHeader,
      body: body || '[Không tìm thấy nội dung]',
    });
  }

  return results;
}

function extractBodyFromPayload(payload) {
  if (!payload) return '';

  // 1. Nếu nội dung trực tiếp ở phần body
  if (payload.body && payload.body.data) {
    return decodeBase64(payload.body.data);
  }

  // 2. Nếu có nhiều phần con (multipart)
  if (payload.parts && payload.parts.length) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
  }

  return '';
}

function decodeBase64(b64) {
  return Buffer.from(b64, 'base64').toString('utf8');
}

export async function getEmail(req, res) {
  const email = 'hung97vu@gmail.com'; // TODO: Get from authenticated user
  if (!email) return res.status(400).json({ error: 'Missing user email' });

  try {
    // Ensure we have a valid token (with automatic refresh if needed)
    const validTokens = await ensureValidToken(email);
    if (!validTokens) {
      return res.status(401).json({ error: 'User has not connected Gmail' });
    }

    const subs = await listSubscriptions(validTokens);
    res.json({
      data: subs,
      tokenInfo: {
        expiresAt: validTokens.expires_at,
        timeUntilExpiry: Math.floor(
          (validTokens.expires_at - Date.now()) / 1000
        ),
      },
    });
  } catch (err) {
    console.error('❌ getEmail error:', err);

    // Handle specific token errors
    if (err.message.includes('Token') || err.message.includes('refresh')) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Please reconnect your Gmail account',
        details: err.message,
      });
    }

    res.status(500).json({ error: err.message });
  }
}

function isValidUnsubscribeUrl(url) {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0'];

    if (!allowedProtocols.includes(parsed.protocol)) return false;
    if (blockedDomains.some((domain) => parsed.hostname.includes(domain)))
      return false;

    return true;
  } catch {
    return false;
  }
}

async function processUnsubscribeUrl(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      return {
        success: response.status < 400,
        status: response.status,
        attempt,
      };
    } catch (error) {
      if (attempt === retries) {
        return {
          success: false,
          error: error.message,
          attempt,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function sendUnsubscribeEmail(gmail, mailtoLink, fromEmail) {
  try {
    const emailAddress = mailtoLink.replace('mailto:', '').split('?')[0];
    const subject = 'Unsubscribe Request';
    const body = `Please unsubscribe ${fromEmail} from your mailing list.`;

    const message = [
      `To: ${emailAddress}`,
      `Subject: ${subject}`,
      '',
      body,
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function unsubscribeSelected(req, res) {
  const { emails, userEmail } = req.body;

  if (!Array.isArray(emails)) {
    return res.status(400).json({ message: 'emails phải là mảng.' });
  }

  if (!userEmail) {
    return res.status(400).json({ message: 'userEmail là bắt buộc.' });
  }

  const results = [];

  try {
    // Ensure we have a valid token (with automatic refresh if needed)
    const validTokens = await ensureValidToken(userEmail);
    if (!validTokens) {
      return res
        .status(401)
        .json({ message: 'Không tìm thấy tokens cho user.' });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(validTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    for (const msgId of emails) {
      try {
        const { data: msg } = await gmail.users.messages.get({
          userId: 'me',
          id: msgId,
          format: 'metadata',
          metadataHeaders: ['List-Unsubscribe', 'From'],
        });

        const headers = Object.fromEntries(
          (msg.payload.headers || []).map((h) => [
            h.name.toLowerCase(),
            h.value,
          ])
        );

        const unsubscribeHeader = headers['list-unsubscribe'];
        const fromEmail = headers.from || '';

        if (!unsubscribeHeader) {
          results.push({
            messageId: msgId,
            success: false,
            reason: 'Không có List-Unsubscribe header',
          });
          continue;
        }

        const links = unsubscribeHeader
          .split(',')
          .map((s) => s.trim().replace(/[<>]/g, ''));

        const httpLink = links.find((l) => l.startsWith('http'));
        const mailtoLink = links.find((l) => l.startsWith('mailto:'));

        let result = {
          messageId: msgId,
          from: fromEmail,
          success: false,
        };

        if (httpLink && isValidUnsubscribeUrl(httpLink)) {
          const urlResult = await processUnsubscribeUrl(httpLink);
          result = {
            ...result,
            success: urlResult.success,
            method: 'HTTP',
            url: httpLink,
            status: urlResult.status,
            attempts: urlResult.attempt,
            error: urlResult.error,
          };
        } else if (mailtoLink) {
          const emailResult = await sendUnsubscribeEmail(
            gmail,
            mailtoLink,
            userEmail
          );
          result = {
            ...result,
            success: emailResult.success,
            method: 'EMAIL',
            mailto: mailtoLink,
            error: emailResult.error,
          };
        } else {
          result.reason = 'Không có URL hợp lệ để hủy đăng ký';
        }

        results.push(result);
      } catch (error) {
        results.push({
          messageId: msgId,
          success: false,
          error: error.message,
          reason: 'Lỗi khi xử lý email',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    res.json({
      message: `Đã xử lý ${successCount}/${totalCount} yêu cầu hủy đăng ký`,
      results,
      summary: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount,
      },
    });
  } catch (err) {
    console.error('❌ Lỗi khi hủy đăng ký:', err);

    // Handle specific token errors
    if (err.message.includes('Token') || err.message.includes('refresh')) {
      return res.status(401).json({
        message: 'Authentication failed',
        error: 'Please reconnect your Gmail account',
        details: err.message,
        results,
      });
    }

    res.status(500).json({
      message: 'Hủy đăng ký thất bại',
      error: err.message,
      results,
    });
  }
}

// New endpoint to check token status
export async function checkTokenStatus(req, res) {
  const userEmail = req.query.email || 'hung97vu@gmail.com'; // TODO: Get from auth

  try {
    const expiryCheck = await checkTokenExpiry(userEmail);

    res.json({
      email: userEmail,
      tokenStatus: expiryCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
