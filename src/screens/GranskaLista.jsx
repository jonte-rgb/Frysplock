import { useState, useEffect, useRef } from 'react';
import { getAllProducts, addProduct, getProduct } from '../storage/products';
import { createPickList } from '../storage/pickLists';
import { findExactProduct, normalizeProductName, validateProduct } from '../services/productValidation';
import { validatePieceCount } from '../utils/numbers';
import { parseOcrText } from '../utils/parseOcr';

function reviewRows(text) {
  return parseOcrText(text).map((rad, index) => ({
    ...rad, id: `ocr-${index}`, antal: rad.antal === null ? '' : String(rad.antal),
    produktId: null, manuelltVal: false, ignorerad: false, sparaAlias: false,
  }));
}

function NyProduktForm({ namnFrånRad, upptagen, onSkapa, onAvbryt }) {
  const [namn, setNamn] = useState(namnFrånRad);
  const [styckPerPlåt, setStyckPerPlåt] = useState('');
  const [fel, setFel] = useState(null);

  async function spara(event) {
    event.preventDefault();
    setFel(null);
    try { await onSkapa({ namn, styckPerPlåt }); }
    catch (error) { setFel(error.message || 'Produkten kunde inte skapas.'); }
  }

  return <form onSubmit={spara} className="produktform ocr-produktform">
    <p>Ny produkt</p>
    <input type="text" value={namn} onChange={(e) => setNamn(e.target.value)}
      aria-label="Namn på ny produkt" placeholder="Produktnamn" required disabled={upptagen} />
    <input type="text" inputMode="decimal" value={styckPerPlåt} onChange={(e) => setStyckPerPlåt(e.target.value)}
      aria-label="Styck per plåt för ny produkt" placeholder="Styck per plåt" required disabled={upptagen} />
    {fel && <p className="fel" role="alert">{fel}</p>}
    <div className="knapp-rad">
      <button type="button" onClick={onAvbryt} disabled={upptagen} className="knapp-sekundär">Avbryt</button>
      <button type="submit" disabled={upptagen} className="knapp-primär">{upptagen ? 'Sparar...' : 'Skapa och koppla produkt'}</button>
    </div>
  </form>;
}

export default function GranskaLista({ ocrText, bilder, onKlar, onAvbryt }) {
  const [rader, setRader] = useState(() => reviewRows(ocrText));
  const [produkter, setProdukter] = useState([]);
  const [nyProduktRad, setNyProduktRad] = useState(null);
  const [laddar, setLaddar] = useState(true);
  const [upptagen, setUpptagen] = useState(false);
  const [fel, setFel] = useState(null);
  const låst = useRef(false);
  const nästaRadId = useRef(0);

  useEffect(() => {
    let aktiv = true;
    getAllProducts().then((result) => { if (aktiv) setProdukter(result); })
      .catch((error) => { if (aktiv) setFel(error.message); })
      .finally(() => { if (aktiv) setLaddar(false); });
    return () => { aktiv = false; };
  }, []);

  function läggTillRad() {
    const id = `manuell-${++nästaRadId.current}`;
    setRader((prev) => [...prev, {
      id, namn: '', antal: '', ocrText: '', produktId: null,
      manuelltVal: false, ignorerad: false, sparaAlias: false,
    }]);
  }

  function ändraRad(id, changes) {
    setRader((prev) => prev.map((rad) => rad.id === id ? { ...rad, ...changes } : rad));
  }

  function radData(rad) {
    const produkt = rad.manuelltVal
      ? produkter.find((p) => p.id === rad.produktId)
      : findExactProduct(produkter, rad.namn);
    let fel = null;
    if (!produkt) fel = 'Välj en befintlig produkt, skapa en ny eller ignorera raden.';
    else {
      try { validateProduct(produkt); }
      catch { fel = 'Produkten saknar giltigt styck per plåt. Rätta den i Hantera produkter.'; }
      if (!fel) {
        try { validatePieceCount(rad.antal); }
        catch { fel = 'Ange ett positivt heltal i antal styck.'; }
      }
    }
    return { produkt, fel, klar: Boolean(produkt && !fel) };
  }

  async function skapaProdukt(radId, data) {
    if (låst.current) return;
    låst.current = true; setUpptagen(true);
    try {
      const id = await addProduct(data);
      const produkt = await getProduct(id);
      setProdukter((prev) => [...prev, produkt]);
      ändraRad(radId, { produktId: id, manuelltVal: true, sparaAlias: false });
      setNyProduktRad(null);
    } finally { låst.current = false; setUpptagen(false); }
  }

  async function spara() {
    if (låst.current) return;
    const aktiva = rader.filter((rad) => !rad.ignorerad);
    if (!aktiva.length || aktiva.some((rad) => !radData(rad).klar)) {
      setFel('Alla rader måste vara klara eller uttryckligen ignorerade innan listan sparas.');
      return;
    }
    låst.current = true; setUpptagen(true); setFel(null);
    try {
      const listaId = await createPickList({
        bilder, status: 'aktiv',
        ignoreradeOcrRader: rader.filter((r) => r.ignorerad).map((r) => r.ocrText || r.namn),
        rader: aktiva.map((rad) => ({
          produktId: radData(rad).produkt.id,
          antalStyck: validatePieceCount(rad.antal),
          ocrText: rad.ocrText || rad.namn,
          alias: rad.sparaAlias ? rad.namn : undefined,
        })),
      });
      await onKlar(listaId);
    } catch (error) { setFel(error.message || 'Listan kunde inte sparas.'); }
    finally { låst.current = false; setUpptagen(false); }
  }

  function renderaRad(rad) {
    const { produkt, fel: radFel } = radData(rad);
    const aliasMöjligt = produkt && normalizeProductName(rad.namn) &&
      normalizeProductName(rad.namn) !== normalizeProductName(produkt.namn);
    return <li key={rad.id} className={produkt ? 'matchad' : 'omatchad'}>
      {rad.ocrText && <p className="ocr-original">Från bilden: {rad.ocrText}</p>}
      <div className="granska-rad">
        <input type="text" value={rad.namn} aria-label="Namn på raden" placeholder="Produktnamn" disabled={upptagen}
          onChange={(e) => ändraRad(rad.id, { namn: e.target.value, produktId: null, manuelltVal: false, sparaAlias: false })} />
        <input type="number" inputMode="numeric" min="1" step="1" value={rad.antal} aria-label="Antal styck" placeholder="Antal"
          disabled={upptagen} onChange={(e) => ändraRad(rad.id, { antal: e.target.value })} />
      </div>
      <select className="ocr-produktval" aria-label="Koppla till produkt" disabled={upptagen || laddar}
        value={produkt?.id ?? ''} onChange={(e) => ändraRad(rad.id, {
          produktId: e.target.value ? Number(e.target.value) : null, manuelltVal: true, sparaAlias: false,
        })}>
        <option value="">Välj befintlig produkt...</option>
        {produkter.map((p) => <option key={p.id} value={p.id}>{p.namn}</option>)}
      </select>
      {radFel && <p className="varning">{radFel}</p>}
      {rad.varning && !produkt && <p className="varning">{rad.varning}</p>}
      {aliasMöjligt && <label className="ocr-alias">
        <input type="checkbox" checked={rad.sparaAlias} disabled={upptagen}
          onChange={(e) => ändraRad(rad.id, { sparaAlias: e.target.checked })} />
        Kom ihåg namnet som alias om det är ledigt
      </label>}
      <div className="ocr-radknappar">
        {!produkt && <button onClick={() => setNyProduktRad(rad.id)} disabled={upptagen} className="knapp-sekundär">+ Ny produkt</button>}
        <button onClick={() => { ändraRad(rad.id, { ignorerad: true }); if (nyProduktRad === rad.id) setNyProduktRad(null); }}
          disabled={upptagen} className="knapp-sekundär">Ignorera raden</button>
      </div>
      {nyProduktRad === rad.id && <NyProduktForm namnFrånRad={rad.namn} upptagen={upptagen}
        onSkapa={(data) => skapaProdukt(rad.id, data)} onAvbryt={() => setNyProduktRad(null)} />}
    </li>;
  }

  const aktiva = rader.filter((r) => !r.ignorerad);
  const matchade = aktiva.filter((r) => radData(r).produkt);
  const omatchade = aktiva.filter((r) => !radData(r).produkt);
  const ignorerade = rader.filter((r) => r.ignorerad);
  const klara = aktiva.filter((r) => radData(r).klar).length;
  const olösta = aktiva.length - klara;

  return <div>
    <div className="topprad">
      <button onClick={onAvbryt} disabled={upptagen} className="knapp-sekundär">← Avbryt</button><h1>Granska lista</h1>
    </div>
    <p className="undertitel">{klara} av {aktiva.length} rader klara · {ignorerade.length} ignorerade</p>
    {laddar && <p>Laddar produkter...</p>}
    {fel && <p className="fel" role="alert">{fel}</p>}
    {omatchade.length > 0 && <>
      <h2 className="sektionsrubrik">Omatchade rader ({omatchade.length})</h2>
      <ul className="granska-lista">{omatchade.map(renderaRad)}</ul>
    </>}
    {matchade.length > 0 && <>
      <h2 className="sektionsrubrik">Matchade produkter ({matchade.length})</h2>
      <ul className="granska-lista">{matchade.map(renderaRad)}</ul>
    </>}
    {ignorerade.length > 0 && <>
      <h2 className="sektionsrubrik">Ignorerade rader ({ignorerade.length})</h2>
      <ul className="granska-lista ignorerade-rader">{ignorerade.map((rad) => <li key={rad.id}>
        <span>{rad.ocrText || rad.namn || 'Tom manuell rad'}</span>
        <button onClick={() => ändraRad(rad.id, { ignorerad: false })} disabled={upptagen} className="knapp-sekundär">Återställ</button>
      </li>)}</ul>
    </>}
    <button onClick={läggTillRad} disabled={upptagen} className="knapp-sekundär">+ Lägg till rad</button>
    {olösta > 0 && <p className="varning ocr-sparinfo">Hantera eller ignorera de {olösta} återstående raderna före sparning.</p>}
    <button onClick={spara} disabled={!klara || olösta > 0 || upptagen || laddar} className="knapp-primär stor ocr-spara">
      {upptagen ? 'Sparar...' : `Spara lista (${klara} produkter)`}
    </button>
  </div>;
}
