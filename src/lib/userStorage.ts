// Utility functions for managing anonymous user IDs in localStorage

export const generateUserId = (): string => {
  return `user_${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`;
};

export const getUserId = (): string => {
  let userId = localStorage.getItem('onlyfocus_user_id');
  
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem('onlyfocus_user_id', userId);
  }
  
  return userId;
};

// Removed getDisplayName and setDisplayName functions.
export const clearUserData = (): void => {
  localStorage.removeItem('onlyfocus_user_id');
  localStorage.removeItem('onlyfocus_display_name');
};