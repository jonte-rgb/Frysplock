import { parseDecimal } from '../utils/numbers.js';

export function timerEndFromDuration(durationMinutes, now = Date.now()) {
  const minuter = parseDecimal(durationMinutes, 'Timertid');
  if (minuter <= 0) throw new Error('Timertiden måste vara större än noll.');
  return new Date(now + minuter * 60_000).toISOString();
}

export function describeTimer(endTime, now = Date.now()) {
  const end = new Date(endTime).getTime();
  if (!Number.isFinite(end)) return { finished: true, milliseconds: 0, text: 'Ogiltig timer' };
  const diff = end - now;
  const finished = diff <= 0;
  const abs = Math.abs(diff);
  const totalSeconds = Math.floor(abs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const clock = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return {
    finished,
    milliseconds: diff,
    text: finished ? `klar för ${clock} sedan` : `${clock} kvar`,
  };
}
