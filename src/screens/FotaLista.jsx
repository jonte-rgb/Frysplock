import { useState } from 'react';

export default function FotaLista({ onKlar, onAvbryt }) {
  const [bilder, setBilder] = useState([]);
  const [bearbetar, setBearbetar] = useState(false);
  const [fel, setFel] = useState(null);

  function hanteraFil(e) {
    const filer = Array.from(e.target.files);
    filer.forEach((fil) => {
      const läsare = new FileReader();
      läsare.onload = () => {
        const base64 = läsare.result.split(',')[1];
        setBilder((prev) => [...prev, base64]);
      };
      läsare.readAsDataURL(fil);
    });
  }

  async function bearbeta() {
    if (bilder.length === 0) return;
    setBearbetar(true);
    setFel(null);

    try {
      const resultat = [];
      for (const bild of bilder) {
        const svar = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: bild }),
        });
        const data = await svar.json();
        if (data.error) throw new Error(data.error);
        resultat.push(data.text);
      }
      const allText = resultat.join('\n\n---\n\n');
      onKlar(allText, bilder);
    } catch (err) {
      setFel(err.message);
    } finally {
      setBearbetar(false);
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