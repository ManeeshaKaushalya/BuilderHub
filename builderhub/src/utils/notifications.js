import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firestore = getFirestore();

export const sendNotification = async (title, message) => {
  try {
    await addDoc(collection(firestore, 'notifications'), {
      title,
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
