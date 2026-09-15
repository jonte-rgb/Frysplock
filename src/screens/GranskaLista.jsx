import { useState, useEffect } from 'react';
import { getAllProducts } from '../storage/products';
import { createPickList, addPickListRow } from '../storage/pickLists';
import { parseOcrText } from '../utils/parseOcr';

export default function GranskaLista({ ocrText, bilder, onKlar, onAvbryt }) {
  const [rader, setRader] = useState([]);
  const [produkter, setProdukter] = useState([]);

  useEffect(() => {
    const tolkade = parseOcrText(ocrText);
    setRader(tolkade);
    getAllProducts().then(setProdukter);
  }, [ocrText]);

  function matchaProdukt(namn) {
    const lower = namn.toLowerCase();
    return produkter.find(
      (p) =>
        p.namn.toLowerCase() === lower ||
        p.alias?.some((a) => a.toLowerCase() === lower)
    );
  }

  function ändraRad(index, fält, värde) {
    setRader((prev) => {
      const ny = [...prev];
      ny[index] = { ...ny[index], [fält]: värde };
      return ny;
    });
  }

  function taBortRad(index) {
    setRader((prev) => prev.filter((_, i) => i !== index));
  }

  function läggTillRad() {
    setRader((prev) => [...prev, { namn: '', antal: 0 }]);
  }

  async function spara() {
    const giltiga = rader.filter((r) => r.namn.trim() && r.antal > 0);
    if (giltiga.length === 0) return;

    const listaId = await createPickList({ bilder });

    for (const rad of giltiga) {
      const produkt = matchaProdukt(rad.namn);
      if (!produkt) continue;

      await addPickListRow({
        pickListId: listaId,
        produktId: produkt.id,
        antalStyck: rad.antal,
        ocrText: rad.namn,
      });
    }

    onKlar(listaId);
  }

  const antalGiltiga = rader.filter(
    (r) => r.namn.trim() && r.antal > 0 && matchaProdukt(r.namn)
  ).length;

  return (
    <div>
      <div className="topprad">
        <button onClick={onAvbryt} className="knapp-sekundär">← Avbryt</button>
        <h1>Granska lista</h1>
      </div>

      <p className="undertitel">
        {antalGiltiga} av {rader.length} rader matchade produkter
      </p>

      <ul className="granska-lista">
        {rader.map((rad, i) => {
          const match = matchaProdukt(rad.namn);
          return (
            <li key={i} className={match ? 'matchad' : 'omatchad'}>
              <div className="granska-rad">
                <input
                  type="text"
                  value={rad.namn}
                  onChange={(e) => ändraRad(i, 'namn', e.target.value)}
                  placeholder="Produktnamn"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={rad.antal || ''}
                  onChange={(e) => ändraRad(i, 'antal', Number(e.target.value))}
                  placeholder="0"
                />
                <button onClick={() => taBortRad(i)} className="ta-bort">×</button>
              </div>
              {!match && rad.namn && (
                <p className="varning">Ingen matchning i produktregistret</p>
              )}
            </li>
          );
        })}
      </ul>

      <button onClick={läggTillRad} className="knapp-sekundär">
        + Lägg till rad
      </button>

      <button
        onClick={spara}
        disabled={antalGiltiga === 0}
        className="knapp-primär stor"
      >
        Spara lista ({antalGiltiga} produkter)
      </button>
    </div>
  );
}