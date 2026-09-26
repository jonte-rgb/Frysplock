import { useState, useEffect } from 'react';
import { getAllProducts } from '../storage/products';
import { getStock, getEventsForProductSorted } from '../storage/stockEvents';

export default function SaldoVy({ onTillbaka }) {
  const [produkter, setProdukter] = useState([]);
  const [saldon, setSaldon] = useState({});
  const [sök, setSök] = useState('');
  const [valdProdukt, setValdProdukt] = useState(null);
  const [historik, setHistorik] = useState([]);

  async function ladda() {
    const alla = await getAllProducts();
    setProdukter(alla);

    const saldoMap = {};
    for (const p of alla) {
      saldoMap[p.id] = await getStock(p.id, p.styckPerPlåt);
    }
    setSaldon(saldoMap);
  }

  useEffect(() => {
    ladda();
  }, []);

  async function visaHistorik(produkt) {
    setValdProdukt(produkt);
    const events = await getEventsForProductSorted(produkt.id);
    setHistorik(events);
  }

  function typText(typ) {
    if (typ === 'plock') return 'Plockat';
    if (typ === 'inlägg') return 'Inlagt';
    if (typ === 'bak') return 'Bakat';
    if (typ === 'korrigering') return 'Korrigerat';
    return typ;
  }

  if (valdProdukt) {
    return (
      <div>
        <div className="topprad">
          <button onClick={() => setValdProdukt(null)} className="knapp-sekundär">
            ← Tillbaka
          </button>
          <h1>{valdProdukt.namn}</h1>
        </div>

        <div className="saldo-huvud">
          <p className="stor-siffra">
            {Math.round((saldon[valdProdukt.id] ?? 0) * 10) / 10}
          </p>
          <p className="undertitel">plåtar i lager</p>
        </div>

        <h2 className="sektionsrubrik">Historik</h2>

        {historik.length === 0 ? (
          <p className="undertitel">Inga händelser än</p>
        ) : (
          <ul className="historik-lista">
            {historik.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{typText(e.typ)}</strong>
                  <span className="undertitel">
                    {' '}
                    {new Date(e.tidpunkt).toLocaleDateString('sv-SE')}{' '}
                    {new Date(e.tidpunkt).toLocaleTimeString('sv-SE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span className={e.antal > 0 ? 'positiv' : 'negativ'}>
                  {e.antal > 0 ? '+' : ''}
                  {Math.round(e.antal * 10) / 10} {e.enhet}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const filtrerade = produkter.filter((p) =>
    p.namn.toLowerCase().includes(sök.toLowerCase())
  );

  return (
    <div>
      <div className="topprad">
        <button onClick={onTillbaka} className="knapp-sekundär">← Tillbaka</button>
        <h1>Saldo</h1>
      </div>

      <input
        type="text"
        placeholder="Sök produkt..."
        value={sök}
        onChange={(e) => setSök(e.target.value)}
        className="sökfält"
      />

      <ul className="produktlista">
        {filtrerade.map((p) => (
          <li key={p.id} onClick={() => visaHistorik(p)}>
            <span>{p.namn}</span>
            <span className="antal">
              {Math.round((saldon[p.id] ?? 0) * 10) / 10} plåtar
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}