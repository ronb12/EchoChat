import { useEffect, useState } from 'react';
import { profileService } from '../services/profileService';

const profileCache = new Map();
const pendingProfileFetches = new Map();

function getCachedDisplayName(userId, fallback) {
  if (!userId) {
    return fallback;
  }
  if (!profileCache.has(userId)) {
    return fallback;
  }
  const profile = profileCache.get(userId);
  if (!profile) {
    return fallback;
  }
  return profile.alias || profile.displayName || fallback;
}

async function fetchProfile(userId) {
  if (!userId) {
    return null;
  }
  if (profileCache.has(userId)) {
    return profileCache.get(userId);
  }
  if (pendingProfileFetches.has(userId)) {
    return pendingProfileFetches.get(userId);
  }

  const fetchPromise = profileService.getUserProfile(userId)
    .then((profile) => {
      profileCache.set(userId, profile || null);
      pendingProfileFetches.delete(userId);
      return profile || null;
    })
    .catch((error) => {
      console.warn('useDisplayName: failed to load profile', error);
      profileCache.set(userId, null);
      pendingProfileFetches.delete(userId);
      return null;
    });

  pendingProfileFetches.set(userId, fetchPromise);
  return fetchPromise;
}

export function useDisplayName(userId, fallback = 'User') {
  const [displayName, setDisplayName] = useState(() => getCachedDisplayName(userId, fallback));

  useEffect(() => {
    let cancelled = false;

    const initialName = getCachedDisplayName(userId, fallback);
    setDisplayName(initialName);

    if (!userId) {
      return () => { cancelled = true; };
    }

    fetchProfile(userId).then((profile) => {
      if (cancelled) {
        return;
      }
      if (!profile) {
        setDisplayName(fallback);
        return;
      }
      setDisplayName(profile.alias || profile.displayName || fallback);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, fallback]);

  return displayName;
}

export function clearDisplayNameCache() {
  profileCache.clear();
  pendingProfileFetches.clear();
}

