import { useState, useEffect, useRef } from 'react';
import { getAllProducts } from '../storage/products';
import { getStock, getEventsForProductSorted, setStock } from '../storage/stockEvents';
import { stockChange } from '../services/stock';
import { formatDecimal } from '../utils/numbers';

async function readStockView() {
  const alla = await getAllProducts();
  const saldoMap = {};
  const errorMap = {};
  await Promise.all(alla.map(async (p) => {
    try { saldoMap[p.id] = await getStock(p.id, p.styckPerPlåt); }
    catch (error) { saldoMap[p.id] = null; errorMap[p.id] = error.message; }
  }));
  return { alla, saldoMap, errorMap };
}

export default function SaldoVy() {
  const [produkter, setProdukter] = useState([]);
  const [saldon, setSaldon] = useState({});
  const [saldoFel, setSaldoFel] = useState({});
  const [sök, setSök] = useState('');
  const [valdProdukt, setValdProdukt] = useState(null);
  const [historik, setHistorik] = useState([]);
  const [visarJustering, setVisarJustering] = useState(false);
  const [nyttSaldo, setNyttSaldo] = useState('');
  const [sparar, setSparar] = useState(false);
  const [fel, setFel] = useState(null);
  const låst = useRef(false);

  async function ladda() {
    const { alla, saldoMap, errorMap } = await readStockView();
    setProdukter(alla); setSaldon(saldoMap); setSaldoFel(errorMap);
  }

  useEffect(() => {
    let aktiv = true;
    readStockView().then(({ alla, saldoMap, errorMap }) => {
      if (aktiv) { setProdukter(alla); setSaldon(saldoMap); setSaldoFel(errorMap); }
    }).catch((error) => { if (aktiv) setFel(error.message); });
    return () => { aktiv = false; };
  }, []);

  async function visaHistorik(produkt) {
    setValdProdukt(produkt); setVisarJustering(false); setNyttSaldo(''); setFel(null); setHistorik([]);
    try { setHistorik(await getEventsForProductSorted(produkt.id)); }
    catch (error) { setFel(error.message); }
  }

  async function sparaJustering() {
    if (!valdProdukt || låst.current) return;
    låst.current = true; setSparar(true); setFel(null);
    try {
      await setStock(valdProdukt.id, nyttSaldo);
      setVisarJustering(false); setNyttSaldo('');
      await ladda();
      setHistorik(await getEventsForProductSorted(valdProdukt.id));
    } catch (error) { setFel(error.message || 'Saldot kunde inte sparas.'); }
    finally { låst.current = false; setSparar(false); }
  }

  function historikRad(event) {
    const labels = { plock: 'Plockat', inlägg: 'Inlagt', bak: 'Bakat', korrigering: 'Korrigerat' };
    let change;
    try { change = stockChange(event, valdProdukt.styckPerPlåt); }
    catch { change = null; }
    return <li key={event.id}>
      <div><strong>{labels[event.typ] || event.typ}</strong>
        <span className="undertitel">{' '}{new Date(event.tidpunkt).toLocaleDateString('sv-SE')}{' '}
          {new Date(event.tidpunkt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <span className={change > 0 ? 'positiv' : change < 0 ? 'negativ' : ''}>
        {change === null ? 'Okänd förändring' : `${change > 0 ? '+' : ''}${formatDecimal(change)} plåtar`}
      </span>
    </li>;
  }

  if (valdProdukt) {
    const saldo = saldon[valdProdukt.id];
    return <div>
      <div className="topprad">
        <button onClick={() => setValdProdukt(null)} disabled={sparar} className="knapp-sekundär">← Tillbaka</button>
        <h1>{valdProdukt.namn}</h1>
      </div>
      {(fel || saldoFel[valdProdukt.id]) && <p className="fel" role="alert">{fel || saldoFel[valdProdukt.id]}</p>}
      <div className="saldo-huvud"><p className="stor-siffra">{formatDecimal(saldo)}</p><p className="undertitel">plåtar i lager</p></div>
      {visarJustering ? <div className="justering-panel">
        <label htmlFor="nytt-saldo" className="undertitel">Ange nytt saldo (plåtar):</label>
        <input id="nytt-saldo" type="text" inputMode="decimal" value={nyttSaldo} placeholder={formatDecimal(saldo)}
          onChange={(e) => setNyttSaldo(e.target.value)} className="saldo-input" autoFocus disabled={sparar} />
        <div className="knapp-rad">
          <button onClick={() => setVisarJustering(false)} disabled={sparar} className="knapp-sekundär">Avbryt</button>
          <button onClick={sparaJustering} disabled={sparar || !nyttSaldo.trim()} className="knapp-primär">{sparar ? 'Sparar...' : 'Spara'}</button>
        </div>
      </div> : <button onClick={() => { setNyttSaldo(''); setVisarJustering(true); }}
        disabled={Boolean(saldoFel[valdProdukt.id])} className="knapp-primär stor">Justera saldo</button>}
      <h2 className="sektionsrubrik">Historik</h2>
      {historik.length === 0 ? <p className="undertitel">Inga händelser än</p> : <ul className="historik-lista">{historik.map(historikRad)}</ul>}
    </div>;
  }

  const filtrerade = produkter.filter((p) => (p.namn || '').toLowerCase().includes(sök.toLowerCase()));
  return <div>
    <h1>Saldo</h1>
    {fel && <p className="fel" role="alert">{fel}</p>}
    <input type="text" placeholder="Sök produkt..." aria-label="Sök produkt" value={sök}
      onChange={(e) => setSök(e.target.value)} className="sökfält" />
    <ul className="produktlista">
      {filtrerade.map((p) => <li key={p.id} onClick={() => visaHistorik(p)}>
        <span>{p.namn}</span><span className="antal">{saldoFel[p.id] ? 'Kontrollera data' : `${formatDecimal(saldon[p.id])} plåtar`}</span>
      </li>)}
    </ul>
  </div>;
}
