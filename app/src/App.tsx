import { useEffect, useState } from 'react';
import { Inspector } from './ui/Inspector';
import { sfx } from './audio/sfx';
import './App.css';

function App() {
  const [inspectorVisible, setInspectorVisible] = useState(true);

  useEffect(() => {
    // Prime audio for mobile unlock
    sfx.prime();

    // Import and initialize game
    import('./game/main');

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
          id="game-canvas" 
          width="800" 
          height="600" 
          style={{
            border: '5px solid #ff0000',
            display: 'block',
            backgroundColor: '#2c3e50'
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