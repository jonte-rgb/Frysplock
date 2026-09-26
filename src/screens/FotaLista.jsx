import { useState } from 'react';

function komprimeraBild(file) {
  return new Promise((resolve, reject) => {
    const läsare = new FileReader();
    läsare.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxBredd = 1500;
        let bredd = img.width;
        let höjd = img.height;

        if (bredd > maxBredd) {
          höjd = Math.round((höjd * maxBredd) / bredd);
          bredd = maxBredd;
        }

        const canvas = document.createElement('canvas');
        canvas.width = bredd;
        canvas.height = höjd;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, bredd, höjd);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      img.onerror = reject;
      img.src = läsare.result;
    };
    läsare.onerror = reject;
    läsare.readAsDataURL(file);
  });
}

export default function FotaLista({ onKlar, onAvbryt }) {
  const [bilder, setBilder] = useState([]);
  const [bearbetar, setBearbetar] = useState(false);
  const [status, setStatus] = useState('');
  const [fel, setFel] = useState(null);

  async function hanteraFil(e) {
    const filer = Array.from(e.target.files);
    setStatus('Komprimerar...');

    try {
      const komprimerade = [];
      for (const fil of filer) {
        const base64 = await komprimeraBild(fil);
        komprimerade.push(base64);
      }
      setBilder((prev) => [...prev, ...komprimerade]);
      setStatus('');
    } catch (err) {
      setFel('Kunde inte läsa bilden: ' + err.message);
      setStatus('');
    }
  }

  async function bearbeta() {
    if (bilder.length === 0) return;
    setBearbetar(true);
    setFel(null);

    try {
      const resultat = [];
      for (let i = 0; i < bilder.length; i++) {
        setStatus(`Läser bild ${i + 1} av ${bilder.length}...`);
        const svar = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: bilder[i] }),
        });

        const text = await svar.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Servern svarade inte med JSON: ' + text.substring(0, 200));
        }

        if (data.error) throw new Error(data.error);
        resultat.push(data.text);
      }

      const allText = resultat.join('\n\n---\n\n');
      onKlar(allText, bilder);
    } catch (err) {
      setFel(err.message);
    } finally {
      setBearbetar(false);
      setStatus('');
    }
  }

  return (
    <div>
      <div className="topprad">
        <button onClick={onAvbryt} className="knapp-sekundär">← Avbryt</button>
        <h1>Fota plocklista</h1>
      </div>

      <label className="fota-knapp">
        Ta bild eller välj fil
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={hanteraFil}
          style={{ display: 'none' }}
        />
      </label>

      {bilder.length > 0 && (
        <div className="bild-lista">
          {bilder.map((b, i) => (
            <img
              key={i}
              src={`data:image/jpeg;base64,${b}`}
              alt={`Bild ${i + 1}`}
              className="miniatyr"
            />
          ))}
        </div>
      )}

      {status && <p className="undertitel">{status}</p>}
      {fel && <p className="fel">{fel}</p>}

      <button
        onClick={bearbeta}
        disabled={bilder.length === 0 || bearbetar}
        className="knapp-primär stor"
      >
        {bearbetar ? 'Bearbetar...' : `Bearbeta ${bilder.length} bild(er)`}
      </button>
    </div>
  );
}