import { useRef, useState } from 'react';
import BeskärBild from '../components/BeskärBild';
import { cropImage, readImageFile } from '../utils/images';

export default function FotaLista({ onKlar, onAvbryt }) {
  const [bilder, setBilder] = useState([]);
  const [beskärId, setBeskärId] = useState(null);
  const [upptagen, setUpptagen] = useState(false);
  const [status, setStatus] = useState('');
  const [fel, setFel] = useState(null);
  const låst = useRef(false);
  const nästaBildId = useRef(0);

  async function hanteraFil(event) {
    const filer = Array.from(event.target.files || []);
    event.target.value = '';
    if (!filer.length || låst.current) return;
    låst.current = true; setUpptagen(true); setFel(null); setStatus('Komprimerar...');
    try {
      const nya = [];
      for (const file of filer) {
        const original = await readImageFile(file);
        nya.push({ id: `bild-${++nästaBildId.current}`, original, data: original, crop: null });
      }
      setBilder((prev) => [...prev, ...nya]);
      setBeskärId(nya[0].id);
    } catch (error) { setFel(error.message || 'Bilden kunde inte öppnas.'); }
    finally { låst.current = false; setUpptagen(false); setStatus(''); }
  }

  async function sparaBeskärning(selection) {
    if (låst.current) return;
    const bild = bilder.find((b) => b.id === beskärId);
    if (!bild) return;
    låst.current = true; setUpptagen(true); setFel(null);
    try {
      const helbild = selection.x === 0 && selection.y === 0 && selection.width === 1 && selection.height === 1;
      const data = helbild ? bild.original : await cropImage(bild.original, selection);
      setBilder((prev) => prev.map((b) => b.id === bild.id ? { ...b, data, crop: selection } : b));
      setBeskärId(null);
    } catch (error) { setFel(error.message || 'Bilden kunde inte beskäras.'); }
    finally { låst.current = false; setUpptagen(false); }
  }

  async function bearbeta() {
    if (!bilder.length || låst.current) return;
    låst.current = true; setUpptagen(true); setFel(null);
    try {
      const resultat = [];
      for (let i = 0; i < bilder.length; i++) {
        setStatus(`Läser bild ${i + 1} av ${bilder.length}...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 35000);
        try {
          const svar = await fetch('/api/ocr', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: bilder[i].data }), signal: controller.signal,
          });
          let data;
          try { data = await svar.json(); }
          catch (error) {
            if (error?.name === 'AbortError') throw error;
            throw new Error('Textläsningstjänsten svarade inte korrekt. Försök igen senare.');
          }
          if (!svar.ok || data.error) throw new Error(data.error || 'Textläsningen misslyckades. Försök igen.');
          if (typeof data.text !== 'string' || !data.text.trim()) {
            throw new Error(`Ingen text hittades i bild ${i + 1}. Beskär bilden eller ta ett tydligare foto.`);
          }
          resultat.push(data.text);
        } catch (error) {
          if (error.name === 'AbortError') throw new Error('Textläsningen tog för lång tid. Försök igen.');
          if (error instanceof TypeError) throw new Error('Kunde inte nå textläsningstjänsten. Kontrollera uppkopplingen.');
          throw error;
        } finally { clearTimeout(timeout); }
      }
      onKlar(resultat.join('\n\n---\n\n'), bilder.map((b) => b.data));
    } catch (error) { setFel(error.message || 'Textläsningen misslyckades.'); }
    finally { låst.current = false; setUpptagen(false); setStatus(''); }
  }

  const beskärBild = bilder.find((b) => b.id === beskärId);
  if (beskärBild) return <BeskärBild key={beskärBild.id} bild={beskärBild.original}
    initialCrop={beskärBild.crop || undefined} upptagen={upptagen} fel={fel}
    onKlar={sparaBeskärning} onAvbryt={() => { setBeskärId(null); setFel(null); }} />;

  return <div>
    <div className="topprad"><button onClick={onAvbryt} disabled={upptagen} className="knapp-sekundär">← Avbryt</button><h1>Fota plocklista</h1></div>
    <label className="fota-knapp">Ta bild eller välj fil
      <input type="file" accept="image/*" multiple onChange={hanteraFil} disabled={upptagen} style={{ display: 'none' }} />
    </label>
    {bilder.length > 0 && <>
      <p className="crop-instruktion">Beskär varje bild till kolumnen som ska läsas, eller använd hela bilden.</p>
      <div className="bild-lista">{bilder.map((b, i) => <div key={b.id} className="bildkort">
        <img src={`data:image/jpeg;base64,${b.data}`} alt={`Bild ${i + 1}`} className="miniatyr" />
        <span>Bild {i + 1}</span>
        <button onClick={() => { setFel(null); setBeskärId(b.id); }} disabled={upptagen} className="knapp-sekundär">Beskär</button>
        <button onClick={() => setBilder((prev) => prev.filter((bild) => bild.id !== b.id))} disabled={upptagen} className="knapp-sekundär">Ta bort</button>
      </div>)}</div>
    </>}
    {status && <p className="undertitel" role="status">{status}</p>}
    {fel && <p className="fel" role="alert">{fel}</p>}
    <button onClick={bearbeta} disabled={!bilder.length || upptagen} className="knapp-primär stor">
      {upptagen ? 'Bearbetar...' : `Bearbeta ${bilder.length} bild(er)`}
    </button>
  </div>;
}
