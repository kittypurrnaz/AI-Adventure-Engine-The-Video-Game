import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { aiService, type AIResponse } from '../services/aiService';

interface GameMessage {
  type: 'narrator' | 'user' | 'system' | 'error';
  content: string;
  timestamp: Date;
}

interface GameChoice {
  id: string;
  text: string;
}

interface GameState {
  messages: GameMessage[];
  currentChoices: GameChoice[];
  isWaitingForResponse: boolean;
  gameStarted: boolean;
  storyTopic: string;
  gameHistory: string[];
}

export function GameInterface() {
  const [gameState, setGameState] = useState<GameState>({
    messages: [],
    currentChoices: [],
    isWaitingForResponse: false,
    gameStarted: false,
    storyTopic: '',
    gameHistory: []
  });
  
  const [userInput, setUserInput] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [gameState.messages]);

  // Focus input when game starts
  useEffect(() => {
    if (gameState.gameStarted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState.gameStarted]);

  // Test API connection on component mount
  useEffect(() => {
    const testAPI = async () => {
      const apiKeyStatus = aiService.getApiKeyStatus();
      if (apiKeyStatus === 'invalid') {
        setApiError('No API key configured. Using demo mode.');
        setIsUsingFallback(true);
        return;
      }

      try {
        const isConnected = await aiService.testConnection();
        if (!isConnected) {
          setApiError('AI service connection failed. Using fallback responses.');
          setIsUsingFallback(true);
        } else {
          setApiError(null);
          setIsUsingFallback(false);
        }
      } catch (error) {
        setApiError('Connection test failed. Using demo mode.');
        setIsUsingFallback(true);
      }
    };
    testAPI();
  }, []);

  const addMessage = (type: 'narrator' | 'user' | 'system' | 'error', content: string) => {
    const newMessage: GameMessage = {
      type,
      content,
      timestamp: new Date()
    };
    
    setGameState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
  };

  const addToGameHistory = (userAction: string, narratorResponse: string) => {
    const historyEntry = `Player: ${userAction}\nNarrator: ${narratorResponse}`;
    setGameState(prev => ({
      ...prev,
      gameHistory: [...prev.gameHistory.slice(-10), historyEntry] // Keep last 10 entries
    }));
  };

  const generateStoryResponse = async (userAction: string, isFirstTurn: boolean = false) => {
    setGameState(prev => ({ ...prev, isWaitingForResponse: true, currentChoices: [] }));
    setApiError(null);
    
    try {
      // Add realistic typing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
      
      const response: AIResponse = await aiService.generateStoryResponse(
        gameState.storyTopic,
        gameState.gameHistory,
        userAction,
        isFirstTurn
      );
      
      // Add the narrator's response
      addMessage('narrator', response.story);
      
      // Add to game history for context
      if (!isFirstTurn) {
        addToGameHistory(userAction, response.story);
      }
      
      // Update choices
      setGameState(prev => ({
        ...prev,
        isWaitingForResponse: false,
        currentChoices: response.choices
      }));
      
      // Check if we're using fallback mode
      if (response.story.includes('offline mode') || response.story.includes('fallback')) {
        setIsUsingFallback(true);
        if (!apiError) {
          setApiError('Using offline mode - stories may be limited');
        }
      }
      
    } catch (error) {
      console.error('Error generating story response:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setApiError(`Failed to generate response: ${errorMsg}`);
      
      addMessage('error', 'NARRATIVE ENGINE ERROR: Unable to process request. The AI narrator is experiencing difficulties.');
      
      setGameState(prev => ({
        ...prev,
        isWaitingForResponse: false,
        currentChoices: [
          { id: '1', text: 'Try again' },
          { id: '2', text: 'Restart adventure' },
          { id: '3', text: 'Continue with demo mode' },
          { id: '4', text: 'Update API settings' }
        ]
      }));
    }
  };

  const startGame = async () => {
    if (!gameState.storyTopic.trim()) return;
    
    setGameState(prev => ({ ...prev, gameStarted: true, gameHistory: [] }));
    addMessage('system', `INITIALIZING ADVENTURE: ${gameState.storyTopic.toUpperCase()}`);
    
    if (isUsingFallback) {
      addMessage('system', 'RUNNING IN DEMO MODE...');
    } else {
      addMessage('system', 'CONNECTING TO AI NARRATOR...');
    }
    
    addMessage('system', 'LOADING NARRATIVE ENGINE...');
    addMessage('system', 'REALITY MATRIX ESTABLISHED.');
    addMessage('system', '===== ADVENTURE BEGINS =====');
    
    // Small delay for dramatic effect
    setTimeout(() => {
      generateStoryResponse('', true);
    }, 2500);
  };

  const handleChoice = (choice: GameChoice) => {
    // Handle special error recovery choices
    if (choice.text === 'Restart adventure') {
      restartGame();
      return;
    }
    
    if (choice.text === 'Try again' && gameState.gameHistory.length > 0) {
      // Re-attempt the last action
      const lastAction = gameState.gameHistory[gameState.gameHistory.length - 1]?.split('\n')[0]?.replace('Player: ', '') || 'continue';
      addMessage('user', `> ${choice.text}`);
      generateStoryResponse(lastAction);
      return;
    }
    
    if (choice.text === 'Update API settings') {
      updateApiKey();
      return;
    }
    
    if (choice.text === 'Continue with demo mode') {
      addMessage('user', `> ${choice.text}`);
      addMessage('system', 'SWITCHING TO DEMO MODE...');
      setIsUsingFallback(true);
      setApiError('Demo mode active - limited story variations');
      generateStoryResponse('continue in demo mode');
      return;
    }
    
    if (choice.text === 'Check connection') {
      addMessage('user', `> ${choice.text}`);
      addMessage('system', 'TESTING AI CONNECTION...');
      aiService.testConnection().then(isConnected => {
        if (isConnected) {
          addMessage('system', 'CONNECTION RESTORED. CONTINUING ADVENTURE...');
          setApiError(null);
          setIsUsingFallback(false);
          generateStoryResponse('check surroundings');
        } else {
          addMessage('system', 'CONNECTION FAILED. USING LOCAL FALLBACK MODE.');
          setApiError('Using offline mode');
          setIsUsingFallback(true);
        }
      });
      return;
    }
    
    addMessage('user', `> ${choice.text}`);
    generateStoryResponse(choice.text);
  };

  const handleUserInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || gameState.isWaitingForResponse) return;
    
    addMessage('user', `> ${userInput}`);
    generateStoryResponse(userInput);
    setUserInput('');
  };

  const restartGame = () => {
    setGameState({
      messages: [],
      currentChoices: [],
      isWaitingForResponse: false,
      gameStarted: false,
      storyTopic: '',
      gameHistory: []
    });
    setUserInput('');
    // Don't reset API error status on restart
  };

  const updateApiKey = () => {
    const newApiKey = prompt('Enter your Google AI Studio API key:');
    if (newApiKey && newApiKey.trim()) {
      aiService.updateConfig({ apiKey: newApiKey.trim() });
      setApiError(null);
      addMessage('system', 'API KEY UPDATED. TESTING CONNECTION...');
      
      aiService.testConnection().then(isConnected => {
        if (isConnected) {
          addMessage('system', 'CONNECTION SUCCESSFUL! AI NARRATOR ONLINE.');
          setIsUsingFallback(false);
        } else {
          addMessage('system', 'CONNECTION FAILED. CHECK YOUR API KEY.');
          setApiError('Invalid API key or connection failed');
          setIsUsingFallback(true);
        }
      });
    }
  };

  if (!gameState.gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-retro-bg text-retro-primary p-8">
        <div className="matrix-rain"></div>
        <div className="max-w-2xl w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-mono text-retro-primary">
              ╔══════════════════════════════════════╗
            </h1>
            <h1 className="text-2xl font-pixel text-retro-primary leading-relaxed">
              AI ADVENTURE ENGINE
            </h1>
            <h1 className="text-3xl font-mono text-retro-primary">
              ╚══════════════════════════════════════╝
            </h1>
          </div>
          
          {apiError && (
            <div className="bg-retro-bg border border-retro-warning p-4 rounded">
              <p className="text-retro-warning text-sm font-mono">⚠ {apiError}</p>
              <Button
                onClick={updateApiKey}
                className="mt-2 bg-retro-warning border border-retro-warning text-retro-bg hover:bg-retro-accent hover:text-retro-bg text-xs px-3 py-1"
              >
                CONFIGURE API KEY
              </Button>
            </div>
          )}
          
          <div className="space-y-4 text-left font-mono">
            <p className="text-retro-secondary">
              <span className="text-retro-accent">{'>'}</span> WELCOME TO THE AI-POWERED STORY GENERATOR
            </p>
            <p className="text-retro-dim">
              <span className="text-retro-accent">{'>'}</span> Enter a topic, genre, or setting for your adventure:
            </p>
            <p className="text-retro-dim text-sm">
              <span className="text-retro-accent">{'>'}</span> Examples: "space exploration", "medieval fantasy", "cyberpunk detective", "horror mansion"
            </p>
            <p className="text-retro-dim text-xs">
              <span className="text-retro-accent">{'>'}</span> Powered by Google AI Studio - Advanced narrative generation
            </p>
          </div>
          
          <div className="space-y-4">
            <Input
              value={gameState.storyTopic}
              onChange={(e) => setGameState(prev => ({ ...prev, storyTopic: e.target.value }))}
              placeholder="Enter your story topic..."
              className="bg-retro-bg border-retro-border text-retro-primary font-mono text-lg p-4 h-12"
              onKeyDown={(e) => e.key === 'Enter' && startGame()}
            />
            <Button
              onClick={startGame}
              disabled={!gameState.storyTopic.trim()}
              className="bg-retro-dim border border-retro-border text-retro-primary hover:bg-retro-secondary hover:text-retro-bg font-mono text-lg px-8 py-3 h-12 retro-button"
            >
              ► INITIALIZE ADVENTURE
            </Button>
          </div>
          
          <div className="text-retro-dim font-mono text-sm space-y-2">
            <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
            <p className="text-retro-secondary">SYSTEM STATUS: READY</p>
            <p className="text-retro-accent">
              AI NARRATOR: {isUsingFallback ? 'DEMO MODE' : (apiError ? 'ERROR' : 'STANDBY')}
            </p>
            <p className="text-retro-accent">NARRATIVE ENGINE: STANDBY</p>
            <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-retro-bg text-retro-primary font-mono relative scanlines">
      <div className="matrix-rain"></div>
      
      {/* Header - Completely isolated from scanlines */}
      <div className="border-b border-retro-border p-4 bg-retro-bg game-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-pixel text-retro-primary">AI ADVENTURE ENGINE</h1>
            {apiError && (
              <p className="text-retro-warning text-xs mt-1">⚠ {apiError}</p>
            )}
          </div>
          <div className="flex gap-2">
            {(apiError || isUsingFallback) && (
              <Button
                onClick={updateApiKey}
                className="header-button text-xs px-3 py-1 bg-retro-warning border-retro-warning text-retro-bg hover:bg-retro-accent"
              >
                ⚙ API
              </Button>
            )}
            <Button
              onClick={restartGame}
              className="header-button text-sm px-4 py-2"
            >
              ► RESTART
            </Button>
          </div>
        </div>
        <p className="text-retro-dim text-sm mt-1 font-mono">
          TOPIC: {gameState.storyTopic.toUpperCase()} | 
          TURNS: {gameState.gameHistory.length} | 
          MODE: {isUsingFallback ? 'DEMO' : 'AI'}
        </p>
      </div>

      {/* Story Display - Using native scroll with complete isolation */}
      <div 
        className="flex-1 p-4 native-scroll story-content" 
        ref={scrollAreaRef}
      >
        <div className="space-y-4 max-w-4xl">
          {gameState.messages.map((message, index) => (
            <div key={index} className="space-y-2 fade-in-up">
              {message.type === 'system' && (
                <p className="text-retro-accent text-sm">
                  {message.content}
                </p>
              )}
              {message.type === 'error' && (
                <p className="text-retro-error text-sm">
                  {message.content}
                </p>
              )}
              {message.type === 'narrator' && (
                <div className="text-retro-primary leading-relaxed">
                  <p className="text-retro-secondary mb-2">
                    {isUsingFallback ? 'DEMO NARRATOR:' : 'AI NARRATOR:'}
                  </p>
                  <p className="ml-4 whitespace-pre-wrap">{message.content}</p>
                </div>
              )}
              {message.type === 'user' && (
                <p className="text-retro-secondary ml-8">{message.content}</p>
              )}
            </div>
          ))}
          
          {gameState.isWaitingForResponse && (
            <div className="text-retro-dim">
              <p>
                {isUsingFallback ? 'DEMO NARRATOR' : 'AI NARRATOR'} THINKING
                <span className="blink">_</span>
              </p>
              <div className="mt-2 w-full h-1 bg-retro-bg border border-retro-border">
                <div className="h-full bg-retro-primary loading-bar"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Choices */}
      {gameState.currentChoices.length > 0 && !gameState.isWaitingForResponse && (
        <div className="border-t border-retro-border p-4 bg-retro-bg">
          <p className="text-retro-secondary mb-3">AVAILABLE ACTIONS:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {gameState.currentChoices.map((choice) => (
              <Button
                key={choice.id}
                onClick={() => handleChoice(choice)}
                className="bg-retro-bg border border-retro-border text-retro-primary hover:bg-retro-dim hover:text-retro-primary text-left p-3 h-auto whitespace-normal justify-start retro-button fade-in-up"
              >
                [{choice.id}] {choice.text}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Input */}
      <div className="border-t border-retro-border p-4 bg-retro-bg">
        <form onSubmit={handleUserInput} className="flex gap-2">
          <Input
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your action or command..."
            disabled={gameState.isWaitingForResponse}
            className="flex-1 bg-retro-bg border-retro-border text-retro-primary font-mono placeholder:text-retro-dim"
          />
          <Button
            type="submit"
            disabled={gameState.isWaitingForResponse || !userInput.trim()}
            className="bg-retro-dim border border-retro-border text-retro-primary hover:bg-retro-secondary hover:text-retro-bg px-6 retro-button"
          >
            ► EXECUTE
          </Button>
        </form>
        <p className="text-retro-dim text-xs mt-2">
          TIP: Choose from {isUsingFallback ? 'demo' : 'AI-generated'} actions above or type your own custom command
        </p>
      </div>
    </div>
  );
}