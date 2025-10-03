const Imap = require('imap');
const { simpleParser } = require('mailparser');

class EmailService {
  constructor() {
    this.imapConfig = {
      user: process.env.GMAIL_USER,
      password: process.env.GMAIL_APP_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false,
        servername: 'imap.gmail.com'
      },
      connTimeout: 30000,
      authTimeout: 10000,
      keepalive: false
    };
  }

  async fetchGmailEmails(userEmail, limit = 10) {
    return new Promise((resolve, reject) => {
      console.log('🔗 Connecting to Gmail IMAP...');
      
      const imap = new Imap(this.imapConfig);
      let emails = [];
      let processed = 0;
      let totalToProcess = 0;
      
      const timeout = setTimeout(() => {
        console.log('⏰ IMAP timeout');
        imap.destroy();
        reject(new Error('IMAP timeout'));
      }, 45000);

      imap.once('ready', () => {
        console.log('✅ IMAP ready');
        
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            clearTimeout(timeout);
            console.error('❌ Inbox error:', err);
            return reject(err);
          }

          console.log(`📬 Inbox opened. ${box.messages.total} total messages`);
          
          if (box.messages.total === 0) {
            clearTimeout(timeout);
            imap.end();
            return resolve([]);
          }

          // Fetch most recent emails
          const start = Math.max(1, box.messages.total - limit + 1);
          const end = box.messages.total;
          totalToProcess = end - start + 1;
          
          console.log(`📧 Fetching messages ${start} to ${end}`);
          
          const fetch = imap.seq.fetch(`${start}:${end}`, {
            bodies: '',
            struct: true
          });

          fetch.on('message', (msg, seqno) => {
            console.log(`📨 Processing message ${seqno}`);
            
            msg.on('body', (stream, info) => {
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  console.error(`❌ Parse error for message ${seqno}:`, err);
                  processed++;
                  if (processed >= totalToProcess) {
                    clearTimeout(timeout);
                    imap.end();
                    resolve(emails.sort((a, b) => new Date(b.date) - new Date(a.date)));
                  }
                  return;
                }

                const emailData = {
                  messageId: parsed.messageId || `<generated-${Date.now()}-${seqno}@gmail.com>`,
                  from: parsed.from?.text || 'Unknown',
                  to: parsed.to?.text || userEmail,
                  subject: parsed.subject || 'No Subject',
                  date: parsed.date || new Date(),
                  bodyText: parsed.text || parsed.textAsHtml || ''
                };

                emails.push(emailData);
                processed++;

                console.log(`✅ Parsed: "${emailData.subject}" from ${emailData.from}`);

                if (processed >= totalToProcess) {
                  console.log(`🎉 Processed all ${processed} messages`);
                  clearTimeout(timeout);
                  imap.end();
                  resolve(emails.sort((a, b) => new Date(b.date) - new Date(a.date)));
                }
              });
            });
          });

          fetch.once('error', (err) => {
            console.error('❌ Fetch error:', err);
            clearTimeout(timeout);
            reject(err);
          });
        });
      });

      imap.once('error', (err) => {
        console.error('❌ IMAP error:', err);
        clearTimeout(timeout);
        reject(err);
      });

      imap.once('end', () => {
        console.log('🔌 IMAP connection ended');
        clearTimeout(timeout);
      });

      imap.connect();
    });
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Gmail connection...');
      const emails = await this.fetchGmailEmails(process.env.GMAIL_USER, 1);
      console.log('✅ Gmail connection successful');
      return { success: true, emailCount: emails.length };
    } catch (error) {
      console.error('❌ Gmail test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
