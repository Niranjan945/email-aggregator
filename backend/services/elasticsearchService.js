const { Client } = require('@elastic/elasticsearch');

class ElasticsearchService {
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY
      },
      // Optional: increase retries/timeouts if needed
      maxRetries: 5,
      requestTimeout: 60000
    });
    this.indexName = 'emails';
    console.log('🔍 Elasticsearch service initialized');
  }

  // Test connection to Elasticsearch
  async testConnection() {
    try {
      const response = await this.client.ping();
      console.log('✅ Elasticsearch connection successful');
      return { connected: true, cluster: response };
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error.message);
      return { connected: false, error: error.message };
    }
  }

  // Create email index with mapping (like database schema)
  async createEmailIndex() {
    try {
      const indexExists = await this.client.indices.exists({
        index: this.indexName
      });

      if (indexExists) {
        console.log(`📁 Index "${this.indexName}" already exists`);
        return { created: false, exists: true };
      }

      // Define email document structure
      const mapping = {
        mappings: {
          properties: {
            messageId: { 
              type: 'keyword'  // Exact match for duplicates
            },
            subject: { 
              type: 'text',    // Full-text search
              analyzer: 'standard'  // Handles word splitting, stemming
            },
            bodyText: { 
              type: 'text',
              analyzer: 'standard'
            },
            from: { 
              type: 'keyword'  // Exact email addresses
            },
            to: { 
              type: 'keyword' 
            },
            category: { 
              type: 'keyword'  // Filter by AI categories
            },
            date: { 
              type: 'date'     // Date range queries
            },
            accountId: { 
              type: 'keyword'  // Filter by email account
            },
            aiConfidence: { 
              type: 'float'    // Numerical range queries
            }
          }
        }
      };

      const result = await this.client.indices.create({
        index: this.indexName,
        body: mapping
      });

      console.log(`✅ Created email index: ${this.indexName}`);
      return { created: true, result: result };

    } catch (error) {
      console.error('❌ Failed to create index:', error.message);
      throw error;
    }
  }

  // Index a single email document
  async indexEmail(email) {
    try {
      const doc = {
        messageId: email.messageId,
        subject: email.subject || '',
        bodyText: email.bodyText || '',
        from: email.from || '',
        to: email.to || [],
        category: email.category || 'uncategorized',
        date: email.date || new Date(),
        accountId: email.accountId?.toString(),
        aiConfidence: email.aiConfidence || 0
      };

      const result = await this.client.index({
        index: this.indexName,
        id: email._id?.toString(),  // Use MongoDB _id as Elasticsearch document id
        body: doc
      });

      console.log(`🔍 Indexed email: ${email.subject} (${result.result})`);
      return { indexed: true, id: result._id };

    } catch (error) {
      console.error(`❌ Failed to index email: ${error.message}`);
      return { indexed: false, error: error.message };
    }
  }

  // Bulk index multiple emails (efficient for large datasets)
  async indexMultipleEmails(emails) {
    if (!emails || emails.length === 0) {
      return { indexed: 0, errors: [] };
    }

    try {
      const body = [];

      emails.forEach(email => {
        // Index operation
        body.push({
          index: {
            _index: this.indexName,
            _id: email._id?.toString()
          }
        });

        // Document data
        body.push({
          messageId: email.messageId,
          subject: email.subject || '',
          bodyText: email.bodyText || '',
          from: email.from || '',
          to: email.to || [],
          category: email.category || 'uncategorized',
          date: email.date || new Date(),
          accountId: email.accountId?.toString(),
          aiConfidence: email.aiConfidence || 0
        });
      });

      const result = await this.client.bulk({
        body: body,
        refresh: true  // Make documents searchable immediately
      });

      const errors = result.items.filter(item => item.index.error);
      const successful = result.items.length - errors.length;

      console.log(`🔍 Bulk indexed: ${successful}/${emails.length} emails`);

      if (errors.length > 0) {
        console.error(`⚠️ ${errors.length} indexing errors:`, errors[0]?.index?.error);
      }

      return { 
        indexed: successful, 
        total: emails.length,
        errors: errors 
      };

    } catch (error) {
      console.error('❌ Bulk indexing failed:', error.message);
      return { indexed: 0, errors: [error.message] };
    }
  }

  // Simple text search across email content
  async searchEmails(query, options = {}) {
    try {
      const {
        from,           // Filter by sender
        category,       // Filter by AI category
        accountId,      // Filter by email account
        dateFrom,       // Date range start
        dateTo,         // Date range end
        size = 10,      // Results per page
        from: offset = 0 // Pagination offset
      } = options;

      // Build search query
      const searchQuery = {
        bool: {
          must: [],      // AND conditions
          filter: []     // Exact match filters
        }
      };

      // Text search across subject and body
      if (query && query.trim()) {
        searchQuery.bool.must.push({
          multi_match: {
            query: query,
            fields: ['subject^2', 'bodyText'],  // Boost subject relevance
            fuzziness: 'AUTO'  // Handle typos
          }
        });
      }

      // Add filters
      if (from) {
        searchQuery.bool.filter.push({ term: { from: from } });
      }

      if (category) {
        searchQuery.bool.filter.push({ term: { category: category } });
      }

      if (accountId) {
        searchQuery.bool.filter.push({ term: { accountId: accountId } });
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const dateRange = {};
        if (dateFrom) dateRange.gte = dateFrom;
        if (dateTo) dateRange.lte = dateTo;

        searchQuery.bool.filter.push({
          range: { date: dateRange }
        });
      }

      const searchParams = {
        index: this.indexName,
        body: {
          query: searchQuery,
          sort: [{ date: { order: 'desc' } }],  // Newest first
          highlight: {
            fields: {
              subject: {},
              bodyText: {}
            }
          }
        },
        size: size,
        from: offset
      };

      const result = await this.client.search(searchParams);

      const hits = result.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
        highlights: hit.highlight
      }));

      console.log(`🔍 Search found ${result.hits.total.value} results for: "${query}"`);

      return {
        total: result.hits.total.value,
        results: hits,
        query: query,
        took: result.took  // Search time in milliseconds
      };

    } catch (error) {
      console.error('❌ Search failed:', error.message);
      return { 
        total: 0, 
        results: [], 
        error: error.message 
      };
    }
  }

  // Get search suggestions/autocomplete
  async getSuggestions(query) {
    try {
      const result = await this.client.search({
        index: this.indexName,
        body: {
          suggest: {
            subject_suggest: {
              prefix: query,
              completion: {
                field: 'subject',
                size: 5
              }
            }
          }
        }
      });

      const suggestions = result.suggest.subject_suggest[0].options.map(
        option => option.text
      );

      return { suggestions: suggestions };

    } catch (error) {
      console.error('❌ Suggestions failed:', error.message);
      return { suggestions: [] };
    }
  }
}

module.exports = new ElasticsearchService();