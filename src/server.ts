import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { openAiRouter } from './routes/openai.js';
import { openAiSpeechRouter } from './routes/openaiSpeech.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

app.use('/api/openai', openAiRouter);
app.use('/api/openai', openAiSpeechRouter);


app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
