import { useEffect, useMemo, useState } from 'react';
import { getAllDoughRecipes, saveDoughRecipe, deleteDoughRecipe } from '../storage/doughRecipes.js';
import { scaleDoughRecipe } from '../services/recipeScaling.js';
import { formatDecimal } from '../utils/numbers.js';

const tomIngrediens = () => ({ namn: '', mängd: '', enhet: 'kg' });
const tomForm = () => ({ namn: '', basVatten: '', vattenEnhet: 'l', ingredienser: [tomIngrediens()] });

function ScaleIcon() {
  return <svg className="rubrik-ikon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v17M7 20h10M6 6h12M6 6l-3 6h6L6 6Zm12 0-3 6h6l-3-6Z" />
  </svg>;
}

export default function Deg() {
  const [recept, setRecept] = useState([]);
  const [valt, setValt] = useState(null);
  const [vatten, setVatten] = useState('');
  const [redigerar, setRedigerar] = useState(false);
  const [form, setForm] = useState(tomForm());
  const [sparar, setSparar] = useState(false);
  const [fel, setFel] = useState(null);

  async function ladda() {
    setRecept(await getAllDoughRecipes());
  }

  useEffect(() => {
    let aktiv = true;
    getAllDoughRecipes().then((rows) => { if (aktiv) setRecept(rows); })
      .catch((error) => { if (aktiv) setFel(error.message); });
    return () => { aktiv = false; };
  }, []);

  const skalat = useMemo(() => {
    if (!valt || !String(vatten).trim()) return null;
    try { return scaleDoughRecipe(valt, vatten); }
    catch { return null; }
  }, [valt, vatten]);

  function nyttRecept() {
    setForm(tomForm());
    setRedigerar(true);
    setFel(null);
  }

  function redigeraValt() {
    setForm({
      ...valt,
      basVatten: String(valt.basVatten).replace('.', ','),
      ingredienser: valt.ingredienser.map((ing) => ({
        ...ing,
        mängd: String(ing.mängd).replace('.', ','),
      })),
    });
    setRedigerar(true);
    setFel(null);
  }

  function ändraIngrediens(index, field, value) {
    setForm((current) => ({
      ...current,
      ingredienser: current.ingredienser.map((ing, i) => i === index ? { ...ing, [field]: value } : ing),
    }));
  }

  function läggTillIngrediens() {
    setForm((current) => ({ ...current, ingredienser: [...current.ingredienser, tomIngrediens()] }));
  }

  function taBortIngrediens(index) {
    setForm((current) => ({
      ...current,
      ingredienser: current.ingredienser.filter((_, i) => i !== index),
    }));
  }

  async function spara(e) {
    e.preventDefault();
    if (sparar) return;
    setSparar(true); setFel(null);
    try {
      const id = await saveDoughRecipe(form);
      await ladda();
      const all = await getAllDoughRecipes();
      const saved = all.find((r) => r.id === id) || null;
      setValt(saved);
      setVatten(saved ? String(saved.basVatten).replace('.', ',') : '');
      setRedigerar(false);
    } catch (error) { setFel(error.message || 'Receptet kunde inte sparas.'); }
    finally { setSparar(false); }
  }

  async function taBort() {
    if (!form.id || sparar) return;
    if (!window.confirm(`Ta bort degreceptet “${form.namn}”?`)) return;
    setSparar(true); setFel(null);
    try {
      await deleteDoughRecipe(form.id);
      setValt(null); setVatten(''); setRedigerar(false);
      await ladda();
    } catch (error) { setFel(error.message || 'Receptet kunde inte tas bort.'); }
    finally { setSparar(false); }
  }

  if (redigerar) {
    return <div>
      <div className="topprad">
        <button className="knapp-sekundär" disabled={sparar} onClick={() => setRedigerar(false)}>← Tillbaka</button>
        <h1>{form.id ? 'Redigera deg' : 'Nytt degrecept'}</h1>
      </div>
      {fel && <p className="fel" role="alert">{fel}</p>}
      <form className="kort-form" onSubmit={spara}>
        <label>
          <span>Degnamn</span>
          <input value={form.namn} onChange={(e) => setForm({ ...form, namn: e.target.value })} placeholder="T.ex. Vetebröd" required />
        </label>
        <div className="form-rad två-kolumner">
          <label>
            <span>Vatten i grundrecept</span>
            <input inputMode="decimal" value={form.basVatten} onChange={(e) => setForm({ ...form, basVatten: e.target.value })} placeholder="10" required />
          </label>
          <label>
            <span>Enhet</span>
            <input value={form.vattenEnhet} onChange={(e) => setForm({ ...form, vattenEnhet: e.target.value })} placeholder="l" required />
          </label>
        </div>

        <h2 className="sektionsrubrik">Ingredienser i grundrecept</h2>
        <div className="ingredienser-editor">
          {form.ingredienser.map((ing, index) => <div className="ingrediens-rad" key={index}>
            <input aria-label={`Ingrediens ${index + 1}`} value={ing.namn} onChange={(e) => ändraIngrediens(index, 'namn', e.target.value)} placeholder="Ingrediens" required />
            <input aria-label={`Mängd ${index + 1}`} inputMode="decimal" value={ing.mängd} onChange={(e) => ändraIngrediens(index, 'mängd', e.target.value)} placeholder="Mängd" required />
            <input aria-label={`Enhet ${index + 1}`} value={ing.enhet} onChange={(e) => ändraIngrediens(index, 'enhet', e.target.value)} placeholder="kg" required />
            <button type="button" className="ikonknapp" aria-label="Ta bort ingrediens" onClick={() => taBortIngrediens(index)} disabled={form.ingredienser.length === 1}>×</button>
          </div>)}
        </div>
        <button type="button" className="knapp-sekundär" onClick={läggTillIngrediens}>+ Ingrediens</button>
        <button type="submit" className="knapp-primär stor" disabled={sparar}>{sparar ? 'Sparar...' : 'Spara recept'}</button>
        {form.id && <button type="button" className="knapp-fara" disabled={sparar} onClick={taBort}>Ta bort recept</button>}
      </form>
    </div>;
  }

  if (valt) {
    return <div>
      <div className="topprad">
        <button className="knapp-sekundär" onClick={() => { setValt(null); setVatten(''); setFel(null); }}>← Tillbaka</button>
        <div className="rubrik-med-ikon"><ScaleIcon /><h1>{valt.namn}</h1></div>
      </div>
      {fel && <p className="fel" role="alert">{fel}</p>}

      <section className="arbetskort">
        <label className="stor-input-label" htmlFor="vattenmängd">Dagens vattenmängd</label>
        <div className="mängd-input">
          <input id="vattenmängd" inputMode="decimal" value={vatten} onChange={(e) => setVatten(e.target.value)} placeholder={formatDecimal(valt.basVatten)} autoFocus />
          <span>{valt.vattenEnhet}</span>
        </div>
        <p className="undertitel">Grundrecept: {formatDecimal(valt.basVatten)} {valt.vattenEnhet}</p>
      </section>

      {String(vatten).trim() && !skalat && <p className="fel" role="alert">Ange en giltig vattenmängd större än noll.</p>}
      {skalat && <section>
        <h2 className="sektionsrubrik">Väg upp</h2>
        <ul className="recept-resultat">
          <li className="vatten-rad"><span>Vatten</span><strong>{formatDecimal(skalat.vatten.mängd)} {skalat.vatten.enhet}</strong></li>
          {skalat.ingredienser.map((ing, index) => <li key={`${ing.namn}-${index}`}>
            <span>{ing.namn}</span><strong>{formatDecimal(ing.mängd)} {ing.enhet}</strong>
          </li>)}
        </ul>
      </section>}

      <button className="knapp-sekundär fast-nederst" onClick={redigeraValt}>Redigera recept</button>
    </div>;
  }

  return <div>
    <div className="rubrik-med-ikon"><ScaleIcon /><h1>Deg</h1></div>
    <p className="modul-intro">Välj en deg och skriv in vattenmängden. Resten räknas om automatiskt.</p>
    {fel && <p className="fel" role="alert">{fel}</p>}

    {recept.length === 0 ? <div className="tomt-läge">
      <p>Inga degrecept sparade ännu.</p>
      <button className="knapp-primär" onClick={nyttRecept}>Lägg till första receptet</button>
    </div> : <>
      <ul className="produktlista modul-lista">
        {recept.map((r) => <li key={r.id} onClick={() => { setValt(r); setVatten(String(r.basVatten).replace('.', ',')); setFel(null); }}>
          <span>{r.namn}</span>
          <span className="antal">{formatDecimal(r.basVatten)} {r.vattenEnhet} grund</span>
        </li>)}
      </ul>
      <button className="knapp-sekundär fast-nederst" onClick={nyttRecept}>+ Nytt degrecept</button>
    </>}
  </div>;
}
