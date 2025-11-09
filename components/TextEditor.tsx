'use client';

import { useState, useRef, useEffect } from 'react';

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  actionButton?: React.ReactNode;
  wordCount?: number;
}

export function TextEditor({
  value,
  onChange,
  placeholder,
  actionButton,
  wordCount,
}: TextEditorProps) {
  const [fontFamily, setFontFamily] = useState('sans');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load font preference
  useEffect(() => {
    const saved = localStorage.getItem('diary-font');
    if (saved) setFontFamily(saved);
  }, []);

  // Save font preference
  const handleFontChange = (font: string) => {
    setFontFamily(font);
    localStorage.setItem('diary-font', font);
  };

  // Insert markdown formatting
  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText =
      value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording');
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  };

  // Transcribe audio using API
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Append transcribed text to current value
        const newText = value + (value ? '\n\n' : '') + data.text;
        onChange(newText);
      } else {
        alert('Transcription failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Transcription error');
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const fonts = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };

  const fontNames = {
    sans: 'Sans',
    serif: 'Serif',
    mono: 'Mono',
  };

  return (
    <div className="bg-bg-card/80 backdrop-blur-md border border-primary/10 rounded-xl p-6 shadow-lg hover:border-primary/20 transition-all duration-300">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-primary/10">
        {/* Formatting buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => insertFormatting('**', '**')}
            className="px-3 py-1.5 bg-bg-lcd/50 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded text-sm font-bold transition-all text-primary font-mono"
            title="Bold (Ctrl+B)"
          >
            [B]
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*')}
            className="px-3 py-1.5 bg-bg-lcd/50 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded text-sm italic transition-all text-primary font-mono"
            title="Italic (Ctrl+I)"
          >
            [I]
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('- ', '')}
            className="px-3 py-1.5 bg-bg-lcd/50 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded text-sm transition-all text-primary font-mono"
            title="List"
          >
            [≡]
          </button>

          {/* Divider */}
          <div className="w-px bg-primary/20 mx-1"></div>

          {/* Audio recording button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            className={`px-4 py-2 rounded-lg text-sm transition-all font-mono relative ${
              isRecording
                ? 'bg-error/30 hover:bg-error/40 border-2 border-error text-error animate-pulse shadow-[0_0_15px_rgba(255,23,68,0.5)]'
                : isTranscribing
                  ? 'bg-bg-lcd/50 border border-inactive text-disabled cursor-not-allowed'
                  : 'bg-gradient-to-r from-accent/20 to-primary/20 hover:from-accent/30 hover:to-primary/30 border-2 border-primary/60 hover:border-primary text-primary shadow-[0_0_10px_rgba(0,229,255,0.4)] hover:shadow-[0_0_20px_rgba(0,229,255,0.6)]'
            }`}
            title={
              isRecording
                ? 'Stop recording (click to stop)'
                : isTranscribing
                  ? 'Transcribing...'
                  : 'Voice input - Record audio in English and convert to text'
            }
          >
            <span className="flex items-center gap-2">
              {isTranscribing ? '⏳' : isRecording ? '⏹️' : '🎤'}
              {!isRecording && !isTranscribing && <span className="text-xs">Voice</span>}
            </span>
            {!isRecording && !isTranscribing && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse"></span>
            )}
          </button>

          {/* Recording indicator */}
          {isRecording && (
            <span className="text-xs text-error flex items-center gap-1 animate-pulse font-mono font-bold">
              🔴 Recording...
            </span>
          )}
          {isTranscribing && (
            <span className="text-xs text-primary flex items-center gap-1 font-mono">
              ⏳ Transcribing...
            </span>
          )}
        </div>

        {/* Font selector */}
        <div className="flex gap-2 items-center">
          <span className="text-sm text-primary/60 font-mono">Font:</span>
          {Object.entries(fontNames).map(([key, name]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleFontChange(key)}
              className={`px-3 py-1.5 rounded text-sm transition-all font-mono ${
                fontFamily === key
                  ? 'bg-primary/20 text-primary border border-primary/40 shadow-glow-cyan'
                  : 'bg-bg-lcd/50 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 text-primary/70'
              }`}
            >
              [{name}]
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-64 p-4 lcd-screen rounded-lg text-primary placeholder-primary/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all ${fonts[fontFamily as keyof typeof fonts]}`}
      />

      {/* Hint and Action Row */}
      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-2 p-2 bg-primary/5 border border-primary/20 rounded text-xs font-mono">
          <span className="text-primary/60">💡</span>
          <div className="flex-1 space-y-1">
            <div className="text-primary/70">
              <strong>Formatting:</strong> Use **bold**, *italic*, or - lists
            </div>
            <div className="text-accent/80">
              <strong>Voice Input:</strong> Click the 🎤 button to record audio in English and
              convert to text automatically
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          {wordCount !== undefined && (
            <div className="text-xs text-primary/50 font-mono">[{wordCount} words]</div>
          )}
          {actionButton && <div>{actionButton}</div>}
        </div>
      </div>
    </div>
  );
}
