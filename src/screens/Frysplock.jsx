import { useState, useEffect } from 'react';
import Produkter from './Produkter';
import Plocklista from './Plocklista';
import NyPlocklista from './NyPlocklista';
import FotaLista from './FotaLista';
import GranskaLista from './GranskaLista';
import { getAllPickLists } from '../storage/pickLists';

export default function Frysplock() {
  const [vy, setVy] = useState('start');
  const [aktivListaId, setAktivListaId] = useState(null);
  const [listor, setListor] = useState([]);
  const [ocrText, setOcrText] = useState('');
  const [ocrBilder, setOcrBilder] = useState([]);
  const [fel, setFel] = useState(null);

  useEffect(() => {
    if (vy !== 'start') return;
    let aktiv = true;
    getAllPickLists().then((alla) => {
      if (aktiv) { setListor(alla.filter((l) => l.status !== 'klar')); setFel(null); }
    }).catch((error) => { if (aktiv) setFel(error.message); });
    return () => { aktiv = false; };
  }, [vy]);

  if (vy === 'produkter') {
    return <Produkter onTillbaka={() => setVy('start')} />;
  }

  if (vy === 'fota') {
    return (
      <FotaLista
        onKlar={(text, bilder) => {
          setOcrText(text);
          setOcrBilder(bilder);
          setVy('granska');
        }}
        onAvbryt={() => setVy('start')}
      />
    );
  }

  if (vy === 'granska') {
    return (
      <GranskaLista
        key={ocrText}
        ocrText={ocrText}
        bilder={ocrBilder}
        onKlar={(id) => {
          setAktivListaId(id);
          setVy('plocklista');
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
      {fel && <p className="fel" role="alert">{fel}</p>}

      <button onClick={() => setVy('fota')} className="knapp-primär">
        Fota plocklista
      </button>

      <button onClick={() => setVy('ny')} className="knapp-sekundär">
        Ny plocklista manuellt
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
