// "Sorriso confiante": one flat brow and one raised, arched brow, tall eyes,
// and a lopsided toothy grin that rises to the right. Drawn in the
// coordinates of the reference sketch, then scaled onto the 40x40 head front.
const INK = '#2b1d00';

export default function ConfidentSmileFace() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      <g transform="translate(8.6 8.4) scale(0.031) translate(-360 -420)" strokeLinecap="round" strokeLinejoin="round">
        {/* Brows: low and determined on the left, raised arch on the right */}
        <path d="M365 497 Q480 528 593 572" fill="none" stroke={INK} strokeWidth="44" />
        <path d="M747 525 Q770 432 835 430 Q910 434 965 495" fill="none" stroke={INK} strokeWidth="44" />
        {/* Eyes */}
        <ellipse cx="468" cy="722" rx="56" ry="168" transform="rotate(-4 468 722)" fill={INK} />
        <ellipse cx="872" cy="700" rx="56" ry="146" transform="rotate(-4 872 700)" fill={INK} />
        {/* Grin with teeth */}
        <path
          d="M560 1118 Q800 1085 1083 916 Q1072 1060 1010 1150 Q935 1232 822 1234 Q760 1234 728 1220 Q620 1182 560 1118 Z"
          fill="#ffffff"
          stroke={INK}
          strokeWidth="40"
        />
        <path d="M688 1104 L726 1218" fill="none" stroke={INK} strokeWidth="32" />
        <path d="M860 1050 L922 1198" fill="none" stroke={INK} strokeWidth="32" />
        <path d="M1015 982 Q1040 1012 1056 1050" fill="none" stroke={INK} strokeWidth="32" />
      </g>
    </svg>
  );
}
