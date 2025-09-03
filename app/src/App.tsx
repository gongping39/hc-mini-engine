import { useEffect, useState } from 'react';
import { Inspector } from './ui/Inspector';
import { sfx } from './audio/sfx';
import './App.css';

function App() {
  const [inspectorVisible, setInspectorVisible] = useState(true);

  useEffect(() => {
    // Don't prime audio immediately - wait for user interaction
    // sfx.prime();

    // Initialize game
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
      <div 
        id="game-root"
        style={{
          width: '800px',
          height: '600px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: '#2c3e50'
        }}
        onClick={() => {
          // Initialize audio on first user interaction
          sfx.prime();
        }}
      ></div>
      <Inspector visible={inspectorVisible} />
    </>
  );
}

export default App;