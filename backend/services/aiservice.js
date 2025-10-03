const OpenAI = require('openai');

class AIService {
  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 10000
      });
      console.log('🤖 OpenAI initialized');
    } else {
      console.log('⚠️ No OpenAI key, using fallback');
      this.openai = null;
    }
  }

  async categorizeEmail(subject, body) {
    console.log('🤖 Categorizing email...');

    // If no OpenAI, use simple rules
    if (!this.openai) {
      return this.smartCategorize(subject, body);
    }

    try {
      const prompt = `Categorize this email as one of: Interested, Not Interested, Meeting Booked, Spam, Out of Office

Subject: ${subject || 'No Subject'}
Body: ${(body || '').substring(0, 500)}

Category:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20,
        temperature: 0
      });

      const category = response.choices[0].message.content.trim();

      // Validate response
      const validCategories = ['Interested', 'Not Interested', 'Meeting Booked', 'Spam', 'Out of Office'];
      if (validCategories.includes(category)) {
        console.log(`✅ AI result: ${category}`);
        return category;
      } else {
        console.log(`⚠️ Invalid AI response, using smart fallback`);
        return this.smartCategorize(subject, body);
      }

    } catch (error) {
      // Handle specific OpenAI errors
      if (error.status === 429) {
        console.log('💰 OpenAI quota exceeded, using smart categorization');
      } else if (error.status === 401) {
        console.log('🔑 OpenAI API key invalid, using smart categorization');  
      } else {
        console.error('❌ AI failed:', error.message);
      }

      return this.smartCategorize(subject, body);
    }
  }

  smartCategorize(subject, body) {
    const content = `${subject || ''} ${body || ''}`.toLowerCase();

    console.log('🧠 Using smart categorization rules...');

    // Enhanced categorization rules

    // Out of Office patterns (check first - most specific)
    if (content.includes('out of office') || 
        content.includes('vacation') || 
        content.includes('auto-reply') ||
        content.includes('automatic reply') ||
        content.includes('currently away') ||
        content.includes('not in the office') ||
        content.includes('will be back') ||
        content.includes('out until')) {
      return 'Out of Office';
    }

    // Meeting/Schedule patterns  
    if (content.includes('meeting scheduled') ||
        content.includes('meeting booked') ||
        content.includes('meeting confirmed') ||
        content.includes('appointment confirmed') ||
        content.includes('calendar invite') ||
        content.includes('zoom meeting') ||
        content.includes('teams meeting') ||
        content.includes('let\'s schedule') ||
        content.includes('meeting request accepted')) {
      return 'Meeting Booked';
    }

    // Interest patterns (positive responses)
    if (content.includes('interested') ||
        content.includes('yes, i would like') ||
        content.includes('sounds good') ||
        content.includes('great idea') ||
        content.includes('let\'s discuss') ||
        content.includes('when can we') ||
        content.includes('available for') ||
        content.includes('looking forward') ||
        content.includes('please send more') ||
        content.includes('tell me more')) {
      return 'Interested';
    }

    // Spam patterns (promotional/suspicious content)
    if (content.includes('congratulations') ||
        content.includes('you\'ve won') ||
        content.includes('winner') ||
        content.includes('claim your prize') ||
        content.includes('click here now') ||
        content.includes('limited time offer') ||
        content.includes('act now') ||
        content.includes('free money') ||
        content.includes('nigerian prince') ||
        content.includes('investment opportunity') ||
        content.includes('make money fast') ||
        content.includes('unsubscribe') ||
        subject?.toLowerCase().includes('re:') === false && content.includes('urgent')) {
      return 'Spam';
    }

    // Marketing/Cold outreach (like ReachInbox email)  
    if (content.includes('outreach') ||
        content.includes('cold email') ||
        content.includes('marketing') ||
        content.includes('newsletter') ||
        content.includes('promotion') ||
        content.includes('special offer') ||
        content.includes('supercharge') ||
        content.includes('boost your') ||
        content.includes('welcome to')) {
      return 'Spam'; // Treating marketing as spam for this use case
    }

    // Not interested patterns
    if (content.includes('not interested') ||
        content.includes('no thank you') ||
        content.includes('remove me') ||
        content.includes('stop emailing') ||
        content.includes('not at this time') ||
        content.includes('not right now') ||
        content.includes('maybe later')) {
      return 'Not Interested';
    }

    // Default: Analyze content type
    if (content.length < 50) {
      return 'Not Interested'; // Very short emails usually not important
    }

    // Test emails from yourself
    if (subject?.toLowerCase().includes('test')) {
      return 'Interested'; // Test emails are usually important
    }

    return 'Not Interested'; // Safe default
  }
}

module.exports = new AIService();