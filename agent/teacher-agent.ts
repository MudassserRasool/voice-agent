import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
} from '@livekit/agents';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as livekit from '@livekit/agents-plugin-livekit';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';

config({ path: '.env.local', quiet: true });

const AGENT_NAME = process.env.AGENT_NAME || 'teacher';
const OPENAI_LLM_MODEL = process.env.OPENAI_LLM_MODEL || 'gpt-4.1-mini';
const OPENAI_STT_MODEL = process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe';
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
const AGENT_LANGUAGE = process.env.AGENT_LANGUAGE || 'en';

const TEACHER_INSTRUCTIONS = `
You are LearnMate, a patient AI teaching voice agent.

Primary behavior:
- Teach by conversation, not lecture. Ask one focused question at a time.
- Start by asking the learner what topic they want help with and their level.
- Explain concepts in short, spoken-friendly chunks.
- Use examples, analogies, and quick checks for understanding.
- Adapt difficulty based on the learner's answers.
- If the learner is stuck, give a hint before the final answer.
- Keep responses concise for voice: usually 2-5 sentences.
- Do not claim to browse, see files, or know private course material unless the user provides it.
- If a question needs current facts, say that the information may need verification.

Style:
- Warm, clear, and direct.
- Avoid long lists unless the learner asks for a plan.
- End most turns with a useful next question.
`.trim();

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    await ctx.waitForParticipant();

    const agent = new voice.Agent({
      instructions: TEACHER_INSTRUCTIONS,
    });

    const session = new voice.AgentSession({
      stt: new openai.STT({
        model: OPENAI_STT_MODEL,
        language: AGENT_LANGUAGE,
      }),
      llm: new openai.responses.LLM({
        model: OPENAI_LLM_MODEL,
        temperature: 0.4,
        useWebSocket: false,
      }),
      tts: new elevenlabs.TTS({
        voiceId: ELEVENLABS_VOICE_ID,
        model: ELEVENLABS_MODEL,
        language: AGENT_LANGUAGE,
        voiceSettings: {
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
      vad: ctx.proc.userData.vad as silero.VAD,
      turnHandling: {
        turnDetection: new livekit.turnDetector.MultilingualModel(),
      },
      useTtsAlignedTranscript: true,
      userAwayTimeout: 30,
    });

    await session.start({
      agent,
      room: ctx.room,
    });

    await session.generateReply({
      instructions:
        'Greet the learner as LearnMate. Ask what topic they want to study today and what level they are at.',
    });
  },
});

cli.runApp(
  new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: AGENT_NAME,
  })
);
