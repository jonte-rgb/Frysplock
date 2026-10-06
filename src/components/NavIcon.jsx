export default function NavIcon({ name }) {
  const common = { className: 'nav-ikon', viewBox: '0 0 24 24', 'aria-hidden': true };

  if (name === 'deg') return <svg {...common}>
    <path d="M12 3v17M7 20h10M6 6h12M6 6l-3 6h6L6 6Zm12 0-3 6h6l-3-6Z" />
  </svg>;

  if (name === 'infrys') return <svg {...common}>
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.7 4.3 12 6.6l2.3-2.3M9.7 19.7 12 17.4l2.3 2.3M3.8 10.7 7 11.6l-.9 3.2M20.2 13.3 17 12.4l.9-3.2" />
  </svg>;

  if (name === 'frysplock') return <svg {...common}>
    <path d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Zm2-1h6v3H9V3Z" />
    <path d="m8.5 11 1.5 1.5 3-3M8.5 16 10 17.5l3-3M14.5 11H17M14.5 16H17" />
  </svg>;

  if (name === 'baka') return <svg {...common}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M4 8h16M8 5.5h.01M12 5.5h.01M8 12h8v5H8z" />
  </svg>;

  return <svg {...common}>
    <path d="M5 6h14v4H5zM4 10h16v4H4zM5 14h14v4H5z" />
  </svg>;
}
