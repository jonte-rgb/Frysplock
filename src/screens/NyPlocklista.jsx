import { useState, useEffect, useRef } from 'react';
import { getAllProducts } from '../storage/products';
import { createPickList } from '../storage/pickLists';

export default function NyPlocklista({ onKlar, onAvbryt }) {
  const [produkter, setProdukter] = useState([]);
  const [valda, setValda] = useState({});
  const [sparar, setSparar] = useState(false);
  const [fel, setFel] = useState(null);
  const låst = useRef(false);

  useEffect(() => {
    getAllProducts().then(setProdukter).catch((error) => setFel(error.message));
  }, []);

  function ändraAntal(produktId, antal) {
    setValda((prev) => {
      const ny = { ...prev };
      if (!antal || antal <= 0) delete ny[produktId];
      else ny[produktId] = antal;
      return ny;
    });
  }

  async function spara() {
    if (låst.current) return;
    låst.current = true;
    setSparar(true);
    setFel(null);
    try {
      const listaId = await createPickList({
        status: 'aktiv',
        rader: Object.entries(valda).map(([produktId, antalStyck]) => ({
          produktId: Number(produktId), antalStyck,
        })),
      });
      await onKlar(listaId);
    } catch (error) { setFel(error.message || 'Listan kunde inte sparas.'); }
    finally { låst.current = false; setSparar(false); }
  }

  const antalValda = Object.keys(valda).length;
  return (
    <div>
      <div className="topprad">
        <button onClick={onAvbryt} disabled={sparar} className="knapp-sekundär">← Avbryt</button>
        <h1>Ny plocklista</h1>
      </div>
      {fel && <p className="fel" role="alert">{fel}</p>}
      <ul className="produktlista">
        {produkter.map((p) => <li key={p.id} className="produktrad-med-input">
          <span>{p.namn}</span>
          <input type="number" inputMode="numeric" min="0" step="1" placeholder="0"
            aria-label={`Antal styck ${p.namn}`} value={valda[p.id] || ''} disabled={sparar}
            onChange={(e) => ändraAntal(p.id, Number(e.target.value))} />
        </li>)}
      </ul>
      <button onClick={spara} disabled={antalValda === 0 || sparar} className="knapp-primär fast-nederst">
        {sparar ? 'Sparar...' : `Spara lista (${antalValda} produkter)`}
      </button>
    </div>
  );
}
