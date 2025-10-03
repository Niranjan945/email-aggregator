// AI CATEGORIZATION SERVICE - services/aiService.js
const { OpenAI } = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async categorizeEmail(subject, bodyText) {
    try {
      console.log('🤖 Categorizing email with AI:', subject);

      const prompt = `
        Analyze this email and categorize it into one of these categories:
        - Interested: Business inquiries, collaboration requests, positive responses
        - Not Interested: Rejections, declines, "not interested" responses
        - Meeting Booked: Meeting confirmations, calendar invites, scheduled appointments
        - Spam: Promotional emails, advertisements, suspicious content
        - Out of Office: Auto-replies, vacation messages, away notifications

        Email Subject: ${subject}
        Email Body: ${bodyText?.substring(0, 500)}

        Respond with just the category name.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      });

      const category = completion.choices[0].message.content.trim();
      
      // Validate category
      const validCategories = ['Interested', 'Not Interested', 'Meeting Booked', 'Spam', 'Out of Office'];
      const finalCategory = validCategories.includes(category) ? category : this.fallbackCategorization(subject, bodyText);
      
      console.log(`✅ AI Categorized as: ${finalCategory}`);
      return finalCategory;

    } catch (error) {
      console.error('❌ AI categorization error:', error);
      // Fallback to rule-based categorization
      return this.fallbackCategorization(subject, bodyText);
    }
  }

  fallbackCategorization(subject, bodyText) {
    const text = `${subject} ${bodyText}`.toLowerCase();
    
    // Rule-based categorization as fallback
    if (text.includes('meeting') || text.includes('schedule') || text.includes('calendar') || text.includes('appointment')) {
      return 'Meeting Booked';
    }
    
    if (text.includes('interested') || text.includes('inquiry') || text.includes('collaboration') || text.includes('proposal')) {
      return 'Interested';
    }
    
    if (text.includes('not interested') || text.includes('decline') || text.includes('reject') || text.includes('no thank')) {
      return 'Not Interested';
    }
    
    if (text.includes('out of office') || text.includes('vacation') || text.includes('auto-reply') || text.includes('away')) {
      return 'Out of Office';
    }
    
    if (text.includes('unsubscribe') || text.includes('promotion') || text.includes('deal') || text.includes('offer')) {
      return 'Spam';
    }
    
    // Default category
    return 'Interested';
  }

  calculateConfidence(emailData, category) {
    let confidence = 0.7; // Base confidence
    
    const subject = emailData.subject?.toLowerCase() || '';
    const body = emailData.bodyText?.toLowerCase() || '';
    
    // Increase confidence based on content quality
    if (subject.length > 10) confidence += 0.05;
    if (body.length > 50) confidence += 0.1;
    if (emailData.from && !emailData.from.includes('noreply')) confidence += 0.05;
    
    // Category-specific confidence adjustments
    switch (category) {
      case 'Meeting Booked':
        if (subject.includes('meeting') || subject.includes('calendar')) confidence += 0.1;
        break;
      case 'Interested':
        if (body.includes('interested') || body.includes('inquiry')) confidence += 0.1;
        break;
      case 'Spam':
        if (subject.includes('offer') || body.includes('unsubscribe')) confidence += 0.15;
        break;
      case 'Out of Office':
        if (subject.includes('out of office') || body.includes('vacation')) confidence += 0.2;
        break;
      case 'Not Interested':
        if (body.includes('not interested') || body.includes('decline')) confidence += 0.1;
        break;
    }
    
    return Math.min(confidence, 0.95); // Cap at 95%
  }

  async testAI() {
    try {
      const testResult = await this.categorizeEmail(
        'Meeting Request - Project Discussion',
        'Hi, I would like to schedule a meeting to discuss the project details.'
      );
      
      console.log('✅ AI test successful. Category:', testResult);
      return { success: true, category: testResult };
    } catch (error) {
      console.error('❌ AI test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AIService();