import { useState, useRef, useCallback, useEffect } from 'react';

type GeminiLiveStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type GamePhase = 'topic' | 'style' | 'settings' | 'ready'; // Added phases for game UI

interface UseGeminiLiveProps {
    onMessage?: (text: string, isFinal: boolean) => void;
    onFunctionCall?: (name: string, args: any) => void;
    // New callback to receive image updates from the proxy backend
    onSceneUpdate?: (imageUrl: string) => void;
}

export function useGeminiLive({ onMessage, onFunctionCall, onSceneUpdate }: UseGeminiLiveProps = {}) {
    // ... [Status hooks mostly unchanged]
    const [status, setStatus] = useState<GeminiLiveStatus>('disconnected');
    const [gamePhase, setGamePhase] = useState<GamePhase>('topic');
    const [isThinking, setIsThinking] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorNodeRef = useRef<AudioWorkletNode | null>(null);

    const nextPlayTimeRef = useRef<number>(0);

    const connect = useCallback(async (systemInstruction?: string) => {
        try {
            setStatus('connecting');

            // Hardcode a session ID for demo purposes, or pass it in later
            const sessionId = Math.random().toString(36).substring(7);
            const url = `ws://localhost:8000/api/live/${sessionId}`;

            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = async () => {
                setStatus('connected');
                // The backend handles sending the configuration setup message.
                // It automatically builds the Session config with instructions & tools.
                // We just start pushing Audio!
                await startMicrophone(ws);

                // If there's an initial instruction (like for the Create page), send it as a text turn
                if (systemInstruction) {
                    ws.send(JSON.stringify({
                        clientContent: {
                            turns: [{
                                role: "user",
                                parts: [{ text: systemInstruction }]
                            }],
                            turnComplete: true
                        }
                    }));
                }
            };

            ws.onmessage = async (event) => {
                let data;
                if (event.data instanceof Blob) {
                    const text = await event.data.text();
                    data = JSON.parse(text);
                } else {
                    data = JSON.parse(event.data);
                }

                // 1. Handle Custom Proxy Events (ex: Nano Banana images)
                if (data.backendEvent) {
                    if (data.backendEvent.type === 'scene_update' && data.backendEvent.imageUrl) {
                        onSceneUpdate?.(data.backendEvent.imageUrl);
                    }
                    if (data.backendEvent.type === 'image_generation_started') {
                        setIsThinking(true); // show the UI generating state
                    }
                    return;
                }

                // 2. Handle standard Gemini format (relayed by proxy)
                if (data.serverContent) {
                    const modelTurn = data.serverContent.modelTurn;
                    if (modelTurn) {
                        for (const part of modelTurn.parts) {
                            if (part.text) {
                                onMessage?.(part.text, false);
                            }
                            if (part.inlineData && part.inlineData.data) {
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

                        if (call.name === 'setTopic') setGamePhase('style');
                        if (call.name === 'setStyle') setGamePhase('settings');
                        if (call.name === 'setSettings') setGamePhase('ready');
                    }

                    // For frontend tools, we still reply via the proxy
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
    }, [onMessage, onFunctionCall, onSceneUpdate]);

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
