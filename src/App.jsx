import { useState } from 'react';
import Frysplock from './screens/Frysplock';
import Deg from './screens/Deg';
import InIFrys from './screens/InIFrys';
import Baka from './screens/Baka';
import SaldoVy from './screens/SaldoVy';

function App() {
  const [aktivFlik, setAktivFlik] = useState('frysplock');

  function renderaSkärm() {
    if (aktivFlik === 'deg') return <Deg />;
    if (aktivFlik === 'infrys') return <InIFrys />;
    if (aktivFlik === 'frysplock') return <Frysplock />;
    if (aktivFlik === 'baka') return <Baka />;
    if (aktivFlik === 'saldo') return <SaldoVy />;
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
        <button onClick={() => setAktivFlik('saldo')} className={aktivFlik === 'saldo' ? 'aktiv' : ''}>
          Saldo
        </button>
      </nav>
    </div>
  );
}

export default App;