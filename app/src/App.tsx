import { useEffect } from 'react';
import './App.css';

function App() {
  useEffect(() => {
    import('./game/main');
  }, []);

  return (
    <div id="game-root"></div>
  );
}

export default App
