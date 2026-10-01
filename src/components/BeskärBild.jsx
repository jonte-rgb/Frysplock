import { useRef, useState } from 'react';
import { selectionFromPoints } from '../utils/images';

const wholeImage = { x: 0, y: 0, width: 1, height: 1 };

export default function BeskärBild({ bild, initialCrop = wholeImage, upptagen, fel, onKlar, onAvbryt }) {
  const [selection, setSelection] = useState(initialCrop);
  const [ready, setReady] = useState(false);
  const imageRef = useRef(null);
  const drag = useRef(null);

  function point(event) {
    const rect = imageRef.current.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }

  function pointerDown(event) {
    if (!ready || upptagen || event.button !== 0) return;
    event.preventDefault();
    drag.current = { start: point(event), previous: selection, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setSelection(selectionFromPoints(drag.current.start, point(event)));
  }

  function pointerEnd(event, cancelled = false) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const crop = selectionFromPoints(drag.current.start, point(event));
    setSelection(cancelled || crop.width < 0.01 || crop.height < 0.01 ? drag.current.previous : crop);
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function changeEdge(edge, value) {
    const v = Number(value) / 100;
    setSelection((s) => {
      const right = s.x + s.width; const bottom = s.y + s.height;
      if (edge === 'left') { const x = Math.min(v, right - 0.01); return { ...s, x, width: right - x }; }
      if (edge === 'right') return { ...s, width: Math.max(v, s.x + 0.01) - s.x };
      if (edge === 'top') { const y = Math.min(v, bottom - 0.01); return { ...s, y, height: bottom - y }; }
      return { ...s, height: Math.max(v, s.y + 0.01) - s.y };
    });
  }

  return <div>
    <div className="topprad"><button onClick={onAvbryt} disabled={upptagen} className="knapp-sekundär">← Tillbaka</button><h1>Beskär bild</h1></div>
    <p className="crop-instruktion">Dra över kolumnen eller delen som ska läsas. Området innanför ramen skickas till textläsningen.</p>
    {fel && <p className="fel" role="alert">{fel}</p>}
    <div className="crop-yta" onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={(e) => pointerEnd(e)} onPointerCancel={(e) => pointerEnd(e, true)}>
      <img ref={imageRef} src={`data:image/jpeg;base64,${bild}`} alt="Plocklista som ska beskäras" draggable={false} onLoad={() => setReady(true)} />
      <div className="crop-markering" style={{
        left: `${selection.x * 100}%`, top: `${selection.y * 100}%`,
        width: `${selection.width * 100}%`, height: `${selection.height * 100}%`,
      }} />
    </div>
    <details className="crop-kanter">
      <summary>Justera kanter</summary>
      {[
        ['left', 'Vänster kant', selection.x], ['right', 'Höger kant', selection.x + selection.width],
        ['top', 'Övre kant', selection.y], ['bottom', 'Nedre kant', selection.y + selection.height],
      ].map(([edge, label, value]) => <label key={edge}>{label}
        <input type="range" min="0" max="100" step="1" aria-label={label} value={Math.round(value * 100)}
          disabled={upptagen} onChange={(e) => changeEdge(edge, e.target.value)} />
      </label>)}
    </details>
    <button onClick={() => onKlar(selection)} disabled={!ready || upptagen || selection.width < 0.01 || selection.height < 0.01}
      className="knapp-primär stor">{upptagen ? 'Beskär...' : 'Använd beskärning'}</button>
    <button onClick={() => onKlar(wholeImage)} disabled={!ready || upptagen} className="knapp-sekundär crop-helbild">Använd hela bilden</button>
  </div>;
}
