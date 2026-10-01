import { useState, useEffect, useRef } from 'react';
import { getAllProducts, addProduct, updateProduct } from '../storage/products';
import { formatDecimal } from '../utils/numbers';

export default function Produkter({ onTillbaka }) {
  const [produkter, setProdukter] = useState([]);
  const [redigerar, setRedigerar] = useState(null);
  const [namn, setNamn] = useState('');
  const [styckPerPlåt, setStyckPerPlåt] = useState('');
  const [sparar, setSparar] = useState(false);
  const [fel, setFel] = useState(null);
  const låst = useRef(false);

  async function ladda() { setProdukter(await getAllProducts()); }
  useEffect(() => {
    let aktiv = true;
    getAllProducts().then((result) => { if (aktiv) setProdukter(result); })
      .catch((error) => { if (aktiv) setFel(error.message); });
    return () => { aktiv = false; };
  }, []);

  function börjaRedigera(produkt) {
    if (låst.current) return;
    setRedigerar(produkt.id);
    setNamn(produkt.namn || '');
    setStyckPerPlåt(String(produkt.styckPerPlåt ?? '').replace('.', ','));
    setFel(null);
  }

  function avbryt() { setRedigerar(null); setNamn(''); setStyckPerPlåt(''); }

  async function spara(e) {
    e.preventDefault();
    if (låst.current) return;
    låst.current = true;
    setSparar(true);
    setFel(null);
    try {
      const data = { namn, styckPerPlåt };
      if (redigerar) await updateProduct(redigerar, data);
      else await addProduct(data);
      avbryt();
      await ladda();
    } catch (error) { setFel(error.message || 'Produkten kunde inte sparas.'); }
    finally { låst.current = false; setSparar(false); }
  }

  return (
    <div>
      <div className="topprad">
        <button onClick={onTillbaka} disabled={sparar} className="knapp-sekundär">← Tillbaka</button>
        <h1>Produkter</h1>
      </div>
      {fel && <p className="fel" role="alert">{fel}</p>}
      <form onSubmit={spara} className="produktform">
        <input type="text" placeholder="Produktnamn" aria-label="Produktnamn" required
          value={namn} onChange={(e) => setNamn(e.target.value)} disabled={sparar} />
        <input type="text" inputMode="decimal" placeholder="Styck per plåt" aria-label="Styck per plåt" required
          value={styckPerPlåt} onChange={(e) => setStyckPerPlåt(e.target.value)} disabled={sparar} />
        <button type="submit" disabled={sparar} className="knapp-primär">
          {sparar ? 'Sparar...' : redigerar ? 'Spara' : 'Lägg till'}
        </button>
        {redigerar && <button type="button" onClick={avbryt} disabled={sparar} className="knapp-sekundär">Avbryt</button>}
      </form>
      <ul className="produktlista">
        {produkter.map((p) => <li key={p.id} onClick={() => börjaRedigera(p)}>
          <span>{p.namn}</span><span className="antal">{formatDecimal(p.styckPerPlåt)} st/plåt</span>
        </li>)}
      </ul>
    </div>
  );
}
