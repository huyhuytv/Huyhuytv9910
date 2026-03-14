import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.list();
    for await (const model of response) {
        console.log(model.name);
    }
  } catch (e) {
    console.error(e);
  }
}
test();
