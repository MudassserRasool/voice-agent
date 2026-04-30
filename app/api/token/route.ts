import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { z } from 'zod';
import { RoomConfiguration } from '@livekit/protocol';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

const TokenRequestSchema = z.object({
  room_config: z.record(z.string(), z.unknown()).optional(),
  participant_name: z.string().trim().min(1).max(80).optional(),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

// don't cache the results
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const originError = validateOrigin(req);
    if (originError) {
      return new NextResponse(originError, { status: 403 });
    }

    const rateLimitError = checkRateLimit(req);
    if (rateLimitError) {
      return new NextResponse(rateLimitError, { status: 429 });
    }

    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    const json = await req.json().catch(() => ({}));
    const body = TokenRequestSchema.parse(json);
    const roomConfig = body.room_config
      ? RoomConfiguration.fromJson(
          body.room_config as Parameters<typeof RoomConfiguration.fromJson>[0],
          {
            ignoreUnknownFields: true,
          }
        )
      : new RoomConfiguration();

    // Generate participant token
    const participantName = body.participant_name ?? 'Learner';
    const participantIdentity = `learner_${crypto.randomUUID()}`;
    const roomName = `lesson_${crypto.randomUUID()}`;

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      roomConfig
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantName,
      participantToken,
    };
    const headers = new Headers({
      'Cache-Control': 'no-store',
    });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse('Invalid token request', { status: 400 });
    }
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function validateOrigin(req: Request): string | undefined {
  if (process.env.NODE_ENV !== 'production') {
    return undefined;
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  const forwardedHost = req.headers.get('x-forwarded-host');
  const expectedHost = forwardedHost ?? host;

  if (!origin || !expectedHost) {
    return 'Missing origin';
  }

  try {
    if (new URL(origin).host !== expectedHost) {
      return 'Invalid origin';
    }
  } catch {
    return 'Invalid origin';
  }

  return undefined;
}

function checkRateLimit(req: Request): string | undefined {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwardedFor || req.headers.get('x-real-ip') || 'local';
  const now = Date.now();
  const bucket = rateLimit.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return undefined;
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    return 'Too many token requests';
  }

  return undefined;
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  roomConfig: RoomConfiguration | undefined
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (roomConfig) {
    at.roomConfig = roomConfig;
  }

  return at.toJwt();
}
