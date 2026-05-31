import { HashRouter, Routes, Route } from 'react-router-dom';
import { MainMenu } from './pages/MainMenu';
import { GameView } from './pages/GameView';
import { NewGame } from './pages/NewGame';
import { LoadGame } from './pages/LoadGame';
import { Settings } from './pages/Settings';
import { Credits } from './pages/Credits';
import { GameProvider } from './app/GameProvider';
import { ThemeProvider } from './app/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider>
      <GameProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/new-game" element={<NewGame />} />
            <Route path="/load-game" element={<LoadGame />} />
            <Route path="/game" element={<GameView />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/credits" element={<Credits />} />
          </Routes>
        </HashRouter>
      </GameProvider>
    </ThemeProvider>
  );
}
