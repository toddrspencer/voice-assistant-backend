import imaps, { ImapSimple, Message, ImapSimpleOptions } from 'imap-simple';
import { simpleParser } from 'mailparser';
import * as dotenv from 'dotenv';
dotenv.config();

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
  if (lowered.includes('calendar') || lowered.match(/\b(meeting|appointment|schedule|event)\b/)) return 'calendar_event';
  if (lowered.includes('unsubscribe') || lowered.includes('marketing')) return 'marketing';
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
    const connection: ImapSimple = await imaps.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true, markSeen: false };
    const results: Message[] = await connection.search(searchCriteria, fetchOptions);

    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const filteredResults = results.filter((res: any) => {
      const headerPart = res.parts.find((p: any) => p.which === 'HEADER');
      if (!headerPart?.body || typeof headerPart.body !== 'string') return false;

      const dateMatch = headerPart.body.match(/Date: (.+)/i);
      if (!dateMatch) return false;

      const parsedDate = new Date(dateMatch[1]);
      return !isNaN(parsedDate.getTime()) && parsedDate.getTime() >= twentyFourHoursAgo;
    });

    const emails = await Promise.all(filteredResults.map(async (res: any) => {
      const part = res.parts.find((p: any) => p.which === 'TEXT');

      if (!part || !part.body || typeof part.body !== 'string') {
        console.warn('⚠️ Skipping malformed email part:', part);
        return null;
      }

      const parsed = await simpleParser(part.body);

      const attachments = parsed.attachments?.map((att: any) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size
      })) || [];

      const email = {
        from: parsed.from?.text || '',
        subject: parsed.subject || '',
        date: parsed.date || '',
        text: parsed.text || '',
        hasAttachments: attachments.length > 0,
        attachments,
        intent: classifyIntent(parsed.text || ''),
        isUnimportant: false
      };

      email.isUnimportant = isUnimportant(email);
      return email;
    }));

    await connection.end();
    return emails.filter(Boolean); // Remove nulls
  } catch (err: any) {
    console.error('❌ Email fetch failed:', err.message);
    return [];
  }
}

export default fetchUnreadEmails;
