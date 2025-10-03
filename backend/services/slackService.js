// SLACK NOTIFICATION SERVICE - services/slackService.js
const axios = require('axios');

class SlackService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
  }

  async sendNotification(emailData) {
    try {
      if (!this.webhookUrl) {
        console.log('⚠️ Slack webhook URL not configured');
        return { success: false, reason: 'No webhook URL' };
      }

      console.log('📢 Sending Slack notification for:', emailData.subject);

      const message = {
        text: `📧 New ${emailData.category} Email Received`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🚨 New ${emailData.category} Email`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*From:*\n${emailData.from}`
              },
              {
                type: "mrkdwn",
                text: `*Category:*\n${emailData.category}`
              },
              {
                type: "mrkdwn",
                text: `*Subject:*\n${emailData.subject}`
              },
              {
                type: "mrkdwn",
                text: `*AI Confidence:*\n${Math.round(emailData.aiConfidence * 100)}%`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Preview:*\n${emailData.bodyText?.substring(0, 200)}...`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `📅 ${new Date(emailData.date).toLocaleString()} | OneBox Email Aggregator`
              }
            ]
          }
        ]
      };

      const response = await axios.post(this.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        console.log('✅ Slack notification sent successfully');
        return { success: true, sent: true };
      } else {
        console.log('⚠️ Slack notification failed:', response.status);
        return { success: false, reason: `HTTP ${response.status}` };
      }

    } catch (error) {
      console.error('❌ Slack notification error:', error.message);
      return { success: false, reason: error.message };
    }
  }

  async testSlackIntegration() {
    try {
      console.log('🧪 Testing Slack integration...');

      const testEmail = {
        from: 'test@example.com',
        subject: 'Test Email - Slack Integration',
        category: 'Interested',
        aiConfidence: 0.92,
        bodyText: 'This is a test email to verify that Slack notifications are working correctly.',
        date: new Date()
      };

      const result = await this.sendNotification(testEmail);
      
      if (result.success) {
        console.log('✅ Slack integration test successful');
      } else {
        console.log('❌ Slack integration test failed:', result.reason);
      }

      return result;

    } catch (error) {
      console.error('❌ Slack test error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkNotification(emails) {
    try {
      console.log(`📢 Sending bulk Slack notification for ${emails.length} emails`);

      const categoryGroups = emails.reduce((groups, email) => {
        const category = email.category || 'Uncategorized';
        if (!groups[category]) groups[category] = [];
        groups[category].push(email);
        return groups;
      }, {});

      const message = {
        text: `📧 Email Batch Update - ${emails.length} New Emails`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `📬 Email Batch Update`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Processed *${emails.length}* new emails:`
            }
          }
        ]
      };

      // Add category breakdown
      Object.entries(categoryGroups).forEach(([category, categoryEmails]) => {
        message.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${category}:* ${categoryEmails.length} emails`
          }
        });
      });

      // Add timestamp
      message.blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `📅 ${new Date().toLocaleString()} | OneBox Email Aggregator`
          }
        ]
      });

      const response = await axios.post(this.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.status === 200;

    } catch (error) {
      console.error('❌ Bulk Slack notification error:', error);
      return false;
    }
  }
}

module.exports = new SlackService();