import crypto from 'crypto';

/**
 * Generates a clean, readable meeting room ID in the format: meet-xxx-xxx
 */
export const generateRoomId = (): string => {
  const p1 = crypto.randomBytes(2).toString('hex'); // 4 characters
  const p2 = crypto.randomBytes(2).toString('hex'); // 4 characters
  return `meet-${p1}-${p2}`;
};
