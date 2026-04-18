// Icons — stroke-based, 20×20 default. Minimal set tuned for FrameForge.
import React from "react";

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

const mk = (paths: React.ReactNode, opts: { sw?: number } = {}) => {
  const Component: React.FC<IconProps> = ({ size = 20, className = "", style }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={opts.sw || 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {paths}
    </svg>
  );
  return Component;
};

export const I = {
  Plus:       mk(<><path d="M12 5v14M5 12h14"/></>),
  Minus:      mk(<path d="M5 12h14"/>),
  X:          mk(<><path d="M6 6l12 12M18 6L6 18"/></>),
  Check:      mk(<path d="M5 13l4 4L19 7"/>),
  ChevDown:   mk(<path d="M6 9l6 6 6-6"/>),
  ChevRight:  mk(<path d="M9 6l6 6-6 6"/>),
  ChevLeft:   mk(<path d="M15 6l-6 6 6 6"/>),
  ArrowRight: mk(<><path d="M5 12h14M13 6l6 6-6 6"/></>),
  ArrowLeft:  mk(<><path d="M19 12H5M11 18l-6-6 6-6"/></>),
  ArrowUp:    mk(<><path d="M12 19V5M6 11l6-6 6 6"/></>),
  Search:     mk(<><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></>),
  Sparkles:   mk(<><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z"/></>),
  Play:       mk(<path d="M7 5v14l12-7z"/>),
  Pause:      mk(<><rect x="7" y="5" width="3" height="14"/><rect x="14" y="5" width="3" height="14"/></>),
  Stop:       mk(<rect x="6" y="6" width="12" height="12" rx="1"/>),
  Folder:     mk(<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>),
  Image:      mk(<><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/></>),
  Film:       mk(<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/></>),
  Wand:       mk(<><path d="M15 4l5 5-11 11H4v-5z"/><path d="M13 6l5 5"/></>),
  Layers:     mk(<><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></>),
  Board:      mk(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></>),
  Grid:       mk(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>),
  List:       mk(<><path d="M4 6h16M4 12h16M4 18h16"/></>),
  Settings:   mk(<><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>),
  Share:      mk(<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></>),
  Download:   mk(<><path d="M12 3v14"/><path d="M6 13l6 6 6-6"/><path d="M4 21h16"/></>),
  Upload:     mk(<><path d="M12 21V7"/><path d="M6 11l6-6 6 6"/><path d="M4 3h16"/></>),
  Link:       mk(<><path d="M10 14l4-4"/><path d="M14 6l2-2a4 4 0 015.66 5.66l-2 2"/><path d="M10 20l-2 2a4 4 0 01-5.66-5.66l2-2"/></>),
  Copy:       mk(<><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H3V3h12v2"/></>),
  Trash:      mk(<><path d="M4 7h16M10 11v6M14 11v6"/><path d="M5 7l1 13a2 2 0 002 2h8a2 2 0 002-2l1-13M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/></>),
  Edit:       mk(<><path d="M11 4H5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6"/><path d="M17 3l4 4-10 10H7v-4z"/></>),
  Zap:        mk(<path d="M13 2L3 14h7l-1 8 10-12h-7z"/>),
  Eye:        mk(<><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></>),
  Lock:       mk(<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></>),
  Users:      mk(<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 20c0-2 2-3.5 4-3.5s2.5 1 2.5 3.5"/></>),
  User:       mk(<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>),
  Bell:       mk(<><path d="M6 8a6 6 0 1112 0c0 7 2 8 2 8H4s2-1 2-8z"/><path d="M10 20a2 2 0 004 0"/></>),
  Clock:      mk(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  Target:     mk(<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>),
  Shot:       mk(<><rect x="2" y="6" width="14" height="12" rx="1"/><path d="M16 10l6-3v10l-6-3z"/></>),
  Palette:    mk(<><path d="M12 3a9 9 0 000 18c2 0 3-1 3-3 0-1.5-1-2-1-3.5 0-1 1-2 3-2h2a9 9 0 00-7-9.5z"/><circle cx="7" cy="10" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="17" cy="10" r="1"/></>),
  Music:      mk(<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>),
  Speaker:    mk(<><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14"/></>),
  Mic:        mk(<><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></>),
  Mask:       mk(<><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/></>),
  Sliders:    mk(<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="#0a0a0c"/><circle cx="16" cy="12" r="2" fill="#0a0a0c"/><circle cx="10" cy="18" r="2" fill="#0a0a0c"/></>),
  Crop:       mk(<><path d="M6 2v16a2 2 0 002 2h16"/><path d="M2 6h16a2 2 0 012 2v16"/></>),
  Maximize:   mk(<><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"/></>),
  Minimize:   mk(<path d="M4 12h16"/>),
  Square:     mk(<rect x="4" y="4" width="16" height="16"/>),
  Dots:       mk(<><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></>),
  Filter:     mk(<path d="M3 4h18l-7 9v6l-4 2v-8z"/>),
  Refresh:    mk(<><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/><path d="M3 21v-5h5"/></>),
  Loader:     mk(<><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></>),
  Star:       mk(<path d="M12 3l2.7 6.2L21 10l-5 4.3L17.5 21 12 17.6 6.5 21 8 14.3 3 10l6.3-.8z"/>),
  Bolt:       mk(<path d="M13 2L3 14h7l-1 8 10-12h-7z"/>),
  Video:      mk(<><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></>),
  Pencil:     mk(<><path d="M11 4H5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6"/><path d="M17.5 3.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></>),

  // Brand spark — small logo mark
  Spark: ({ size = 22 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8z" fill="#d4ff3a"/>
      <path d="M12 7.5L13.1 10.9L16.5 12L13.1 13.1L12 16.5L10.9 13.1L7.5 12L10.9 10.9z" fill="#0a0a0c"/>
    </svg>
  ),
};
