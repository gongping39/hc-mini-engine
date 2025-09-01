import { useState, useEffect } from 'react';
import { stringify } from 'yaml';
import type { GameDSL } from '../dsl/schema';
import { getDSL, applyDslPatch, isDSLInitialized } from '../game/dslRuntime';

interface InspectorProps {
  visible: boolean;
}

export function Inspector({ visible }: InspectorProps) {
  const [dsl, setDsl] = useState<GameDSL | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    // DSLが初期化されるまで待つ
    const initializeDSL = () => {
      if (isDSLInitialized()) {
        try {
          const currentDsl = getDSL();
          setDsl(currentDsl);
          // Initialize input values from DSL
          setInputValues({
            gravityY: currentDsl.gravityY.toString(),
            playerJump: currentDsl.playerJump.toString(),
            spawnIntervalMs: currentDsl.spawnIntervalMs.toString(),
            obstacleSpeed: currentDsl.obstacleSpeed.toString(),
            loseBelowY: currentDsl.loseBelowY.toString(),
          });
          return true;
        } catch (error) {
          console.error('Error getting DSL:', error);
          return false;
        }
      }
      return false;
    };

    // 初回試行
    if (!initializeDSL()) {
      console.log('DSL not initialized yet, retrying...');
      
      // 定期的にリトライ
      const interval = setInterval(() => {
        if (initializeDSL()) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, []);

  const handleInputChange = (field: keyof GameDSL, inputValue: string) => {
    if (!dsl) return;
    
    // Update input value state to preserve user's input (including empty string, minus sign, etc.)
    setInputValues(prev => ({ ...prev, [field]: inputValue }));
    
    // Parse the number for DSL updates
    const numValue = parseFloat(inputValue);
    
    // Only update DSL if the parsed value is a valid number
    if (!isNaN(numValue)) {
      console.log(`Inspector: Changing ${field} from ${dsl[field]} to ${numValue}`);
      const newDsl = { ...dsl, [field]: numValue };
      setDsl(newDsl);
      applyDslPatch({ [field]: numValue });
    }
  };

  const exportToClipboard = async () => {
    if (!dsl) return;
    try {
      const yamlText = stringify(dsl);
      await navigator.clipboard.writeText(yamlText);
      alert('YAML copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard');
    }
  };

  if (!visible || !dsl) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      width: 250,
      padding: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      borderRadius: 8,
      fontSize: 12,
      fontFamily: 'monospace',
      zIndex: 1000,
      border: '1px solid rgba(255, 255, 255, 0.3)'
    }}>
      <div style={{ marginBottom: 12, fontWeight: 'bold' }}>Game Inspector</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label>
          Gravity Y:
          <input
            type="text"
            value={inputValues.gravityY || ''}
            onChange={(e) => handleInputChange('gravityY', e.target.value)}
            placeholder="Enter number..."
            style={{ width: '100%', marginLeft: 8, padding: 2 }}
          />
        </label>

        <label>
          Player Jump:
          <input
            type="text"
            value={inputValues.playerJump || ''}
            onChange={(e) => handleInputChange('playerJump', e.target.value)}
            placeholder="Enter number..."
            style={{ width: '100%', marginLeft: 8, padding: 2 }}
          />
        </label>

        <label>
          Spawn Interval (ms):
          <input
            type="text"
            value={inputValues.spawnIntervalMs || ''}
            onChange={(e) => handleInputChange('spawnIntervalMs', e.target.value)}
            placeholder="Enter number..."
            style={{ width: '100%', marginLeft: 8, padding: 2 }}
          />
        </label>

        <label>
          Obstacle Speed:
          <input
            type="text"
            value={inputValues.obstacleSpeed || ''}
            onChange={(e) => handleInputChange('obstacleSpeed', e.target.value)}
            placeholder="Enter number..."
            style={{ width: '100%', marginLeft: 8, padding: 2 }}
          />
        </label>

        <label>
          Lose Below Y:
          <input
            type="text"
            value={inputValues.loseBelowY || ''}
            onChange={(e) => handleInputChange('loseBelowY', e.target.value)}
            placeholder="Enter number..."
            style={{ width: '100%', marginLeft: 8, padding: 2 }}
          />
        </label>

        <button
          onClick={exportToClipboard}
          style={{
            marginTop: 8,
            padding: '4px 8px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 11
          }}
        >
          Export YAML
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, opacity: 0.7 }}>
        Press 'I' to toggle inspector
      </div>
    </div>
  );
}