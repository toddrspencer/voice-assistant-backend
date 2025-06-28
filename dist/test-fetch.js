// test-fetch.ts
import fetchUnreadEmails from './email-parser';
(async () => {
    const emails = await fetchUnreadEmails();
    console.log(`📬 Final output: ${emails.length} email(s)`);
    console.dir(emails, { depth: null });
})();
