import { useCallback, useRef, useState } from 'react';
import type { CetStore } from '../../types/cet';
import { readCetStore, writeCetStore } from '../../utils/cetStore';

export function useCetStore() {
  const [store, setStore] = useState(readCetStore);
  const current = useRef(store);
  const update = useCallback((change: (data: CetStore) => CetStore) => {
    const next = change(current.current);
    current.current = next;
    setStore(next);
    writeCetStore(next);
  }, []);
  return { store, update };
}
