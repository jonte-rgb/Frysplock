import { useState } from 'react';
import Frysplock from './screens/Frysplock';
import Deg from './screens/Deg';
import InIFrys from './screens/InIFrys';
import Baka from './screens/Baka';

function App() {
  const [aktivFlik, setAktivFlik] = useState('frysplock');

  function renderaSkärm() {
    if (aktivFlik === 'deg') return <Deg />;
    if (aktivFlik === 'infrys') return <InIFrys />;
    if (aktivFlik === 'frysplock') return <Frysplock />;
    if (aktivFlik === 'baka') return <Baka />;
  }

  return (
    <div className="app">
      <main className="innehall">{renderaSkärm()}</main>

      <nav className="flikar">
        <button onClick={() => setAktivFlik('deg')} className={aktivFlik === 'deg' ? 'aktiv' : ''}>
          Deg
        </button>
        <button onClick={() => setAktivFlik('infrys')} className={aktivFlik === 'infrys' ? 'aktiv' : ''}>
          In i frys
        </button>
        <button onClick={() => setAktivFlik('frysplock')} className={aktivFlik === 'frysplock' ? 'aktiv' : ''}>
          Frysplock
        </button>
        <button onClick={() => setAktivFlik('baka')} className={aktivFlik === 'baka' ? 'aktiv' : ''}>
          Baka
        </button>
      </nav>
    </div>
  );
}

export default App;