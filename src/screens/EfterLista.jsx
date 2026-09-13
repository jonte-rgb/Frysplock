import { useState, useEffect } from 'react';
import { getRowsForPickList } from '../storage/pickLists';
import { getProduct } from '../storage/products';
import { getStock } from '../storage/stockEvents';

export default function EfterLista({ listaId, listaDatum, onTillbaka }) {
  const [rader, setRader] = useState([]);
  const [laddar, setLaddar] = useState(true);

  async function ladda() {
    setLaddar(true);
    const r = await getRowsForPickList(listaId);
    const medSaldo = await Promise.all(
      r.map(async (rad) => {
        const produkt = await getProduct(rad.produktId);
        const saldo = produkt
          ? await getStock(produkt.id, produkt.styckPerPlåt)
          : 0;
        return { ...rad, produkt, saldo };
      })
    );
    setRader(medSaldo);
    setLaddar(false);
  }

  useEffect(() => {
    ladda();
  }, [listaId]);

  if (laddar) return <div>Laddar...</div>;

  return (
    <div>
      <div className="topprad">
        <button onClick={onTillbaka} className="knapp-sekundär">← Tillbaka</button>
        <h1>Efter-lista</h1>
      </div>

      <p className="undertitel">Saldo efter plock {listaDatum}</p>

      <ul className="produktlista">
        {rader.map((rad) => (
          <li key={rad.id} className={rad.plockad ? 'plockad' : ''}>
            <span>{rad.produkt?.namn || 'Okänd'}</span>
            <span className="antal">
              {Math.round(rad.saldo * 10) / 10} plåtar
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}