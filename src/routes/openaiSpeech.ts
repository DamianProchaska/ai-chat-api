import { Router, Request, Response } from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });
export const openAiSpeechRouter = Router();

openAiSpeechRouter.post('/speech', upload.single('file'), async (req: Request, res: Response) => {
  console.log("Received speech request. File info:", req.file);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Brak klucza API' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Brak przesłanego pliku' });
  }

  try {
    const formData = new FormData();
    const fileStream = fs.createReadStream(req.file.path);
    formData.append('file', fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    fs.unlink(req.file.path, err => {
      if (err) console.error('Błąd przy usuwaniu pliku:', err);
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("OpenAI Whisper API error:", errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    console.log("Whisper API response:", data);
    return res.json({ text: data.text });
  } catch (error) {
    console.error("Wyjątek w speech endpoint:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
});
