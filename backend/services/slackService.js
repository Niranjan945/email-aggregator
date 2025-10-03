const axios = require('axios');

class SlackService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = !!this.webhookUrl;

    if (this.enabled) {
      console.log('📢 Slack notifications enabled');
    } else {
      console.log('⚠️ Slack webhook URL not configured, notifications disabled');
    }
  }

  // Send notification for important email
  async notifyImportantEmail(email) {
    if (!this.enabled) {
      console.log('📢 Slack disabled, skipping notification');
      return { sent: false, reason: 'Slack webhook not configured' };
    }

    try {
      const message = this.formatEmailNotification(email);

      const response = await axios.post(this.webhookUrl, message, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`📢 Slack notification sent for: ${email.subject}`);

      return { 
        sent: true, 
        status: response.status,
        email: email.subject 
      };

    } catch (error) {
      console.error('❌ Slack notification failed:', error.message);
      return { 
        sent: false, 
        error: error.message,
        email: email.subject 
      };
    }
  }

  // Format email as rich Slack message
  formatEmailNotification(email) {
    const categoryEmoji = {
      'Interested': '🎉',
      'Meeting Booked': '📅', 
      'Out of Office': '🏖️',
      'Not Interested': '❌',
      'Spam': '🚫'
    };

    const emoji = categoryEmoji[email.category] || '📧';
    const preview = email.bodyText ? email.bodyText.substring(0, 150) + '...' : 'No content';

    return {
      text: `${emoji} New ${email.category} Email`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${email.category} Email Alert`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Subject:*\n${email.subject || 'No Subject'}`
            },
            {
              type: 'mrkdwn', 
              text: `*From:*\n${email.from || 'Unknown Sender'}`
            },
            {
              type: 'mrkdwn',
              text: `*Category:*\n${email.category}`
            },
            {
              type: 'mrkdwn',
              text: `*Date:*\n${new Date(email.date).toLocaleDateString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Preview:*\n${preview}`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `AI Confidence: ${Math.round((email.aiConfidence || 0) * 100)}% | Email System Alert`
            }
          ]
        }
      ]
    };
  }

  // Send custom Slack message
  async sendCustomMessage(text, blocks = null) {
    if (!this.enabled) {
      return { sent: false, reason: 'Slack webhook not configured' };
    }

    try {
      const message = blocks ? { text, blocks } : { text };

      const response = await axios.post(this.webhookUrl, message, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`📢 Custom Slack message sent: ${text}`);

      return { sent: true, status: response.status };

    } catch (error) {
      console.error('❌ Custom Slack message failed:', error.message);
      return { sent: false, error: error.message };
    }
  }

  // Send test notification
  async sendTestNotification() {
    const testMessage = {
      text: '🧪 Email System Test',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 Email System Test Notification'
          }
        },
        {
          type: 'section', 
          text: {
            type: 'mrkdwn',
            text: '*Your email aggregation system is working!*\n\nThis is a test notification to verify Slack integration.'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*System Status:*\nOnline ✅`
            },
            {
              type: 'mrkdwn', 
              text: `*Features:*\nEmail Fetching, AI Categorization, Search, Notifications`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Test sent at ${new Date().toLocaleString()} | Email Aggregation System`
            }
          ]
        }
      ]
    };

    return await this.sendCustomMessage(testMessage.text, testMessage.blocks);
  }

  // Bulk notify for multiple emails
  async notifyMultipleEmails(emails, filterCategory = null) {
    if (!this.enabled) {
      return { sent: 0, reason: 'Slack webhook not configured' };
    }

    let sent = 0;
    const results = [];

    for (const email of emails) {
      // Skip if filtering by category and email doesn't match
      if (filterCategory && email.category !== filterCategory) {
        continue;
      }

      const result = await this.notifyImportantEmail(email);
      results.push(result);

      if (result.sent) {
        sent++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`📢 Bulk notification complete: ${sent}/${emails.length} sent`);

    return {
      sent: sent,
      total: emails.length,
      results: results
    };
  }

  // Check if Slack is configured and working
  async testConnection() {
    if (!this.enabled) {
      return { 
        configured: false, 
        working: false, 
        message: 'Slack webhook URL not set in environment variables' 
      };
    }

    try {
      const testResult = await this.sendTestNotification();

      return {
        configured: true,
        working: testResult.sent,
        webhook: this.webhookUrl ? 'Set' : 'Not Set',
        message: testResult.sent ? 'Test notification sent successfully' : 'Test notification failed'
      };

    } catch (error) {
      return {
        configured: true,
        working: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }
}

module.exports = new SlackService();