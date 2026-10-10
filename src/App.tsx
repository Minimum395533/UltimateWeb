import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StartScreen from './screens/StartScreen';
import LocalPlayScreen from './screens/LocalPlayScreen';
import LocalMatchScreen from './screens/LocalMatchScreen';
import TrainingScreen from './screens/TrainingScreen';
import KeybindsScreen from './screens/KeybindsScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnlineScreen from './screens/OnlineScreen';
import './App.css';
import './styles/ultimate-theme.css';

const DevFrameDataEditor = import.meta.env.DEV
  ? lazy(() => import('./screens/frame-data/FrameDataEditor'))
  : null;

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/local" element={<LocalPlayScreen />} />
          <Route path="/match" element={<LocalMatchScreen />} />
          <Route path="/training" element={<TrainingScreen />} />
          <Route path="/keybinds" element={<KeybindsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/online" element={<OnlineScreen />} />
          {DevFrameDataEditor && (
            <Route
              path="/dev/frame-data"
              element={(
                <Suspense fallback={<main className="fd-editor">Opening movement editor…</main>}>
                  <DevFrameDataEditor />
                </Suspense>
              )}
            />
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
