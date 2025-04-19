import './App.css'
import { PlaceImage } from './place'

function App() {
  return (
    <div className="place-container">
      <PlaceImage url={"http://localhost:3001"} pixelScale={25}/>
    </div>
  )
}

export default App
