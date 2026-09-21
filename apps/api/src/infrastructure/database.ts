import mongoose from "mongoose";

mongoose.set("bufferCommands", false);

export async function connectDatabase(uri: string, production: boolean) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    autoIndex: !production,
  });
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
