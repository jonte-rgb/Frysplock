import { useState, useEffect } from 'react';
import { getAllProducts } from '../storage/products';
import { getStock, getEventsForProductSorted, addStockEvent } from '../storage/stockEvents';

export default function SaldoVy({ onTillbaka }) {
  const [produkter, setProdukter] = useState([]);
  const [saldon, setSaldon] = useState({});
  const [sök, setSök] = useState('');
  const [valdProdukt, setValdProdukt] = useState(null);
  const [historik, setHistorik] = useState([]);
  const [visarJustering, setVisarJustering] = useState(false);
  const [nyttSaldo, setNyttSaldo] = useState('');

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
    setVisarJustering(false);
    setNyttSaldo('');
    const events = await getEventsForProductSorted(produkt.id);
    setHistorik(events);
  }

  async function sparaJustering() {
    if (!valdProdukt || nyttSaldo === '') return;

    const aktuellt = saldon[valdProdukt.id] ?? 0;
    const nytt = Number(nyttSaldo);
    const skillnad = nytt - aktuellt;

    if (skillnad === 0) {
      setVisarJustering(false);
      return;
    }

    await addStockEvent({
      produktId: valdProdukt.id,
      typ: 'korrigering',
      antal: skillnad,
      enhet: 'plåt',
      källa: 'manuell justering',
    });

    setVisarJustering(false);
    setNyttSaldo('');
    await ladda();
    const events = await getEventsForProductSorted(valdProdukt.id);
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
    const aktuelltSaldo = saldon[valdProdukt.id] ?? 0;

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
            {Math.round(aktuelltSaldo * 10) / 10}
          </p>
          <p className="undertitel">plåtar i lager</p>
        </div>

        {visarJustering ? (
          <div className="justering-panel">
            <label className="undertitel">Ange nytt saldo (plåtar):</label>
            <input
              type="number"
              inputMode="numeric"
              value={nyttSaldo}
              onChange={(e) => setNyttSaldo(e.target.value)}
              className="saldo-input"
              autoFocus
            />
            <div className="knapp-rad">
              <button
                onClick={() => setVisarJustering(false)}
                className="knapp-sekundär"
              >
                Avbryt
              </button>
              <button onClick={sparaJustering} className="knapp-primär">
                Spara
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setNyttSaldo(String(Math.round(aktuelltSaldo * 10) / 10));
              setVisarJustering(true);
            }}
            className="knapp-primär stor"
          >
            Justera saldo
          </button>
        )}

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
      <h1>Saldo</h1>

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