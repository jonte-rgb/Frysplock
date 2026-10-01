import { useState, useEffect } from 'react';
import { getPickList, getRowsForPickList } from '../storage/pickLists';
import { getProduct } from '../storage/products';
import { formatDecimal } from '../utils/numbers';
import PlockaProdukt from './PlockaProdukt';
import EfterLista from './EfterLista';

async function readPickList(listaId) {
  const lista = await getPickList(listaId);
  if (!lista) throw new Error('Plocklistan finns inte längre.');
  const rows = await getRowsForPickList(listaId);
  const rader = await Promise.all(rows.map(async (rad) => ({
    ...rad, produkt: await getProduct(rad.produktId),
  })));
  return { lista, rader };
}

export default function Plocklista({ listaId, onTillbaka }) {
  const [lista, setLista] = useState(null);
  const [rader, setRader] = useState([]);
  const [aktivRad, setAktivRad] = useState(null);
  const [visarEfterLista, setVisarEfterLista] = useState(false);
  const [sök, setSök] = useState('');
  const [fel, setFel] = useState(null);

  async function ladda() {
    setFel(null);
    const result = await readPickList(listaId);
    setLista(result.lista);
    setRader(result.rader);
  }

  useEffect(() => {
    let aktiv = true;
    readPickList(listaId).then((result) => {
      if (aktiv) { setLista(result.lista); setRader(result.rader); }
    }).catch((error) => { if (aktiv) setFel(error.message); });
    return () => { aktiv = false; };
  }, [listaId]);

  if (!lista) return <div><button onClick={onTillbaka} className="knapp-sekundär">← Tillbaka</button><p role="alert" className="fel">{fel || 'Laddar...'}</p></div>;

  if (visarEfterLista) {
    return (
      <EfterLista
        listaId={listaId}
        listaDatum={lista.datum}
        onTillbaka={() => setVisarEfterLista(false)}
      />
    );
  }

  if (aktivRad) {
    return (
      <PlockaProdukt
        rad={aktivRad}
        onKlar={async () => {
          setAktivRad(null);
          await ladda().catch((error) => setFel(error.message));
        }}
        onAvbryt={() => setAktivRad(null)}
      />
    );
  }

  const filtrerade = rader.filter((r) =>
    (r.produkt?.namn || 'Okänd').toLowerCase().includes(sök.toLowerCase())
  );

  const allaPlockade = rader.length > 0 && rader.every((r) => r.plockad);

  return (
    <div>
      <div className="topprad">
        <button onClick={onTillbaka} className="knapp-sekundär">← Tillbaka</button>
        <h1>Plocklista {lista.datum}</h1>
      </div>

      {fel && <p className="fel" role="alert">{fel}</p>}

      <button
        onClick={() => setVisarEfterLista(true)}
        className="knapp-sekundär"
        style={{ marginBottom: '1rem', width: '100%' }}
      >
        Visa aktuellt saldo
      </button>

      <input
        type="text"
        placeholder="Sök produkt..."
        value={sök}
        onChange={(e) => setSök(e.target.value)}
        className="sökfält"
      />

      <ul className="produktlista">
        {filtrerade.map((rad) => (
          <li
            key={rad.id}
            className={`plockrad ${rad.plockad ? 'plockad' : ''}`}
          >
            <button className="plockrad-knapp" disabled={rad.plockad} onClick={() => setAktivRad(rad)}>
              <span>{rad.produkt?.namn || 'Okänd'}{rad.plockad ? ' ✓' : ''}</span>
              <span className="antal">{formatDecimal(rad.antalStyck)} st</span>
            </button>
          </li>
        ))}
      </ul>

      {allaPlockade && (
        <button
          onClick={() => setVisarEfterLista(true)}
          className="knapp-primär stor"
        >
          Visa efter-lista
        </button>
      )}
    </div>
  );
}
