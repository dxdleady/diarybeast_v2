import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Lazy import Groq to avoid build-time errors
    const Groq = (await import('groq-sdk')).default;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Transcription service unavailable',
          details:
            'GROQ_API_KEY environment variable is not set. Please configure Groq API key in .env.local',
        },
        { status: 503 }
      );
    }

    const groq = new Groq({ apiKey });

    // Convert File to format Groq SDK accepts
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File-like object with the buffer
    const file = new File([buffer], audioFile.name, {
      type: audioFile.type,
    });

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
      language: 'en',
      response_format: 'json',
    });

    return NextResponse.json({
      text: transcription.text,
      success: true,
    });
  } catch (error) {
    console.error('[transcribe] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        error: 'Failed to transcribe',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
