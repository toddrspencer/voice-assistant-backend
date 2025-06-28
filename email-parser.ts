import { simpleParser } from 'mailparser';
import * as dotenv from 'dotenv';
dotenv.config();

type ImapSimple = import('imap-simple').ImapSimple;
type Message = import('imap-simple').Message;
type ImapSimpleOptions = import('imap-simple').ImapSimpleOptions;

// Dynamic import for imap-simple (compatible with ESM)
const getImaps = async () => {
  const imaps = await import('imap-simple');
  return imaps.default;
};

const password = process.env.ICLOUD_APP_PASSWORD;
if (!password) throw new Error('Missing ICLOUD_APP_PASSWORD in .env');

const config: ImapSimpleOptions = {
  imap: {
    user: 'toddr.spencer@icloud.com',
    password,
    host: 'imap.mail.me.com',
    port: 993,
    tls: true,
    authTimeout: 10000,
    tlsOptions: {
      servername: 'imap.mail.me.com',
      rejectUnauthorized: false
    }
  }
};

function classifyIntent(text: string): string {
  const lowered = text.toLowerCase();
  if (lowered.includes('unsubscribe') || lowered.includes('marketing')) return 'marketing';
  if (lowered.includes('calendar') || lowered.match(/\b(meeting|appointment|schedule|event)\b/)) return 'calendar_event';
  if (lowered.includes('invoice') || lowered.includes('payment')) return 'finance';
  if (lowered.includes('attachment') || lowered.includes('.pdf')) return 'document';
  if (lowered.includes('urgent') || lowered.includes('asap')) return 'important';
  return 'general';
}

function isUnimportant(email: any): boolean {
  const lowPrioritySenders = ['newsletter', 'noreply', 'no-reply'];
  return lowPrioritySenders.some(tag => email.from.toLowerCase().includes(tag)) ||
         email.subject.toLowerCase().includes('sale') ||
         email.intent === 'marketing';
}

async function fetchUnreadEmails(): Promise<any[]> {
  try {
    const imaps = await getImaps();
    const connection: ImapSimple = await imaps.connect(config);
    await connection.openBox('INBOX');
    console.log('📥 Connected to INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: [''], struct: true, markSeen: false }; // fetch full raw email
    const results: Message[] = await connection.search(searchCriteria, fetchOptions);

    console.log(`🔍 Found ${results.length} unread message(s)`);

    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const filteredResults = results.filter(res => {
      const dateAttr = res.attributes?.date;
      if (!dateAttr) return false;
      const parsedTime = new Date(dateAttr).getTime();
      return !isNaN(parsedTime) && parsedTime >= twentyFourHoursAgo;
    });

    console.log(`⏱ After date filter: ${filteredResults.length} message(s)`);

    const emails = await Promise.all(filteredResults.map(async (res) => {
      const part = res.parts.find(p => p.which === '');
      if (!part || !part.body || typeof part.body !== 'string') {
        console.warn('⚠️ Skipping malformed email part:', part);
        return null;
      }

      const parsed = await simpleParser(part.body);
      const textContent = (parsed.text || '').replace(/\s+/g, ' ').trim();

      const attachments = parsed.attachments?.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size
      })) || [];

      const email = {
        from: parsed.from?.text || '',
        subject: parsed.subject || '',
        date: parsed.date || '',
        text: textContent,
        hasAttachments: attachments.length > 0,
        attachments,
        intent: classifyIntent(textContent),
        isUnimportant: false
      };

      email.isUnimportant = isUnimportant(email);
      return email;
    }));

    await connection.end();
    return emails.filter(Boolean);
  } catch (err: any) {
    console.error('❌ Email fetch failed:', err.message);
    return [];
  }
}

export default fetchUnreadEmails;
