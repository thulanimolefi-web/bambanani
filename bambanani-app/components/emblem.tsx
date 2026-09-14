export default function Emblem({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bambanani emblem">
      <defs>
        <linearGradient id="eLeftFig" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6FCBB2" /><stop offset="100%" stopColor="#3FA890" />
        </linearGradient>
        <linearGradient id="eRightFig" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8FC4E8" /><stop offset="100%" stopColor="#4E8FC4" />
        </linearGradient>
      </defs>
      <circle cx="188" cy="168" r="44" fill="url(#eLeftFig)" />
      <path d="M 188 214 C 122 222, 78 274, 82 336 C 85 384, 122 418, 178 430 C 208 436, 232 428, 250 408 C 234 392, 214 372, 202 344 C 188 312, 184 276, 190 240 C 192 230, 190 220, 188 214 Z" fill="url(#eLeftFig)" />
      <circle cx="324" cy="168" r="44" fill="url(#eRightFig)" />
      <path d="M 324 214 C 390 222, 434 274, 430 336 C 427 384, 390 418, 334 430 C 304 436, 280 428, 262 408 C 278 392, 298 372, 310 344 C 324 312, 328 276, 322 240 C 320 230, 322 220, 324 214 Z" fill="url(#eRightFig)" />
      <circle cx="256" cy="206" r="30" fill="#F4F1E8" stroke="#0E3A3B" strokeWidth="3" />
      <path d="M 256 240 C 224 240, 202 268, 202 306 C 202 342, 224 366, 256 366 C 288 366, 310 342, 310 306 C 310 268, 288 240, 256 240 Z" fill="#F4F1E8" stroke="#0E3A3B" strokeWidth="3" />
    </svg>
  );
}
