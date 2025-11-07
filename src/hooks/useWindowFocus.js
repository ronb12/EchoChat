import { useEffect, useState } from 'react';

export function useWindowFocus() {
  const [isFocused, setIsFocused] = useState(
    typeof document !== 'undefined' ? document.hasFocus() : true
  );

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isFocused;
}

