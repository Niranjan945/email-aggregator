const axios = require('axios');

class SlackService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = !!this.webhookUrl;
  }

  async sendNotification(email) {
    if (!this.enabled) {
      console.warn('Slack webhook not configured');
      return { success: false, error: 'Slack not configured' };
    }

    try {
      const message = {
        text: `📧 New ${email.category} Email`,
        attachments: [
          {
            color: this.getCategoryColor(email.category),
            fields: [
              {
                title: 'From',
                value: email.from,
                short: true
              },
              {
                title: 'Subject', 
                value: email.subject,
                short: true
              },
              {
                title: 'Category',
                value: `${email.category} (${Math.round(email.aiConfidence * 100)}% confidence)`,
                short: true
              },
              {
                title: 'Time',
                value: new Date(email.date).toLocaleString(),
                short: true
              }
            ],
            footer: 'OneBox Email Aggregator',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      const response = await axios.post(this.webhookUrl, message);
      
      console.log('📢 Slack notification sent successfully');
      return { success: true, response: response.status };

    } catch (error) {
      console.error('❌ Slack notification failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  getCategoryColor(category) {
    const colors = {
      'Interested': 'good',
      'Meeting Booked': '#4f46e5', 
      'Not Interested': 'danger',
      'Out of Office': 'warning',
      'Spam': '#f97316'
    };
    
    return colors[category] || '#6b7280';
  }

  async testWebhook() {
    if (!this.enabled) {
      return { success: false, error: 'Webhook URL not configured' };
    }

    try {
      const testMessage = {
        text: '🧪 OneBox Email Aggregator - Test Notification',
        attachments: [
          {
            color: 'good',
            text: 'Slack integration is working correctly!',
            footer: 'OneBox Test',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      const response = await axios.post(this.webhookUrl, testMessage);
      return { success: true, status: response.status };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SlackService();