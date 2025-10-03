const axios = require('axios');

class SlackService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = Boolean(this.webhookUrl);
  }

  async sendNotification(email) {
    if (!this.enabled) {
      console.warn('⚠️ Slack not configured');
      return { success: false, error: 'Not configured' };
    }

    try {
      const message = {
        text: `📧 New ${email.category} Email`,
        attachments: [{
          color: this.getCategoryColor(email.category),
          fields: [
            { title: 'From', value: email.from, short: true },
            { title: 'Subject', value: email.subject, short: true },
            { title: 'Category', value: `${email.category} (${Math.round(email.aiConfidence * 100)}%)`, short: true },
            { title: 'Time', value: new Date().toLocaleString(), short: true }
          ],
          footer: 'OneBox Email Aggregator'
        }]
      };

      await axios.post(this.webhookUrl, message, { timeout: 10000 });
      console.log('📢 Slack notification sent');
      return { success: true };
    } catch (error) {
      console.error('❌ Slack error:', error.message);
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
    if (!this.enabled) return { success: false, error: 'Not configured' };
    
    try {
      await axios.post(this.webhookUrl, {
        text: '🧪 OneBox Test - Slack Integration Working!',
        attachments: [{
          color: 'good',
          text: 'Your Slack webhook is properly configured.',
          footer: 'OneBox Test'
        }]
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SlackService();
