// Utility functions for managing anonymous user IDs in localStorage

export const generateUserId = (): string => {
  return `user_${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`;
};

export const getUserId = (): string => {
  let userId = localStorage.getItem('onlystudies_user_id');
  
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem('onlystudies_user_id', userId);
  }
  
  return userId;
};

export const getDisplayName = (): string | null => {
  return localStorage.getItem('onlystudies_display_name');
};

export const setDisplayName = (name: string): void => {
  localStorage.setItem('onlystudies_display_name', name);
};

export const clearUserData = (): void => {
  localStorage.removeItem('onlystudies_user_id');
  localStorage.removeItem('onlystudies_display_name');
};
