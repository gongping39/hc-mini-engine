import { useEffect, useState, useRef } from 'react';
import { Inspector } from './ui/Inspector';
import { sfx } from './audio/sfx';
import './App.css';

function App() {
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Don't prime audio immediately - wait for user interaction
    // sfx.prime();

    // Import and initialize game AFTER the canvas is definitely in the DOM
    const initGame = () => {
      if (canvasRef.current) {
        console.log('Canvas ref is ready, starting game initialization...'); 
        console.log('Canvas element:', canvasRef.current);
        import('./game/main');
      } else {
        console.log('Canvas ref not ready, retrying...');
        setTimeout(initGame, 50);
      }
    };
    
    setTimeout(initGame, 100);

    // Handle 'I' key toggle
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'i') {
        setInspectorVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div id="game-root">
        <canvas 
          ref={canvasRef}
          id="game-canvas" 
          width="800" 
          height="600" 
          style={{
            border: '5px solid #ff0000',
            display: 'block',
            backgroundColor: '#2c3e50'
          }}
          onClick={() => {
            // Initialize audio on first user interaction
            sfx.prime();
          }}
        >
          Your browser does not support the canvas element.
        </canvas>
      </div>
      <Inspector visible={inspectorVisible} />
    </>
  );
}

export default App;