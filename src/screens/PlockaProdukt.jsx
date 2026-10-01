import { useState } from 'react';
import { completePick } from '../services/picking';
import { getStock } from '../storage/stockEvents';

export default function PlockaProdukt({ rad, onKlar, onAvbryt }) {
  const [steg, setSteg] = useState('plocka');
  const [förväntatSaldo, setFörväntatSaldo] = useState(null);
  const [faktisktSaldo, setFaktisktSaldo] = useState('');

  const produkt = rad.produkt;
  const styckPerPlåt = produkt.styckPerPlåt;
  const plåtarAttPlocka = rad.antalStyck / styckPerPlåt;

  async function bekräftaPlockad() {
    const saldo = await getStock(produkt.id, styckPerPlåt);
    setFörväntatSaldo(saldo - plåtarAttPlocka);
    setSteg('saldo');
  }

  async function bekräftaSaldo(avvikelse = null) {
    await completePick({
      rowId: rad.id,
      produkt,
      antalStyck: rad.antalStyck,
      faktisktSaldo: avvikelse,
    });
    onKlar();
  }

  if (steg === 'plocka') {
    return (
      <div>
        <div className="topprad">
          <button onClick={onAvbryt} className="knapp-sekundär">← Avbryt</button>
          <h1>{produkt.namn}</h1>
        </div>

        <div className="plock-info">
          <p className="stor-siffra">{rad.antalStyck} st</p>
          <p className="undertitel">= {plåtarAttPlocka} plåtar</p>
        </div>

        <button onClick={bekräftaPlockad} className="knapp-primär stor">
          Plockad
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="topprad">
        <button onClick={onAvbryt} className="knapp-sekundär">← Avbryt</button>
        <h1>{produkt.namn}</h1>
      </div>

      <div className="plock-info">
        <p>Förväntat saldo efter plock:</p>
        <p className="stor-siffra">{förväntatSaldo} plåtar</p>
        <p className="undertitel">Stämmer det?</p>
      </div>

      <button
        onClick={() => bekräftaSaldo(null)}
        className="knapp-primär stor"
      >
        Ja, stämmer
      </button>

      <div className="korrigering">
        <label>Nej, faktiskt saldo:</label>
        <input
          type="number"
          inputMode="numeric"
          value={faktisktSaldo}
          onChange={(e) => setFaktisktSaldo(e.target.value)}
          placeholder="0"
        />
        <button
          onClick={() => bekräftaSaldo(Number(faktisktSaldo))}
          disabled={faktisktSaldo === ''}
          className="knapp-sekundär"
        >
          Spara korrigering
        </button>
      </div>
    </div>
  );
}