import './App.css'
import { PlaceImage } from './place';

const SPACETIMEDB_URL = import.meta.env.VITE_SPACETIMEDB_URL || "http://localhost:3001";

function App() {

  return <PlaceImage url={SPACETIMEDB_URL} />;
}

export default App
