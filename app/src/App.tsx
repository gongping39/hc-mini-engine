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
      <div id="game-root"></div>
      <Inspector visible={inspectorVisible} />
    </>
  );
}

export default App;