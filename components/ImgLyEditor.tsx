import { useEffect, useRef, useState } from 'react';
import CreativeEditor from '@cesdk/cesdk-js';

function getEnv(key: string): string | undefined {
  // Vite (prod) → import.meta.env; AI Studio → window.ENV (if you added it)
  const v = (import.meta as any)?.env?.[key] ?? (window as any)?.ENV?.[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

// Decide where to load