import { useEffect, useMemo, useState } from 'react';
import { getAllProducts } from '../storage/products.js';
import { getAllBakeProfiles, getBakeProfile, saveBakeProfile } from '../storage/bakeProfiles.js';
import { deleteBakeTimer, getAllBakeTimers, startBakeTimer } from '../storage/bakeTimers.js';
import { describeTimer } from '../services/bakeTimer.js';

const tomProfil = () => ({
  temperatur: '', baktid: '', ånga: '', spjäll: '', tining: '', jäsning: '', instruktion: '',
  tinaTimerMin: '', jäsTimerMin: '', bakaTimerMin: '',
});

function OvenIcon() {
  return <svg className="rubrik-ikon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M4 8h16M8 5.5h.01M12 5.5h.01M8 12h8v5H8z" />
  </svg>;
}

function InfoRad({ etikett, värde }) {
  if (!värde) return null;
  return <div className="bak-info-rad"><span>{etikett}</span><strong>{värde}</strong></div>;
}

export default function Baka() {
  const [produkter, setProdukter] = useState([]);
  const [profiler, setProfiler] = useState([]);
  const [timers, setTimers] = useState([]);
  const [vald, setVald] = useState(null);
  const [profil, setProfil] = useState(null);
  const [redigerar, setRedigerar] = useState(false);
  const [form, setForm] = useState(tomProfil());
  const [sök, setSök] = useState('');
  const [fel, setFel] = useState(null);
  const [sparar, setSparar] = useState(false);
  const [now, setNow] = useState(Date.now());

  async function laddaBasdata() {
    const [products, profiles, allTimers] = await Promise.all([
      getAllProducts(), getAllBakeProfiles(), getAllBakeTimers(),
    ]);
    setProdukter(products); setProfiler(profiles); setTimers(allTimers);
  }

  async function laddaTimers() {
    setTimers(await getAllBakeTimers());
  }

  useEffect(() => {
    let aktiv = true;
    Promise.all([getAllProducts(), getAllBakeProfiles(), getAllBakeTimers()])
      .then(([products, profiles, allTimers]) => {
        if (aktiv) { setProdukter(products); setProfiler(profiles); setTimers(allTimers); }
      }).catch((error) => { if (aktiv) setFel(error.message); });
    return () => { aktiv = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const profilMap = useMemo(() => new Map(profiler.map((p) => [p.produktId, p])), [profiler]);
  const filtrerade = produkter.filter((p) => p.namn.toLocaleLowerCase('sv-SE').includes(sök.toLocaleLowerCase('sv-SE')));

  async function väljProdukt(product) {
    setVald(product); setFel(null); setRedigerar(false);
    try { setProfil(await getBakeProfile(product.id) || null); }
    catch (error) { setFel(error.message); }
  }

  function öppnaEditor() {
    setForm(profil ? {
      ...profil,
      tinaTimerMin: profil.tinaTimerMin ?? '',
      jäsTimerMin: profil.jäsTimerMin ?? '',
      bakaTimerMin: profil.bakaTimerMin ?? '',
    } : tomProfil());
    setRedigerar(true); setFel(null);
  }

  async function sparaProfil(e) {
    e.preventDefault();
    if (!vald || sparar) return;
    setSparar(true); setFel(null);
    try {
      const saved = await saveBakeProfile(vald.id, form);
      setProfil(saved); setRedigerar(false);
      await laddaBasdata();
    } catch (error) { setFel(error.message || 'Bakinformationen kunde inte sparas.'); }
    finally { setSparar(false); }
  }

  async function startaTimer(etikett, minuter) {
    if (!vald) return;
    setFel(null);
    try {
      await startBakeTimer({ produktId: vald.id, etikett, minuter });
      await laddaTimers();
      setNow(Date.now());
    } catch (error) { setFel(error.message || 'Timern kunde inte startas.'); }
  }

  async function taBortTimer(id) {
    try { await deleteBakeTimer(id); await laddaTimers(); }
    catch (error) { setFel(error.message); }
  }

  function TimerLista({ compact = false }) {
    if (timers.length === 0) return null;
    return <section className={compact ? 'timer-sektion compact' : 'timer-sektion'}>
      <h2 className="sektionsrubrik">Aktiva timers</h2>
      <ul className="timer-lista">
        {timers.map((timer) => {
          const status = describeTimer(timer.slutTid, now);
          return <li key={timer.id} className={status.finished ? 'timer-klar' : ''}>
            <div>
              <strong>{timer.produktNamn}</strong>
              <span>{timer.etikett}</span>
            </div>
            <div className="timer-höger">
              <strong>{status.text}</strong>
              <button className="ikonknapp" onClick={() => taBortTimer(timer.id)} aria-label={`Ta bort timer för ${timer.produktNamn}`}>×</button>
            </div>
          </li>;
        })}
      </ul>
    </section>;
  }

  if (redigerar && vald) {
    return <div>
      <div className="topprad">
        <button className="knapp-sekundär" disabled={sparar} onClick={() => setRedigerar(false)}>← Tillbaka</button>
        <h1>{vald.namn}</h1>
      </div>
      {fel && <p className="fel" role="alert">{fel}</p>}
      <form className="kort-form" onSubmit={sparaProfil}>
        <div className="form-rad två-kolumner">
          <label><span>Temperatur</span><input value={form.temperatur} onChange={(e) => setForm({ ...form, temperatur: e.target.value })} placeholder="T.ex. 210 °C" /></label>
          <label><span>Baktid</span><input value={form.baktid} onChange={(e) => setForm({ ...form, baktid: e.target.value })} placeholder="T.ex. 11–13 min" /></label>
        </div>
        <div className="form-rad två-kolumner">
          <label><span>Ånga</span><input value={form.ånga} onChange={(e) => setForm({ ...form, ånga: e.target.value })} placeholder="T.ex. 5 sek" /></label>
          <label><span>Spjäll/ventil</span><input value={form.spjäll} onChange={(e) => setForm({ ...form, spjäll: e.target.value })} placeholder="Vid behov" /></label>
        </div>
        <label><span>Tining – riktlinje</span><input value={form.tining} onChange={(e) => setForm({ ...form, tining: e.target.value })} placeholder="T.ex. 20–30 min" /></label>
        <label><span>Jäsning – riktlinje</span><input value={form.jäsning} onChange={(e) => setForm({ ...form, jäsning: e.target.value })} placeholder="T.ex. 45–60 min" /></label>
        <label><span>Special / instruktion</span><textarea value={form.instruktion} onChange={(e) => setForm({ ...form, instruktion: e.target.value })} placeholder="T.ex. spraya och strö pärlsocker före bakning" rows="3" /></label>

        <h2 className="sektionsrubrik">Snabbtimers</h2>
        <p className="undertitel">Valfritt. Ett tryck startar timern från produktvyn.</p>
        <div className="form-rad tre-kolumner">
          <label><span>Tina (min)</span><input inputMode="decimal" value={form.tinaTimerMin} onChange={(e) => setForm({ ...form, tinaTimerMin: e.target.value })} placeholder="30" /></label>
          <label><span>Jäs (min)</span><input inputMode="decimal" value={form.jäsTimerMin} onChange={(e) => setForm({ ...form, jäsTimerMin: e.target.value })} placeholder="50" /></label>
          <label><span>Baka (min)</span><input inputMode="decimal" value={form.bakaTimerMin} onChange={(e) => setForm({ ...form, bakaTimerMin: e.target.value })} placeholder="12" /></label>
        </div>
        <button type="submit" className="knapp-primär stor" disabled={sparar}>{sparar ? 'Sparar...' : 'Spara bakinfo'}</button>
      </form>
    </div>;
  }

  if (vald) {
    return <div>
      <div className="topprad">
        <button className="knapp-sekundär" onClick={() => { setVald(null); setProfil(null); setFel(null); }}>← Tillbaka</button>
        <h1>{vald.namn}</h1>
      </div>
      {fel && <p className="fel" role="alert">{fel}</p>}
      <TimerLista compact />

      {!profil ? <div className="tomt-läge">
        <p>Ingen bakinformation sparad för den här produkten.</p>
        <button className="knapp-primär" onClick={öppnaEditor}>Lägg till bakinfo</button>
      </div> : <>
        <section className="bak-kort">
          <InfoRad etikett="Temperatur" värde={profil.temperatur} />
          <InfoRad etikett="Baktid" värde={profil.baktid} />
          <InfoRad etikett="Ånga" värde={profil.ånga} />
          <InfoRad etikett="Spjäll/ventil" värde={profil.spjäll} />
          <InfoRad etikett="Tining" värde={profil.tining} />
          <InfoRad etikett="Jäsning" värde={profil.jäsning} />
          {profil.instruktion && <div className="bak-instruktion"><span>Special</span><p>{profil.instruktion}</p></div>}
        </section>

        {(profil.tinaTimerMin || profil.jäsTimerMin || profil.bakaTimerMin) && <section>
          <h2 className="sektionsrubrik">Starta timer</h2>
          <div className="snabbtimer-rad">
            {profil.tinaTimerMin && <button className="timer-knapp" onClick={() => startaTimer('Tining', profil.tinaTimerMin)}>Tina <strong>{profil.tinaTimerMin} min</strong></button>}
            {profil.jäsTimerMin && <button className="timer-knapp" onClick={() => startaTimer('Jäsning', profil.jäsTimerMin)}>Jäs <strong>{profil.jäsTimerMin} min</strong></button>}
            {profil.bakaTimerMin && <button className="timer-knapp" onClick={() => startaTimer('Bakning', profil.bakaTimerMin)}>Baka <strong>{profil.bakaTimerMin} min</strong></button>}
          </div>
        </section>}

        <button className="knapp-sekundär fast-nederst" onClick={öppnaEditor}>Redigera bakinfo</button>
      </>}
    </div>;
  }

  return <div>
    <div className="rubrik-med-ikon"><OvenIcon /><h1>Baka</h1></div>
    <p className="modul-intro">Bakinfo och timers som hjälper dig hålla ordning på vad som är på gång.</p>
    {fel && <p className="fel" role="alert">{fel}</p>}
    <TimerLista />

    <input type="text" className="sökfält" value={sök} onChange={(e) => setSök(e.target.value)} placeholder="Sök produkt..." aria-label="Sök produkt" />
    {produkter.length === 0 ? <div className="tomt-läge"><p>Lägg först till produkter under Frysplock → Hantera produkter.</p></div> : <ul className="produktlista modul-lista">
      {filtrerade.map((p) => <li key={p.id} onClick={() => väljProdukt(p)}>
        <span>{p.namn}</span>
        <span className={profilMap.has(p.id) ? 'status-ok' : 'antal'}>{profilMap.has(p.id) ? 'Bakinfo ✓' : 'Lägg till info'}</span>
      </li>)}
    </ul>}
  </div>;
}
