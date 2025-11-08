import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Upload } from './pages/Upload';
import { Loading } from './pages/Loading';
import { Results } from './pages/Results';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/loading/:jobId" element={<Loading />} />
        <Route path="/results/:jobId" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
