import { useEffect, useState } from 'react';
import { Inspector } from './ui/Inspector';
import './App.css';

function App() {
  const [inspectorVisible, setInspectorVisible] = useState(true);

  useEffect(() => {
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