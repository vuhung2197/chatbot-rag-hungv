// routes/email.js
import { google } from 'googleapis';
import { loadTokens } from '../helpers/tokenStore.js';

async function listSubscriptions(storedTokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials(storedTokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const { data: list } = await gmail.users.messages.list({
    userId: 'me',
    q: 'category:promotions',
    maxResults: 10
  });

  const senders = {};
  for (const m of list.messages ?? []) {
    const { data: msg } = await gmail.users.messages.get({
      userId: 'me',
      id: m.id,
      format: 'metadata',
      metadataHeaders: ['From', 'List-Unsubscribe', 'Subject', 'Date']
    });

    const headers = Object.fromEntries(
      (msg.payload.headers || []).map(h => [h.name, h.value])
    );
    const senderEmail = /<(.+?)>/.exec(headers.From)?.[1] || headers.From;

    if (!senders[senderEmail]) {
      senders[senderEmail] = {
        display: headers.From.replace(/<.+>/, '').trim(),
        count: 0,
        lu: headers['List-Unsubscribe'] || ''
      };
    }
    senders[senderEmail].count += 1;
  }
  return Object.entries(senders).map(([email, info]) => ({
    sender: email,
    displayName: info.display,
    emailsFound: info.count,
    unsubscribe: info.lu
  }));
}

export async function getEmail(req, res) {
  const email = req.session.userEmail || req.query.email;
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