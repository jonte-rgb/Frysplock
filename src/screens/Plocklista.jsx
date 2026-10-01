import { useState, useEffect } from 'react';
import { getPickList, getRowsForPickList, updatePickListStatus } from '../storage/pickLists';
import { getProduct } from '../storage/products';
import PlockaProdukt from './PlockaProdukt';
import EfterLista from './EfterLista';

export default function Plocklista({ listaId, onTillbaka }) {
  const [lista, setLista] = useState(null);
  const [rader, setRader] = useState([]);
  const [aktivRad, setAktivRad] = useState(null);
  const [visarEfterLista, setVisarEfterLista] = useState(false);
  const [sök, setSök] = useState('');

  async function ladda() {
    const l = await getPickList(listaId);
    const r = await getRowsForPickList(listaId);
    const medProdukt = await Promise.all(
      r.map(async (rad) => ({
        ...rad,
        produkt: await getProduct(rad.produktId),
      }))
    );
    setLista(l);
    setRader(medProdukt);
  }

  useEffect(() => {
    ladda();
  }, [listaId]);

  useEffect(() => {
    if (rader.length > 0 && rader.every((r) => r.plockad) && lista?.status !== 'klar') {
      updatePickListStatus(listaId, 'klar');
    }
  }, [rader, lista]);

  if (!lista) return <div>Laddar...</div>;

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
          await ladda();
        }}
        onAvbryt={() => setAktivRad(null)}
      />
    );
  }

  const filtrerade = rader.filter((r) =>
    r.produkt?.namn?.toLowerCase().includes(sök.toLowerCase())
  );

  const allaPlockade = rader.length > 0 && rader.every((r) => r.plockad);

  return (
    <div>
      <div className="topprad">
        <button onClick={onTillbaka} className="knapp-sekundär">← Tillbaka</button>
        <h1>Plocklista {lista.datum}</h1>
      </div>

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
            onClick={() => setAktivRad(rad)}
            className={rad.plockad ? 'plockad' : ''}
          >
            <span>{rad.produkt?.namn || 'Okänd'}</span>
            <span className="antal">{rad.antalStyck} st</span>
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