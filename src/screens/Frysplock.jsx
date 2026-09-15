import FotaLista from './FotaLista';
import { useState, useEffect } from 'react';
import Produkter from './Produkter';
import Plocklista from './Plocklista';
import NyPlocklista from './NyPlocklista';
import { getAllPickLists } from '../storage/pickLists';

export default function Frysplock() {
  const [vy, setVy] = useState('start');
  const [aktivListaId, setAktivListaId] = useState(null);
  const [listor, setListor] = useState([]);

  async function laddaListor() {
    setListor(await getAllPickLists());
  }

  useEffect(() => {
    if (vy === 'start') laddaListor();
  }, [vy]);

  if (vy === 'produkter') {
    return <Produkter onTillbaka={() => setVy('start')} />;
  }

  if (vy === 'fota') {
  return (
    <FotaLista
      onKlar={(text, bilder) => {
        console.log('OCR-text:', text);
        // Här bygger vi granskningsskärmen sen
        setVy('start');
      }}
      onAvbryt={() => setVy('start')}
    />
  );
}

if (vy === 'ny') {
  return (
    <NyPlocklista
      onKlar={(id) => {
        setAktivListaId(id);
        setVy('plocklista');
      }}
      onAvbryt={() => setVy('start')}
    />
  );
}

  if (vy === 'plocklista') {
    return (
      <Plocklista
        listaId={aktivListaId}
        onTillbaka={() => setVy('start')}
      />
    );
  }

  return (
    <div>
      <h1>Frysplock</h1>

      <button onClick={() => setVy('ny')} className="knapp-primär">
        Ny plocklista
      </button>
	
<button onClick={() => setVy('fota')} className="knapp-primär">
  Fota plocklista
</button>

      {listor.length > 0 && (
        <>
          <h2 className="sektionsrubrik">Aktiva listor</h2>
          <ul className="produktlista">
            {listor.map((l) => (
              <li
                key={l.id}
                onClick={() => {
                  setAktivListaId(l.id);
                  setVy('plocklista');
                }}
              >
                <span>{l.datum}</span>
                <span className="antal">{l.status}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="sektionsrubrik">Inställningar</h2>
      <button onClick={() => setVy('produkter')} className="knapp-sekundär">
        Hantera produkter
      </button>
    </div>
  );
}