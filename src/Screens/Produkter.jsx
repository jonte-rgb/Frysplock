import { useState, useEffect } from 'react';
import { getAllProducts, addProduct, updateProduct } from '../storage/products';

export default function Produkter({ onTillbaka }) {
  const [produkter, setProdukter] = useState([]);
  const [redigerar, setRedigerar] = useState(null);
  const [namn, setNamn] = useState('');
  const [styckPerPlåt, setStyckPerPlåt] = useState('');

  async function ladda() {
    setProdukter(await getAllProducts());
  }

  useEffect(() => {
    ladda();
  }, []);

  function börjaRedigera(produkt) {
    setRedigerar(produkt.id);
    setNamn(produkt.namn);
    setStyckPerPlåt(String(produkt.styckPerPlåt));
  }

  function avbryt() {
    setRedigerar(null);
    setNamn('');
    setStyckPerPlåt('');
  }

  async function spara(e) {
    e.preventDefault();
    if (!namn.trim() || !styckPerPlåt) return;

    const data = {
      namn: namn.trim(),
      styckPerPlåt: Number(styckPerPlåt),
    };

    if (redigerar) {
      await updateProduct(redigerar, data);
    } else {
      await addProduct(data);
    }

    avbryt();
    ladda();
  }

  return (
    <div>
      <div className="topprad">
        <button onClick={onTillbaka} className="knapp-sekundär">← Tillbaka</button>
        <h1>Produkter</h1>
      </div>

      <form onSubmit={spara} className="produktform">
        <input
          type="text"
          placeholder="Produktnamn"
          value={namn}
          onChange={(e) => setNamn(e.target.value)}
        />
        <input
          type="number"
          placeholder="Styck per plåt"
          value={styckPerPlåt}
          onChange={(e) => setStyckPerPlåt(e.target.value)}
          inputMode="numeric"
        />
        <button type="submit" className="knapp-primär">
          {redigerar ? 'Spara' : 'Lägg till'}
        </button>
        {redigerar && (
          <button type="button" onClick={avbryt} className="knapp-sekundär">
            Avbryt
          </button>
        )}
      </form>

      <ul className="produktlista">
        {produkter.map((p) => (
          <li key={p.id} onClick={() => börjaRedigera(p)}>
            <span>{p.namn}</span>
            <span className="antal">{p.styckPerPlåt} st/plåt</span>
          </li>
        ))}
      </ul>
    </div>
  );
}