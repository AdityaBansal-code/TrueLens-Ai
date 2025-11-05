import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  Timestamp,
  onSnapshot 
} from "firebase/firestore";
import { db } from "./firebaseconfig";
import { serverTimestamp } from "firebase/firestore";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "file" | "image" | "voice" | "verified";
  fileName?: string | null;
  meta?: any | null; // structured metadata (e.g. verified_results)
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

function cleanObject(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  }
  
// Convert Firestore Timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// Convert Date to Firestore Timestamp
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Convert Message for Firestore (Date -> Timestamp)
const messageToFirestore = (message: Message) => {
   const cleaned = {
    ...message,
    // Convert Date -> Firestore Timestamp. If timestamp missing, use serverTimestamp()
    timestamp: message.timestamp ? dateToTimestamp(message.timestamp) : serverTimestamp(),
    fileName: message.fileName ?? null, // replace undefined with null
    meta: message.meta ?? null,
  };
  return cleanObject(cleaned);
};

// Convert Message from Firestore (Timestamp -> Date)
const messageFromFirestore = (data: any): Message => ({
  ...data,
  timestamp: timestampToDate(data.timestamp),
  meta: data.meta ?? null,
});

// Create a new chat
export const createChat = async (userId: string, firstMessage?: Message): Promise<string> => {
  const title = firstMessage?.content.slice(0, 10) || "New Chat";
  const now = new Date();
  
  const chatData = {
    userId,
    title: title.length < 10 ? title : title + "...",
    messages: firstMessage ? [messageToFirestore(firstMessage)] : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
    
     // warn about undefined fields in message objects
     (chatData.messages || []).forEach((m: any, i: number) => {
        Object.entries(m).forEach(([key, value]) => {
          if (value === undefined) console.warn(`Message ${i} has undefined ${key}`);
        });
      });
      
  const docRef =   await addDoc(collection(db, "chats"), (chatData))
  return docRef.id;
};

// Update chat messages
export const updateChatMessages = async (
  chatId: string, 
  messages: Message[]
): Promise<void> => {
  const chatRef = doc(db, "chats", chatId);
  const title = messages.find(m => m.sender === "user")?.content.slice(0, 50) || "New Chat";
  
  await updateDoc(chatRef, {
    messages: messages.map(messageToFirestore),
    title: title.length < 50 ? title : title + "...",
    updatedAt: serverTimestamp(),
  });
};

// Get a single chat
export const getChat = async (chatId: string): Promise<Chat | null> => {
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    return null;
  }

  const data = chatSnap.data();
  return {
    id: chatSnap.id,
    userId: data.userId,
    title: data.title,
    messages: Array.isArray(data.messages) ? data.messages.map(messageFromFirestore) : [],
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

// Get all chats for a user
export const getUserChats = async (userId: string): Promise<Chat[]> => {
  const q = query(
    collection(db, "chats"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      title: data.title,
      messages: Array.isArray(data.messages) ? data.messages.map(messageFromFirestore) : [],
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    };
  });
};

// Subscribe to user chats (real-time updates)
export const subscribeToUserChats = (
  userId: string,
  callback: (chats: Chat[]) => void
): (() => void) => {
  const q = query(
    collection(db, "chats"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const chats = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        messages: Array.isArray(data.messages) ? data.messages.map(messageFromFirestore) : [],
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      };
    });
    callback(chats);
  });
};

// Delete a chat
export const deleteChat = async (chatId: string): Promise<void> => {
  await deleteDoc(doc(db, "chats", chatId));
};

// Update chat title
export const updateChatTitle = async (chatId: string, title: string): Promise<void> => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    title,
    updatedAt: dateToTimestamp(new Date()),
  });
};


