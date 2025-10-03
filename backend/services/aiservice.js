const axios = require('axios');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  async categorizeEmail(subject, bodyText) {
    if (!this.openaiApiKey) {
      console.warn('⚠️ OpenAI not configured, using fallback');
      return this.fallbackCategorization(subject, bodyText);
    }

    try {
      const prompt = `Categorize this email into exactly one category:
- Interested
- Meeting Booked
- Not Interested
- Out of Office
- Spam

Subject: "${subject}"
Body: "${bodyText}"

Reply with ONLY the category name.`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You categorize emails. Reply with only the category name.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 10,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const category = response.data.choices[0].message.content.trim();
      const valid = ['Interested', 'Meeting Booked', 'Not Interested', 'Out of Office', 'Spam'];
      
      if (valid.includes(category)) {
        console.log(`🤖 AI categorized as: ${category}`);
        return category;
      } else {
        console.warn(`⚠️ Invalid AI response: ${category}, using fallback`);
        return this.fallbackCategorization(subject, bodyText);
      }

    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('⚠️ OpenAI rate limit reached, using fallback');
      } else {
        console.error('❌ AI error:', error.message);
      }
      return this.fallbackCategorization(subject, bodyText);
    }
  }

  fallbackCategorization(subject, bodyText) {
    const text = `${subject} ${bodyText}`.toLowerCase();

    if (text.includes('meeting') || text.includes('schedule') || 
        text.includes('calendar') || text.includes('confirmed')) {
      return 'Meeting Booked';
    }
    
    if (text.includes('interested') || text.includes('partnership') ||
        text.includes('opportunity') || text.includes('discuss')) {
      return 'Interested';
    }
    
    if (text.includes('not interested') || text.includes('decline') ||
        text.includes('different solution')) {
      return 'Not Interested';
    }
    
    if (text.includes('out of office') || text.includes('vacation') ||
        text.includes('away')) {
      return 'Out of Office';
    }
    
    if (text.includes('spam') || text.includes('unsubscribe')) {
      return 'Spam';
    }

    return 'Interested';
  }

  calculateConfidence(emailData, category) {
    let confidence = 0.8;
    const text = `${emailData.subject} ${emailData.bodyText}`.toLowerCase();
    
    if (category === 'Meeting Booked' && text.includes('confirmed')) confidence = 0.95;
    if (category === 'Interested' && text.includes('partnership')) confidence = 0.9;
    
    return Math.min(confidence, 0.99);
  }
}

module.exports = new AIService();
