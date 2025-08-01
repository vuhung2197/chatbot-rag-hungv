import { google } from 'googleapis';
import { loadTokens } from '../helpers/tokenStore.js';
import axios from 'axios';

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
    maxResults: 30
  });

  const results = [];
  for (const m of list.messages ?? []) {
    const { data: msg } = await gmail.users.messages.get({
      userId: 'me',
      id: m.id,
      format: 'full'
    });

    const headersArray = msg.payload.headers || [];
    const headers = Object.fromEntries(headersArray.map(h => [h.name, h.value]));

    const unsubscribeHeader = headers['List-Unsubscribe'];
    if (!unsubscribeHeader) continue;

    const body = extractBodyFromPayload(msg.payload);

    results.push({
      id: m.id,
      from: headers.From || '',
      subject: headers.Subject || '',
      date: headers.Date || '',
      unsubscribe: unsubscribeHeader,
      body: body || '[Không tìm thấy nội dung]'
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
  const email = 'hung97vu@gmail.com';
  if (!email) return res.status(400).json({ error: 'Missing user email' });

  const storedTokens = await loadTokens(email);
  if (!storedTokens) {
    return res.status(401).json({ error: 'User has not connected Gmail' });
  }

  try {
    const subs = await listSubscriptions(storedTokens);
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function unsubscribeSelected(req, res) {
  const userEmail = 'hung97vu@gmail.com';
  const { emails } = req.body;
  if (!Array.isArray(emails)) return res.status(400).json({ message: 'emails phải là mảng.' });

  try {
    const tokens = await loadTokens(userEmail);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    for (const msgId of emails) {
      const { data: msg } = await gmail.users.messages.get({
        userId: 'me',
        id: msgId,
        format: 'metadata',
        metadataHeaders: ['List-Unsubscribe']
      });

      const headers = Object.fromEntries((msg.payload.headers || []).map(h => [h.name.toLowerCase(), h.value]));
      const lu = headers['list-unsubscribe'];
      if (!lu) continue;

      const links = lu.split(',').map(s => s.trim().replace(/[<>]/g, ''));
      const httpLink = links.find(l => l.startsWith('http'));
      const mailtoLink = links.find(l => l.startsWith('mailto:'));

      if (httpLink) {
        await axios.get(httpLink);
      } else if (mailtoLink) {
        console.log(`📩 Gửi email tới ${mailtoLink}`);
        // Optional: Gửi email hủy đăng ký bằng Gmail API nếu cần
      }
    }

    res.json({ message: '✅ Đã xử lý hủy đăng ký' });
  } catch (err) {
    console.error('❌ Lỗi khi hủy:', err);
    res.status(500).json({ message: 'Hủy đăng ký thất bại' });
  }
}