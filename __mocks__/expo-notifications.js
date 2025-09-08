export const getPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: 'granted' })
);
export const requestPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: 'granted' })
);
export const scheduleNotificationAsync = jest.fn(() =>
  Promise.resolve('mock-notification-id')
);
export const cancelAllScheduledNotificationsAsync = jest.fn(() =>
  Promise.resolve()
);

export default {
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync,
};
