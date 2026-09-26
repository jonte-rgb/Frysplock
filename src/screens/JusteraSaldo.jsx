import { useState, useEffect } from 'react';
import { getAllProducts } from '../storage/products';
import { getStock, addStockEvent } from '../storage/stockEvents';

export default function JusteraSaldo({ onTillbaka }) {
  const [produkter, setProdukter] = useState([]);
  const [saldon, setSaldon] = useState({});
  const [valdProdukt, setValdProdukt] = useState(null);
  const [nyttSaldo, setNyttSaldo] = useState('');
  const [sök, setSök] = useState('');

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

  function väljProdukt(produkt) {
    setValdProdukt(produkt);
    const aktuellt = saldon[produkt.id] ?? 0;
    setNyttSaldo(String(Math.round(aktuellt * 10) / 10));
  }

  async function spara() {
    if (!valdProdukt || nyttSaldo === '') return;

    const aktuellt = saldon[valdProdukt.id] ?? 0;
    const nytt = Number(nyttSaldo);
    const skillnad = nytt - aktuellt;

    if (skillnad === 0) {
      setValdProdukt(null);
      return;
    }

    await addStockEvent({
      produktId: valdProdukt.id,
      typ: 'korrigering',
      antal: skillnad,
      enhet: 'plåt',
      källa: 'manuell justering',
    });

    setValdProdukt(null);
    setNyttSaldo('');
    await ladda();
  }

  const filtrerade = produkter.filter((p) =>
    p.namn.toLowerCase().includes(sök.toLowerCase())
  );

  if (valdProdukt) {
    return (
      <div>
        <div className="topprad">
          <button onClick={() => setValdProdukt(null)} className="knapp-sekundär">
            ← Avbryt
          </button>
          <h1>{valdProdukt.namn}</h1>
        </div>

        <div className="plock-info">
          <p>Ange nytt saldo (plåtar):</p>
          <input
            type="number"
            inputMode="numeric"
            value={nyttSaldo}
            onChange={(e) => setNyttSaldo(e.target.value)}
            className="saldo-input"
            autoFocus
          />
          <p className="undertitel">
            Nuvarande i appen: {Math.round((saldon[valdProdukt.id] ?? 0) * 10) / 10} plåtar
          </p>
        </div>

        <button onClick={spara} className="knapp-primär stor">
          Spara
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="topprad">
        <button onClick={onTillbaka} className="knapp-sekundär">← Tillbaka</button>
        <h1>Justera saldo</h1>
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
          <li key={p.id} onClick={() => väljProdukt(p)}>
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