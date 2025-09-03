import { useState, useEffect } from 'react';
import { stringify } from 'yaml';
import type { GameDSL } from '../dsl/schema';
import { getDSL, applyDslPatch, isDSLInitialized } from '../game/dslRuntime';
import { sfx } from '../audio/sfx';
import { getAbKey } from '../runtime/ab';
import { getSpecLoadResult } from '../game/main';

interface InspectorProps {
  visible: boolean;
}

export function Inspector({ visible }: InspectorProps) {
  const [dsl, setDsl] = useState<GameDSL | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [audioState, setAudioState] = useState(sfx.getState());
  const ab = getAbKey();
  const specResult = getSpecLoadResult();

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

  useEffect(() => {
    // Subscribe to SFX state changes
    const unsubscribe = sfx.subscribe(setAudioState);
    return unsubscribe;
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

  const reloadSpec = () => {
    window.location.reload();
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
      
      {/* Spec Load Status */}
      {specResult && (
        <div style={{ 
          marginBottom: 12, 
          padding: 8, 
          backgroundColor: specResult.validation.success ? 'rgba(0, 128, 0, 0.3)' : 'rgba(255, 165, 0, 0.3)',
          borderRadius: 4,
          fontSize: 10
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            Spec Status: {specResult.source === 'remote' ? '✅ Loaded' : 
                         specResult.source === 'local' ? '🏠 Local' : '⚠️ Fallback'}
          </div>
          {!specResult.validation.success && (
            <div style={{ color: '#ffcc00', marginBottom: 4, fontSize: 9 }}>
              {specResult.validation.error}
            </div>
          )}
          <button
            onClick={reloadSpec}
            style={{
              padding: '2px 6px',
              fontSize: 9,
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer'
            }}
          >
            Reload Spec
          </button>
        </div>
      )}
      
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

        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>
          <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 'bold' }}>Audio</div>
          
          <label style={{ fontSize: 10, display: 'block', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={audioState.mute}
              onChange={(e) => sfx.setMute(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            Mute
          </label>
          
          <label style={{ fontSize: 10, display: 'block', marginBottom: 6 }}>
            Volume:
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audioState.volume}
              onChange={(e) => sfx.setVolume(parseFloat(e.target.value))}
              style={{ width: 140, marginLeft: 8 }}
              disabled={audioState.mute}
            />
            <span style={{ marginLeft: 4, fontSize: 9 }}>
              {Math.round(audioState.volume * 100)}%
            </span>
          </label>

          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <button
              onClick={() => sfx.testJump()}
              style={{
                padding: '2px 6px',
                fontSize: 9,
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer'
              }}
            >
              Test Jump
            </button>
            <button
              onClick={() => sfx.testCrash()}
              style={{
                padding: '2px 6px',
                fontSize: 9,
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer'
              }}
            >
              Test Crash
            </button>
          </div>
        </div>

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
      
      {ab && (
        <div style={{
          position: "fixed", 
          top: 8, 
          right: 8, 
          opacity: 0.6, 
          fontSize: 12, 
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '2px 6px',
          borderRadius: 3,
          color: '#333'
        }}>
          AB:{ab}
        </div>
      )}
    </div>
  );
}