import { useState } from 'react';
import Frysplock from './screens/Frysplock';
import Deg from './screens/Deg';
import InIFrys from './screens/InIFrys';
import Baka from './screens/Baka';
import SaldoVy from './screens/SaldoVy';
import NavIcon from './components/NavIcon';

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
          <NavIcon name="deg" /><span>Deg</span>
        </button>
        <button onClick={() => setAktivFlik('infrys')} className={aktivFlik === 'infrys' ? 'aktiv' : ''}>
          <NavIcon name="infrys" /><span>In i frys</span>
        </button>
        <button onClick={() => setAktivFlik('frysplock')} className={aktivFlik === 'frysplock' ? 'aktiv' : ''}>
          <NavIcon name="frysplock" /><span>Frysplock</span>
        </button>
        <button onClick={() => setAktivFlik('baka')} className={aktivFlik === 'baka' ? 'aktiv' : ''}>
          <NavIcon name="baka" /><span>Baka</span>
        </button>
        <button onClick={() => setAktivFlik('saldo')} className={aktivFlik === 'saldo' ? 'aktiv' : ''}>
          <NavIcon name="saldo" /><span>Saldo</span>
        </button>
      </nav>
    </div>
  );
}

export default App;