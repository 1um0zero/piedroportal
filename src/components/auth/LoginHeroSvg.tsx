export function LoginHeroSvg() {
  return (
    <svg width="100%" viewBox="0 0 680 580" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <style>{`
          .shoe-label { cursor: default; }
          .shoe-label rect {
            transition: stroke 0.25s, fill 0.25s;
          }
          .shoe-label .label-en {
            transition: fill 0.25s;
          }
          .shoe-label .label-nl {
            transition: fill 0.25s, opacity 0.25s;
            opacity: 0.6;
          }
          .shoe-label:hover rect {
            stroke: #B8975A;
            fill: rgba(184,151,90,0.12);
          }
          .shoe-label:hover .label-en { fill: #B8975A; }
          .shoe-label:hover .label-nl { fill: #d4a85a; opacity: 1; }
          .shoe-label .leader {
            transition: stroke 0.25s;
          }
          .shoe-label:hover .leader { stroke: #B8975A; }
        `}</style>
        <marker id="lh-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#7a9bb5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
      </defs>

      {/* Sole outline — single subtle stroke, no bright bottom edge */}
      <path d="M100 320 Q110 350 160 365 Q240 382 370 378 Q470 374 530 355 Q570 340 575 320 L560 308 Q530 318 470 324 Q370 330 240 328 Q160 326 120 320 Z" fill="none" stroke="#5a7a90" strokeWidth="1.2" strokeDasharray="4,3"/>

      {/* Upper */}
      <path d="M120 320 Q118 290 125 260 Q132 230 155 210 Q180 192 220 184 Q260 178 300 180 Q340 182 365 192 Q395 205 415 228 Q430 245 440 268 Q448 285 450 300 L470 305 L510 290 L560 308 Q530 318 470 324 Q370 330 240 328 Q160 326 120 320 Z" fill="rgba(255,255,255,0.05)" stroke="#b8cfe0" strokeWidth="1.8"/>

      {/* Zones */}
      <path d="M125 260 Q132 230 155 210 Q180 192 220 184 Q250 178 272 182 Q270 210 268 235 Q255 258 240 278 Q215 288 185 295 Q155 290 132 285 Q120 320 118 290 Q125 260 125 260 Z" fill="none" stroke="#5a8aaa" strokeWidth="1.2" strokeDasharray="6,4"/>
      <path d="M270 182 Q300 180 340 182 Q370 185 395 205 Q385 230 372 255 Q350 272 305 286 Q280 288 258 282 Q255 258 268 235 Q270 210 272 182 Z" fill="none" stroke="#4a7a9a" strokeWidth="1.2" strokeDasharray="5,4"/>
      <path d="M390 205 Q415 228 430 245 Q440 268 448 285 Q450 300 450 308 Q420 316 380 320 Q310 322 260 320 Q258 282 280 288 Q330 282 375 252 Q392 232 390 205 Z" fill="none" stroke="#3a6a8a" strokeWidth="1.2" strokeDasharray="5,4"/>

      {/* Heel counter — just a dashed zone, no fill */}
      <path d="M450 300 L470 305 L510 290 L560 308 Q530 318 470 324 L450 320 Q448 308 450 300 Z" fill="none" stroke="#4a6a80" strokeWidth="1" strokeDasharray="4,3"/>

      {/* Insole */}
      <path d="M155 300 Q240 318 380 314 Q440 312 460 305" fill="none" stroke="#3a6070" strokeWidth="1" strokeDasharray="3,3"/>

      {/* Laces */}
      {[204,219,234,249,264].map((y,i) => (
        <g key={i}>
          <line x1={264-i} y1={y} x2={307+i%2} y2={y} stroke="#5a7a90" strokeWidth="1"/>
          <circle cx={264-i} cy={y} r="3" fill="none" stroke="#7a9bb5" strokeWidth="1"/>
          <circle cx={307+i%2} cy={y} r="3" fill="none" stroke="#7a9bb5" strokeWidth="1"/>
        </g>
      ))}

      {/* Dimension — horizontal (length) */}
      <line x1="100" y1="325" x2="100" y2="398" stroke="#3a5a70" strokeWidth="0.6" strokeDasharray="3,3"/>
      <line x1="575" y1="318" x2="575" y2="398" stroke="#3a5a70" strokeWidth="0.6" strokeDasharray="3,3"/>
      <line x1="102" y1="400" x2="573" y2="400" stroke="#7a9bb5" strokeWidth="0.8" markerStart="url(#lh-arrow)" markerEnd="url(#lh-arrow)"/>
      <text x="337" y="418" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">Length / Lengte</text>

      {/* Dimension — vertical (height) */}
      <line x1="575" y1="180" x2="606" y2="180" stroke="#3a5a70" strokeWidth="0.6" strokeDasharray="3,3"/>
      <line x1="560" y1="328" x2="606" y2="328" stroke="#3a5a70" strokeWidth="0.6" strokeDasharray="3,3"/>
      <line x1="608" y1="182" x2="608" y2="326" stroke="#7a9bb5" strokeWidth="0.8" markerStart="url(#lh-arrow)" markerEnd="url(#lh-arrow)"/>
      <text x="634" y="258" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">Height</text>
      <text x="634" y="272" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">Hoogte</text>

      {/* Dimension — width */}
      <line x1="150" y1="298" x2="150" y2="337" stroke="#6a8ba5" strokeWidth="0.8" markerStart="url(#lh-arrow)" markerEnd="url(#lh-arrow)"/>
      <text x="132" y="316" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">W</text>

      {/* ── Animated labels ───────────────────────────────────────── */}
      <g className="shoe-label">
        <line className="leader" x1="158" y1="228" x2="58" y2="148" stroke="#5a8aaa" strokeWidth="0.8" markerEnd="url(#lh-arrow)"/>
        <rect x="4" y="108" width="106" height="36" rx="4" fill="rgba(255,255,255,0.04)" stroke="#5a7a90" strokeWidth="0.8"/>
        <text x="57" y="123" className="label-en" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c0d8e8">Toe cap</text>
        <text x="57" y="137" className="label-nl" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">Neus</text>
      </g>

      <g className="shoe-label">
        <line className="leader" x1="318" y1="200" x2="290" y2="118" stroke="#5a8aaa" strokeWidth="0.8" markerEnd="url(#lh-arrow)"/>
        <rect x="232" y="80" width="106" height="36" rx="4" fill="rgba(255,255,255,0.04)" stroke="#5a7a90" strokeWidth="0.8"/>
        <text x="285" y="95" className="label-en" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c0d8e8">Upper</text>
        <text x="285" y="109" className="label-nl" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">Bovenleer</text>
      </g>

      <g className="shoe-label">
        <line className="leader" x1="262" y1="230" x2="140" y2="168" stroke="#5a8aaa" strokeWidth="0.8" markerEnd="url(#lh-arrow)"/>
        <rect x="50" y="150" width="122" height="36" rx="4" fill="rgba(255,255,255,0.04)" stroke="#5a7a90" strokeWidth="0.8"/>
        <text x="111" y="165" className="label-en" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c0d8e8">Lacing / closure</text>
        <text x="111" y="179" className="label-nl" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">Veters / sluiting</text>
      </g>

      <g className="shoe-label">
        <line className="leader" x1="505" y1="298" x2="556" y2="238" stroke="#5a8aaa" strokeWidth="0.8" markerEnd="url(#lh-arrow)"/>
        <rect x="538" y="200" width="118" height="36" rx="4" fill="rgba(255,255,255,0.04)" stroke="#5a7a90" strokeWidth="0.8"/>
        <text x="597" y="215" className="label-en" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c0d8e8">Heel counter</text>
        <text x="597" y="229" className="label-nl" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">Hielversterker</text>
      </g>

      <g className="shoe-label">
        <line className="leader" x1="310" y1="312" x2="310" y2="395" stroke="#5a8aaa" strokeWidth="0.8" markerEnd="url(#lh-arrow)"/>
        <rect x="244" y="396" width="132" height="36" rx="4" fill="rgba(255,255,255,0.04)" stroke="#5a7a90" strokeWidth="0.8"/>
        <text x="310" y="411" className="label-en" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c0d8e8">Orthopedic insole</text>
        <text x="310" y="425" className="label-nl" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">Orthopedische zool</text>
      </g>

      <g className="shoe-label">
        <line className="leader" x1="175" y1="373" x2="82" y2="468" stroke="#5a8aaa" strokeWidth="0.8" markerEnd="url(#lh-arrow)"/>
        <rect x="4" y="460" width="106" height="36" rx="4" fill="rgba(255,255,255,0.04)" stroke="#5a7a90" strokeWidth="0.8"/>
        <text x="57" y="475" className="label-en" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c0d8e8">Outsole</text>
        <text x="57" y="489" className="label-nl" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#6a8ba5">Buitenzool</text>
      </g>

      <text x="340" y="548" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="#3a5a70">Custom orthopedic shoe — maatschoen op maat</text>
    </svg>
  )
}
