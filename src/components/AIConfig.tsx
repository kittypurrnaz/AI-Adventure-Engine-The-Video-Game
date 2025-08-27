import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { aiService } from '../services/aiService';

interface AIConfigProps {
  onConfigUpdate: (isConfigured: boolean) => void;
}

export function AIConfig({ onConfigUpdate }: AIConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setErrorMessage('Please enter an API key');
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    setErrorMessage('');
    
    // Update the service with new API key
    aiService.updateConfig({ apiKey: apiKey.trim() });
    
    try {
      const isConnected = await aiService.testConnection();
      setTestResult(isConnected ? 'success' : 'error');
      
      if (isConnected) {
        onConfigUpdate(true);
      } else {
        setErrorMessage('Connection failed. Please check your API key.');
      }
    } catch (error) {
      setTestResult('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSkip = () => {
    // Allow users to continue with fallback responses
    onConfigUpdate(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTesting && apiKey.trim()) {
      handleTestConnection();
    }
  };

  return (
    <div className="max-w-md mx-auto bg-retro-bg border border-retro-border p-6 space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-pixel text-retro-primary">AI CONFIGURATION</h2>
        <p className="text-retro-dim text-sm font-mono">
          Configure your Google AI Studio API key for enhanced storytelling
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-retro-secondary text-sm font-mono mb-2">
            Google AI Studio API Key:
          </label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="AIzaSy..."
            className="bg-retro-bg border-retro-border text-retro-primary font-mono"
            disabled={isTesting}
          />
          <p className="text-retro-dim text-xs mt-1">
            Get your API key from: aistudio.google.com
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={!apiKey.trim() || isTesting}
            className="flex-1 bg-retro-dim border border-retro-border text-retro-primary hover:bg-retro-secondary hover:text-retro-bg font-mono retro-button"
          >
            {isTesting ? 'TESTING...' : 'TEST CONNECTION'}
          </Button>
        </div>
        
        {testResult === 'success' && (
          <div className="bg-retro-bg border border-retro-secondary p-3 rounded">
            <p className="text-retro-secondary text-sm font-mono">
              ✓ CONNECTION SUCCESSFUL! Ready to start adventure.
            </p>
          </div>
        )}
        
        {testResult === 'error' && (
          <div className="bg-retro-bg border border-retro-error p-3 rounded">
            <p className="text-retro-error text-sm font-mono">
              ✗ CONNECTION FAILED. {errorMessage || 'Check your API key.'}
            </p>
          </div>
        )}
        
        <div className="border-t border-retro-border pt-4">
          <Button
            onClick={handleSkip}
            className="w-full bg-retro-bg border border-retro-border text-retro-dim hover:bg-retro-dim hover:text-retro-bg font-mono text-sm"
          >
            SKIP (Use Demo Mode)
          </Button>
          <p className="text-retro-dim text-xs mt-2 text-center">
            Demo mode uses fallback responses for testing
          </p>
        </div>
      </div>
      
      <div className="space-y-2 text-retro-dim text-xs font-mono">
        <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        <p>FEATURES WITH API:</p>
        <p>• Dynamic story generation</p>
        <p>• Contextual choices</p>
        <p>• Adaptive narratives</p>
        <p>• Unlimited scenarios</p>
        <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        <p className="text-retro-accent">TIP: Press Enter to test quickly</p>
      </div>
    </div>
  );
}