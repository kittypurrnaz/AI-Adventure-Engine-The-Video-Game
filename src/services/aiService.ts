// AI Service for Google AI Studio API integration
interface AIResponse {
  story: string;
  choices: Array<{
    id: string;
    text: string;
  }>;
}

interface APIConfig {
  apiKey: string;
  baseUrl: string;
}

class AIService {
  private config: APIConfig;

  constructor() {
    // In production, these would come from environment variables
    this.config = {
      apiKey: 'YOUR_GOOGLE_AI_STUDIO_API_KEY_HERE', // Replace with actual API key
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
    };
  }

  private async makeAPIRequest(prompt: string): Promise<string> {
    try {
      const url = `${this.config.baseUrl}/gemini-1.5-flash-latest:generateContent?key=${this.config.apiKey}`;
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
          stopSequences: []
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      console.log('Making API request to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response received');
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('Invalid API response structure:', data);
        throw new Error('Invalid API response format');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('AI API Error:', error);
      // Return fallback response for development/demo purposes
      return this.getFallbackResponse();
    }
  }

  private getFallbackResponse(): string {
    const fallbacks = [
      `{
        "story": "Static fills the air. You stand at a digital crossroads where three paths converge. Each route pulses with different energy.",
        "choices": [
          {"id": "1", "text": "Take the glowing path"},
          {"id": "2", "text": "Follow the dark route"},
          {"id": "3", "text": "Choose the middle way"},
          {"id": "4", "text": "Step back and observe"}
        ]
      }`,
      `{
        "story": "Connection unstable. Reality flickers around you like a broken screen. Through the static, you glimpse movement ahead.",
        "choices": [
          {"id": "1", "text": "Move toward the movement"},
          {"id": "2", "text": "Wait for static to clear"},
          {"id": "3", "text": "Touch the flickering air"},
          {"id": "4", "text": "Call out loudly"}
        ]
      }`,
      `{
        "story": "Demo mode active. You find yourself in a liminal space between worlds. Shadows dance at the periphery of vision.",
        "choices": [
          {"id": "1", "text": "Approach the shadows"},
          {"id": "2", "text": "Stand perfectly still"},
          {"id": "3", "text": "Search for light"},
          {"id": "4", "text": "Listen carefully"}
        ]
      }`,
      `{
        "story": "The narrative engine stutters. You're caught between story beats, suspended in potential. What happens next depends on you.",
        "choices": [
          {"id": "1", "text": "Force the story forward"},
          {"id": "2", "text": "Embrace the uncertainty"},
          {"id": "3", "text": "Look for an exit"},
          {"id": "4", "text": "Reset everything"}
        ]
      }`,
      `{
        "story": "Connection lost. In this void, you sense opportunity hiding in the darkness. Your next choice will shape everything.",
        "choices": [
          {"id": "1", "text": "Reach into the darkness"},
          {"id": "2", "text": "Create your own light"},
          {"id": "3", "text": "Wait for revelation"},
          {"id": "4", "text": "Embrace the void"}
        ]
      }`
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  private createNarratorPrompt(
    storyTopic: string, 
    gameHistory: string[], 
    userAction: string, 
    isFirstTurn: boolean
  ): string {
    const basePrompt = `You are a master of classic text adventures like Zork and Hitchhiker's Guide, creating immersive second-person narratives.

STORY TOPIC: ${storyTopic}

CRITICAL RULES:
- Write in second person ("You...")
- Keep responses SHORT and PUNCHY (3-6 sentences max, 50-120 words)
- Create immediate tension and atmosphere
- Use vivid, specific sensory details
- End with urgency, mystery, or intrigue
- Generate exactly 4 distinct, actionable choices
- Each choice must be 2-6 words, clear and different
- Focus on "what happens NOW" not backstory
- Make every word count - no fluff or exposition
- Create "you are there" immersion

TONE: Mysterious, atmospheric, immediate. Classic adventure game style.

AVOID: Long descriptions, backstory dumps, passive voice, vague language.

JSON FORMAT (STRICT):
{
  "story": "Short, atmospheric description here...",
  "choices": [
    {"id": "1", "text": "Short action"},
    {"id": "2", "text": "Different action"},
    {"id": "3", "text": "Third option"},
    {"id": "4", "text": "Final choice"}
  ]
}`;

    if (isFirstTurn) {
      return `${basePrompt}

TASK: Create a GRIPPING opening for "${storyTopic}". Drop the player directly into action or immediate situation. No setup - instant engagement.

Examples of effective openings:
- "Alarm klaxons shriek. Red lights flash across the bridge. The viewscreen shows incoming missiles."
- "You wake in total darkness. Stone walls. The sound of dripping water echoes nearby."
- "The vampire lord's eyes lock onto yours. His fangs glisten. The door slams shut behind you."

Generate immediate, atmospheric opening:`;
    } else {
      const recentHistory = gameHistory.length > 0 
        ? `\nRECENT CONTEXT:\n${gameHistory.slice(-2).join('\n\n')}\n`
        : '';
      
      return `${basePrompt}

${recentHistory}

PLAYER ACTION: ${userAction}

TASK: Show IMMEDIATE consequences of their action. What happens RIGHT NOW? Keep it tight, visceral, and compelling. Drive the story forward.

Generate immediate response:`;
    }
  }

  async generateStoryResponse(
    storyTopic: string,
    gameHistory: string[],
    userAction: string,
    isFirstTurn: boolean = false
  ): Promise<AIResponse> {
    const prompt = this.createNarratorPrompt(storyTopic, gameHistory, userAction, isFirstTurn);
    
    try {
      const response = await this.makeAPIRequest(prompt);
      
      // Clean the response - remove any markdown formatting or extra text
      let cleanResponse = response.trim();
      
      // Extract JSON from the response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in response, using fallback');
        throw new Error('No valid JSON found in response');
      }
      
      const jsonStr = jsonMatch[0];
      const parsedResponse = JSON.parse(jsonStr);
      
      // Validate the response structure
      if (!parsedResponse.story || !Array.isArray(parsedResponse.choices)) {
        console.warn('Invalid response structure:', parsedResponse);
        throw new Error('Invalid response structure');
      }
      
      // Ensure story isn't too long (enforce our length limit)
      if (parsedResponse.story.length > 400) {
        console.warn('Story too long, truncating');
        parsedResponse.story = parsedResponse.story.substring(0, 380) + '...';
      }
      
      // Ensure we have exactly 4 choices
      if (parsedResponse.choices.length !== 4) {
        console.warn('Response has wrong number of choices:', parsedResponse.choices.length);
        // Pad with default choices if needed
        while (parsedResponse.choices.length < 4) {
          const defaultChoices = ['Continue forward', 'Look around', 'Wait and listen', 'Go back'];
          parsedResponse.choices.push({
            id: (parsedResponse.choices.length + 1).toString(),
            text: defaultChoices[parsedResponse.choices.length] || `Option ${parsedResponse.choices.length + 1}`
          });
        }
        // Trim if too many
        parsedResponse.choices = parsedResponse.choices.slice(0, 4);
      }
      
      // Ensure all choices have required fields and aren't too long
      const validChoices = parsedResponse.choices.map((choice: any, index: number) => {
        let choiceText = choice.text || `Option ${index + 1}`;
        
        // Limit choice text length for UI
        if (choiceText.length > 35) {
          choiceText = choiceText.substring(0, 32) + '...';
        }
        
        return {
          id: choice.id || (index + 1).toString(),
          text: choiceText
        };
      });
      
      return {
        story: parsedResponse.story,
        choices: validChoices
      };
      
    } catch (error) {
      console.error('Error parsing AI response:', error);
      
      // Return parsed fallback response
      const fallback = this.getFallbackResponse();
      const parsedFallback = JSON.parse(fallback);
      return parsedFallback;
    }
  }

  // Method to test API connectivity
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = `Test prompt - respond in this exact format:
{
  "story": "Connection test successful. The terminal glows green.",
  "choices": [
    {"id": "1", "text": "Continue"},
    {"id": "2", "text": "Test again"},
    {"id": "3", "text": "Start game"},
    {"id": "4", "text": "Exit"}
  ]
}`;
      
      const response = await this.makeAPIRequest(testPrompt);
      
      // Try to parse the response to ensure it's valid
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return !!(parsed.story && parsed.choices && parsed.choices.length === 4);
      }
      
      return false;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  // Method to update API configuration
  updateConfig(newConfig: Partial<APIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('AI Service config updated');
  }

  // Method to get current API key status
  getApiKeyStatus(): 'valid' | 'invalid' | 'untested' {
    if (!this.config.apiKey || this.config.apiKey === 'YOUR_GOOGLE_AI_STUDIO_API_KEY_HERE') {
      return 'invalid';
    }
    return 'untested';
  }
}

// Export singleton instance
export const aiService = new AIService();
export type { AIResponse };