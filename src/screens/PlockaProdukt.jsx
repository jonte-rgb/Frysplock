import { useRef, useState } from 'react';
import { completePick } from '../services/picking';
import { styckTillPlåtar } from '../services/productUnits';
import { validateProduct } from '../services/productValidation';
import { getStock } from '../storage/stockEvents';
import { formatDecimal, validatePieceCount, validateStockCount } from '../utils/numbers';

export default function PlockaProdukt({ rad, onKlar, onAvbryt }) {
  const [steg, setSteg] = useState('plocka');
  const [förväntatSaldo, setFörväntatSaldo] = useState(null);
  const [faktisktSaldo, setFaktisktSaldo] = useState('');
  const [upptagen, setUpptagen] = useState(false);
  const [fel, setFel] = useState(null);
  const låst = useRef(false);

  let produkt;
  let plåtarAttPlocka;
  let produktFel;
  try {
    produkt = validateProduct(rad.produkt);
    plåtarAttPlocka = styckTillPlåtar(produkt, validatePieceCount(rad.antalStyck));
  } catch (error) { produktFel = error.message; }

  async function utför(action) {
    if (låst.current) return;
    låst.current = true;
    setUpptagen(true);
    setFel(null);
    try { await action(); }
    catch (error) { setFel(error.message || 'Plocket kunde inte sparas. Försök igen.'); }
    finally { låst.current = false; setUpptagen(false); }
  }

  function bekräftaPlockad() {
    return utför(async () => {
      const saldo = await getStock(produkt.id, produkt.styckPerPlåt);
      setFörväntatSaldo(saldo - plåtarAttPlocka);
      setSteg('saldo');
    });
  }

  function bekräftaSaldo(korrigera = false) {
    return utför(async () => {
      await completePick({
        rowId: rad.id,
        faktisktSaldo: korrigera ? validateStockCount(faktisktSaldo) : null,
      });
      await onKlar();
    });
  }

  if (produktFel || rad.plockad) {
    return <div><button onClick={onAvbryt} className="knapp-sekundär">← Tillbaka</button>
      <p className="fel" role="alert">{rad.plockad ? 'Raden är redan plockad.' : `${produktFel} Kontrollera produkten i Hantera produkter.`}</p>
    </div>;
  }

  return (
    <div>
      <div className="topprad">
        <button onClick={onAvbryt} disabled={upptagen} className="knapp-sekundär">← Avbryt</button>
        <h1>{produkt.namn}</h1>
      </div>
      {fel && <p className="fel" role="alert">{fel}</p>}

      {steg === 'plocka' ? <>
        <div className="plock-info">
          <p className="stor-siffra">{formatDecimal(rad.antalStyck)} st</p>
          <p className="undertitel">= {formatDecimal(plåtarAttPlocka)} plåtar</p>
        </div>
        <button onClick={bekräftaPlockad} disabled={upptagen} className="knapp-primär stor">
          {upptagen ? 'Laddar saldo...' : 'Plockad'}
        </button>
      </> : <>
        <div className="plock-info">
          <p>Förväntat saldo efter plock:</p>
          <p className="stor-siffra">{formatDecimal(förväntatSaldo)} plåtar</p>
          <p className="undertitel">Stämmer det?</p>
        </div>
        <button onClick={() => bekräftaSaldo()} disabled={upptagen} className="knapp-primär stor">
          {upptagen ? 'Sparar...' : 'Ja, stämmer'}
        </button>
        <div className="korrigering">
          <label htmlFor="faktiskt-saldo">Nej, faktiskt saldo (plåtar):</label>
          <input id="faktiskt-saldo" type="text" inputMode="decimal" value={faktisktSaldo}
            onChange={(e) => setFaktisktSaldo(e.target.value)} placeholder="0" disabled={upptagen} />
          <button onClick={() => bekräftaSaldo(true)} disabled={!faktisktSaldo.trim() || upptagen} className="knapp-sekundär">
            Spara korrigering
          </button>
        </div>
      </>}
    </div>
  );
}
