import { useState, useEffect } from 'react';
import { getAllProducts } from '../storage/products';
import { createPickList, addPickListRow } from '../storage/pickLists';

export default function NyPlocklista({ onKlar, onAvbryt }) {
  const [produkter, setProdukter] = useState([]);
  const [valda, setValda] = useState({}); // { produktId: antalStyck }

  useEffect(() => {
    getAllProducts().then(setProdukter);
  }, []);

  function ändraAntal(produktId, antal) {
    setValda((prev) => {
      const ny = { ...prev };
      if (!antal || antal <= 0) {
        delete ny[produktId];
      } else {
        ny[produktId] = antal;
      }
      return ny;
    });
  }

  async function spara() {
    const listaId = await createPickList({status: 'aktiv'});
    for (const [produktId, antal] of Object.entries(valda)) {
      await addPickListRow({
        pickListId: listaId,
        produktId: Number(produktId),
        antalStyck: antal,
        ocrText: null,
      });
    }
    onKlar(listaId);
  }

  const antalValda = Object.keys(valda).length;

  return (
    <div>
      <div className="topprad">
        <button onClick={onAvbryt} className="knapp-sekundär">← Avbryt</button>
        <h1>Ny plocklista</h1>
      </div>

      <ul className="produktlista">
        {produkter.map((p) => (
          <li key={p.id} className="produktrad-med-input">
            <span>{p.namn}</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={valda[p.id] || ''}
              onChange={(e) => ändraAntal(p.id, Number(e.target.value))}
            />
          </li>
        ))}
      </ul>

      <button
        onClick={spara}
        disabled={antalValda === 0}
        className="knapp-primär fast-nederst"
      >
        Spara lista ({antalValda} produkter)
      </button>
    </div>
  );
}