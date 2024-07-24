"use server";

import { nanoid } from "nanoid";
import { liveblocks } from "../liveblocks";
import { revalidatePath } from "next/cache";
import { getAccessType, parseStringify } from "../utils";
import { redirect } from "next/navigation";

export const createDocument = async ({
  userId,
  email,
}: CreateDocumentParams) => {
  const roomId = nanoid();

  try {
    const metadata = {
      creatorId: userId,
      email,
      title: "Untitled",
    };

    const usersAccesses: RoomAccesses = {
      [email]: ["room:write"],
    };
    const room = await liveblocks.createRoom(roomId, {
      metadata,
      usersAccesses,
      defaultAccesses: [],
    });

    revalidatePath("/");

    return parseStringify(room);
  } catch (error) {
    console.log(`Error happened while creating a room: ${error}`);
  }
};

/**
 * //* console.log("Error happened while creating a room: " + error);
 * This approach converts error to a string if it isn't already one and appends it directly to the string message. The entire concatenated string is then output as a single argument to console.log().
 * 
 * Combines the message and the error into a single string before passing it to console.log().
 Suitable when you want a single string representation of the error message.

 * 
 * //* console.log("Error happened while creating a room: ",  error);
 * This method does not concatenate strings directly but rather treats each argument independently. The console will display each argument with a space separating them.
 * 
 * Treats each argument separately.
  Useful when you want to preserve the individual types and format the output differently (e.g., with additional spaces or line breaks).
 */

/**
   * //* return parseStringify(room);
   * After creating the room, it seems you're using parseStringify(room) to convert the room object into a string representation by first serializing it to JSON (JSON.stringify) and then parsing it back (JSON.parse). This process effectively creates a deep copy of the room object.
   * 
   * The parseStringify function you've defined performs a serialization and deserialization process:
   * 
   * JSON.stringify(value) converts the JavaScript object value into a JSON string.
    JSON.parse(...) then parses this JSON string back into a JavaScript object.

    This technique is often used when you want to create a deep copy of an object

    When you stringify an object and then parse it back, you effectively create a new object that is a deep clone of the original. This is because JSON.stringify followed by JSON.parse creates a new instance of the object and its nested properties, rather than maintaining any references that might exist in the original object.

    By using parseStringify(room) before returning, you ensure that the object you return (room) is a new instance that is not directly tied to the internal state or references of the room object created by liveblocks.createRoom(). This can be beneficial in scenarios where you want to prevent unintended mutations to the original object.

    Consistency in Data: Serializing and deserializing the object ensures that the structure and type of room are consistent. This can be important when interacting with server APIs or when the consumer of your function expects a specific format (e.g., JSON).

    In summary, the reason you use parseStringify(room) before returning from createDocument is likely to ensure that the room object you return is a standalone copy of the original object created by liveblocks.createRoom(). This practice helps maintain data integrity, prevent unintended mutations, and ensures that the returned object behaves predictably in your application.


   */

export const getDocument = async ({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) => {
  try {
    const room = await liveblocks.getRoom(roomId);

    const hasAccess = Object.keys(room.usersAccesses).includes(userId);

    if (!hasAccess) {
      throw new Error("You do not have access to this document");
    }

    return parseStringify(room);
  } catch (error) {
    console.log(`Error happened while getting a room: ${error}`);
  }
};

export const updateDocument = async (roomId: string, title: string) => {
  try {
    const updatedRoom = await liveblocks.updateRoom(roomId, {
      metadata: {
        title,
      },
    });

    revalidatePath(`/documents/${roomId}`);

    return parseStringify(updatedRoom);
  } catch (error) {
    console.log(`Error happened while updating a room: ${error}`);
  }
};

export const getDocuments = async (email: string) => {
  try {
    const rooms = await liveblocks.getRooms({ userId: email });

    return parseStringify(rooms);
  } catch (error) {
    console.log(`Error happened while getting rooms: ${error}`);
  }
};

export const deleteDocument = async (roomId: string) => {
  try {
    await liveblocks.deleteRoom(roomId);
    revalidatePath("/");
    redirect("/");
  } catch (error) {
    console.log(`Error happened while deleting a room: ${error}`);
  }
};

export const updateDocumentAccess = async ({
  roomId,
  email,
  userType,
  updatedBy,
}: ShareDocumentParams) => {
  try {
    const usersAccesses: RoomAccesses = {
      [email]: getAccessType(userType) as AccessType,
    };

    const room = await liveblocks.updateRoom(roomId, {
      usersAccesses,
    });

    if (room) {
      const notificationId = nanoid();

      await liveblocks.triggerInboxNotification({
        userId: email,
        kind: "$documentAccess",
        subjectId: notificationId,
        activityData: {
          userType,
          title: `You have been granted ${userType} access to the document by ${updatedBy.name}`,
          updatedBy: updatedBy.name,
          avatar: updatedBy.avatar,
          email: updatedBy.email,
        },
        roomId,
      });
    }

    revalidatePath(`/documents/${roomId}`);
    revalidatePath("/");
    return parseStringify(room);
  } catch (error) {
    console.log(`Error happened while updating a room access: ${error}`);
  }
};

export const removeCollaborator = async ({
  roomId,
  email,
}: {
  roomId: string;
  email: string;
}) => {
  try {
    const room = await liveblocks.getRoom(roomId);

    if (room.metadata.email === email) {
      throw new Error("You cannot remove yourself from the document");
    }

    const updatedRoom = await liveblocks.updateRoom(roomId, {
      usersAccesses: {
        [email]: null,
      },
    });

    revalidatePath(`/documents/${roomId}`);
    return parseStringify(updatedRoom);
  } catch (error) {
    console.log(`Error happened while removing a collaborator: ${error}`);
  }
};
