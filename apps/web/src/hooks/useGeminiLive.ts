import { useState, useRef, useCallback, useEffect } from 'react';

type GeminiLiveStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type GamePhase = 'topic' | 'style' | 'settings' | 'ready'; // Added phases for game UI

interface UseGeminiLiveProps {
    onMessage?: (text: string, isFinal: boolean) => void;
    onFunctionCall?: (name: string, args: any) => void;
}

export function useGeminiLive({ onMessage, onFunctionCall }: UseGeminiLiveProps = {}) {
    const [status, setStatus] = useState<GeminiLiveStatus>('disconnected');
    const [gamePhase, setGamePhase] = useState<GamePhase>('topic'); // Track what Gemini is asking for
    const [isThinking, setIsThinking] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorNodeRef = useRef<AudioWorkletNode | null>(null);

    // Playback
    const nextPlayTimeRef = useRef<number>(0);

    const connect = useCallback(async (systemInstruction?: string) => {
        try {
            setStatus('connecting');

            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                console.error("VITE_GEMINI_API_KEY is missing from environment variables");
                setStatus('error');
                return;
            }

            const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = async () => {
                setStatus('connected');

                // Send initial setup message
                const setupMessage = {
                    setup: {
                        model: "models/gemini-2.0-flash-exp",
                        generationConfig: {
                            responseModalities: ["audio"],
                            speechConfig: {
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
                            }
                        },
                        systemInstruction: systemInstruction ? {
                            parts: [{ text: systemInstruction }]
                        } : undefined,
                        tools: [{
                            functionDeclarations: [
                                {
                                    name: "setTopic",
                                    description: "Sets the story topic based on user input and advances to the next step.",
                                    parameters: {
                                        type: "OBJECT",
                                        properties: {
                                            topic: { type: "STRING", description: "The learning topic the user wants." }
                                        },
                                        required: ["topic"]
                                    }
                                },
                                {
                                    name: "setStyle",
                                    description: "Sets the visual and narrator style of the story.",
                                    parameters: {
                                        type: "OBJECT",
                                        properties: {
                                            character: { type: "STRING", description: "The main character (e.g. Brave Knight, Curious Astronaut)." },
                                            artStyle: { type: "STRING", description: "Visual style (e.g. Vibrant 3D, Anime / Manga)." }
                                        },
                                        required: ["character", "artStyle"]
                                    }
                                },
                                {
                                    name: "setSettings",
                                    description: "Sets the difficulty and quiz frequency for the story.",
                                    parameters: {
                                        type: "OBJECT",
                                        properties: {
                                            ageRange: { type: "INTEGER", description: "Target age. 0=Pre-K, 1=Early, 2=Mid, 3=Late, 4=Teen", default: 2 },
                                            quizFrequency: { type: "STRING", description: "low, medium, or high", default: "medium" }
                                        },
                                        required: ["ageRange", "quizFrequency"]
                                    }
                                }
                            ]
                        }]
                    }
                };
                ws.send(JSON.stringify(setupMessage));

                // init mic
                await startMicrophone(ws);
            };

            ws.onmessage = async (event) => {
                let data;
                if (event.data instanceof Blob) {
                    const text = await event.data.text();
                    data = JSON.parse(text);
                } else {
                    data = JSON.parse(event.data);
                }

                if (data.serverContent) {
                    const modelTurn = data.serverContent.modelTurn;
                    if (modelTurn) {
                        for (const part of modelTurn.parts) {
                            if (part.text) {
                                onMessage?.(part.text, false);
                            }
                            if (part.inlineData && part.inlineData.data) {
                                // play audio
                                await playAudioChunk(part.inlineData.data);
                            }
                        }
                    }
                    if (data.serverContent.turnComplete) {
                        setIsThinking(false);
                    }
                }

                if (data.toolCall) {
                    for (const call of data.toolCall.functionCalls) {
                        onFunctionCall?.(call.name, call.args);

                        // Automatically update the UI phase based on Gemini's tool calls
                        if (call.name === 'setTopic') setGamePhase('style');
                        if (call.name === 'setStyle') setGamePhase('settings');
                        if (call.name === 'setSettings') setGamePhase('ready');
                    }

                    // Reply to the tool call
                    ws.send(JSON.stringify({
                        toolResponse: {
                            functionResponses: data.toolCall.functionCalls.map((c: any) => ({
                                id: c.id,
                                name: c.name,
                                response: { result: "ok" }
                            }))
                        }
                    }));
                }
            };

            ws.onerror = (e) => {
                console.error('WebSocket Error', e);
                setStatus('error');
            };

            ws.onclose = () => {
                setStatus('disconnected');
                stopMicrophone();
            };

        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    }, [onMessage, onFunctionCall]);

    const playAudioChunk = async (base64Data: string) => {
        if (!audioContextRef.current) return;

        try {
            const ctx = audioContextRef.current;
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            // Gemini Live return 24kHz PCM by default for Aoede
            const pcm16 = new Int16Array(bytes.buffer);
            const audioBuffer = ctx.createBuffer(1, pcm16.length, 24000);
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < pcm16.length; i++) {
                channelData[i] = pcm16[i] / 32768.0;
            }

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            const currentTime = ctx.currentTime;
            const playTime = Math.max(currentTime, nextPlayTimeRef.current);
            source.start(playTime);
            nextPlayTimeRef.current = playTime + audioBuffer.duration;
            setIsThinking(true);
        } catch (err) {
            console.error("Error playing audio chunk", err);
        }
    };

    const startMicrophone = async (ws: WebSocket) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                }
            });
            mediaStreamRef.current = stream;

            const audioCtx = new window.AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;
            nextPlayTimeRef.current = audioCtx.currentTime;

            await audioCtx.audioWorklet.addModule('/audio-processor.js');

            const source = audioCtx.createMediaStreamSource(stream);
            const processor = new AudioWorkletNode(audioCtx, 'audio-processor');

            processor.port.onmessage = (e) => {
                const pcm16Data = e.data; // Int16Array
                const base64Str = btoa(String.fromCharCode(...new Uint8Array(pcm16Data.buffer)));

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        realtimeInput: {
                            mediaChunks: [{
                                mimeType: "audio/pcm;rate=16000",
                                data: base64Str
                            }]
                        }
                    }));
                }
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);
            processorNodeRef.current = processor;

        } catch (e) {
            console.error("Error starting microphone", e);
        }
    };

    const stopMicrophone = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (processorNodeRef.current) {
            processorNodeRef.current.disconnect();
            processorNodeRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
    };

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        stopMicrophone();
        setStatus('disconnected');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => disconnect();
    }, [disconnect]);

    // Send a client text turn for interrupting or initial prompts
    const sendText = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                clientContent: {
                    turns: [{
                        role: "user",
                        parts: [{ text }]
                    }],
                    turnComplete: true
                }
            }));
        }
    }, []);

    return { status, gamePhase, setGamePhase, connect, disconnect, sendText, isThinking };
}
