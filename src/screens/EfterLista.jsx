import { useState, useEffect } from 'react';
import { getRowsForPickList } from '../storage/pickLists';
import { getProduct } from '../storage/products';
import { getStock } from '../storage/stockEvents';
import { formatDecimal } from '../utils/numbers';

export default function EfterLista({ listaId, listaDatum, onTillbaka }) {
  const [rader, setRader] = useState([]);
  const [laddar, setLaddar] = useState(true);
  const [fel, setFel] = useState(null);

  useEffect(() => {
    let aktiv = true;
    async function ladda() {
      try {
        const rows = await getRowsForPickList(listaId);
        const result = await Promise.all(rows.map(async (rad) => {
          const produkt = await getProduct(rad.produktId);
          try {
            if (!produkt) throw new Error('Produkten finns inte längre.');
            return { ...rad, produkt, saldo: await getStock(produkt.id, produkt.styckPerPlåt) };
          } catch (error) { return { ...rad, produkt, saldo: null, fel: error.message }; }
        }));
        if (aktiv) setRader(result);
      } catch (error) { if (aktiv) setFel(error.message); }
      finally { if (aktiv) setLaddar(false); }
    }
    ladda();
    return () => { aktiv = false; };
  }, [listaId]);

  return <div>
    <div className="topprad"><button onClick={onTillbaka} className="knapp-sekundär">← Tillbaka</button><h1>Efter-lista</h1></div>
    <p className="undertitel">Aktuellt saldo · lista {listaDatum}</p>
    {laddar && <p>Laddar...</p>}
    {fel && <p className="fel" role="alert">{fel}</p>}
    <ul className="produktlista">
      {rader.map((rad) => <li key={rad.id} className={rad.plockad ? 'plockad' : ''}>
        <span>{rad.produkt?.namn || 'Okänd'}{rad.fel && <small className="fel">{rad.fel}</small>}</span>
        <span className="antal">{formatDecimal(rad.saldo)} plåtar</span>
      </li>)}
    </ul>
  </div>;
}
