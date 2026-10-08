import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StartScreen from './screens/StartScreen';
import LocalPlayScreen from './screens/LocalPlayScreen';
import TrainingScreen from './screens/TrainingScreen';
import KeybindsScreen from './screens/KeybindsScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnlineScreen from './screens/OnlineScreen';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/local" element={<LocalPlayScreen />} />
          <Route path="/training" element={<TrainingScreen />} />
          <Route path="/keybinds" element={<KeybindsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/online" element={<OnlineScreen />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
